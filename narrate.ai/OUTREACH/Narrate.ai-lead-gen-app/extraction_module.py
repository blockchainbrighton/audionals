import logging
import re
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from classifier_module import ClassifierModule
from utils import append_execution_log, compact_text, humanized_delay, safe_request

logger = logging.getLogger(__name__)

class ExtractionModule:
    def __init__(self):
        self.session = requests.Session()
        self.classifier = ClassifierModule()
        self.email_regex = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
        self.name_patterns = [
            re.compile(r"By\s+([A-Z][a-z]+\s+[A-Z][a-z]+)"),
            re.compile(r"Author:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)"),
            re.compile(r"Written by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)")
        ]
        self.publisher_patterns = [
            re.compile(r'([A-Z][A-Za-z0-9&\'\-\s]{2,60}\b(?:Press|Books|Publishing|Imprint|Agency|Media|House))'),
            re.compile(r'Publisher:\s*([A-Z][A-Za-z0-9&\'\-\s]{2,60})'),
            re.compile(r'Imprint:\s*([A-Z][A-Za-z0-9&\'\-\s]{2,60})')
        ]
        self.generic_email_prefixes = {
            "admin", "agency", "books", "business", "contact", "editor", "editors", "hello",
            "help", "hi", "info", "inquiries", "inquiry", "mail", "marketing", "office",
            "press", "rights", "sales", "submissions", "submit", "support", "team"
        }
        self.author_intent_keywords = {
            "author", "book", "books", "fiction", "imprint", "indie author", "manuscript",
            "novel", "novelist", "poetry", "publisher", "publishing", "royalty", "story",
            "submissions", "writer", "writing"
        }
        self.business_keywords = {
            "agency", "books", "business", "catalog", "contact us", "imprint", "media kit",
            "press", "publisher", "publishing", "rights", "submissions", "team"
        }
        self.js_wall_phrases = {
            "enable javascript", "javascript is disabled", "javascript required",
            "please turn javascript on", "requires javascript", "you need to enable javascript"
        }
        self.terms_flag_phrases = {
            "automated access", "bot traffic", "robots.txt", "scraping", "terms of service"
        }
        self.follow_up_link_signals = {
            "about", "author", "bio", "contact", "email", "homepage",
            "official site", "profile", "website", "writer"
        }
        self.follow_up_external_signals = {
            "homepage", "official site", "website"
        }
        self.noisy_external_hosts = {
            "facebook.com", "instagram.com", "linkedin.com", "tiktok.com", "twitter.com",
            "x.com", "youtube.com"
        }

    def _dedupe_preserve_order(self, items: list) -> list:
        return list(dict.fromkeys(items))

    def _normalize_value(self, value: str):
        if not value:
            return None
        cleaned = value.strip()
        if not cleaned or cleaned.lower() == "unknown":
            return None
        return cleaned

    def _looks_personal_email(self, email: str) -> bool:
        local_part = email.split("@", 1)[0].lower()
        if local_part in self.generic_email_prefixes:
            return False
        if any(local_part.startswith(f"{prefix}.") or local_part.startswith(f"{prefix}_") for prefix in self.generic_email_prefixes):
            return False
        return True

    def _merge_unique_lists(self, left: list, right: list) -> list:
        return self._dedupe_preserve_order((left or []) + (right or []))

    def _extract_emails(self, soup, response_text: str, text_content: str) -> list:
        emails = list(self.email_regex.findall(text_content))

        for anchor in soup.find_all("a", href=True):
            href = (anchor.get("href") or "").strip()
            if not href.lower().startswith("mailto:"):
                continue
            email_candidate = unquote(href.split(":", 1)[1].split("?", 1)[0]).strip()
            email_match = self.email_regex.search(email_candidate)
            if email_match:
                emails.append(email_match.group(0))

        if not emails and "mailto:" in response_text.lower():
            for mailto_match in re.findall(r"mailto:([^\"'?>\s]+)", response_text, flags=re.IGNORECASE):
                email_candidate = unquote(mailto_match.split("?", 1)[0]).strip()
                email_match = self.email_regex.search(email_candidate)
                if email_match:
                    emails.append(email_match.group(0))

        return self._dedupe_preserve_order(emails)

    def _select_primary_email(self, emails: list):
        if not emails:
            return None

        personal_emails = [email for email in emails if self._looks_personal_email(email)]
        if personal_emails:
            return personal_emails[0]
        return emails[0]

    def _extract_author_name(self, soup, text_content: str):
        meta_author = soup.find('meta', attrs={'name': 'author'})
        if meta_author:
            author_name = self._normalize_value(meta_author.get('content'))
            if author_name:
                return author_name, 'meta[name="author"]'

        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        if "|" in title:
            candidate = self._normalize_value(title.split("|")[0])
            if candidate:
                return candidate, "title_before_pipe"
        if "-" in title:
            candidate = self._normalize_value(title.split("-")[0])
            if candidate:
                return candidate, "title_before_dash"

        for pattern in self.name_patterns:
            match = pattern.search(text_content)
            if match:
                candidate = self._normalize_value(match.group(1))
                if candidate:
                    return candidate, f"pattern:{pattern.pattern}"

        return None, "unknown"

    def _extract_book_title(self, soup):
        meta_title = soup.find('meta', property='og:title')
        if meta_title:
            book_title = self._normalize_value(meta_title.get('content'))
            if book_title:
                return book_title, 'meta[property="og:title"]'

        if soup.h1:
            book_title = self._normalize_value(soup.h1.get_text())
            if book_title:
                return book_title, "h1"

        return None, "unknown"

    def _extract_publisher_name(self, soup, text_content: str):
        site_name = soup.find('meta', property='og:site_name')
        if site_name:
            publisher_name = self._normalize_value(site_name.get('content'))
            if publisher_name and any(keyword in publisher_name.lower() for keyword in self.business_keywords):
                return publisher_name, 'meta[property="og:site_name"]'

        app_name = soup.find('meta', attrs={'name': 'application-name'})
        if app_name:
            publisher_name = self._normalize_value(app_name.get('content'))
            if publisher_name and any(keyword in publisher_name.lower() for keyword in self.business_keywords):
                return publisher_name, 'meta[name="application-name"]'

        for pattern in self.publisher_patterns:
            match = pattern.search(text_content)
            if match:
                publisher_name = self._normalize_value(match.group(1))
                if publisher_name:
                    return publisher_name, f"pattern:{pattern.pattern}"

        return None, "unknown"

    def _matches_author_book_intent(self, text_content: str, page_title: str) -> bool:
        combined_text = f"{page_title} {compact_text(text_content, max_chars=500)}".lower()
        return any(keyword in combined_text for keyword in self.author_intent_keywords)

    def _looks_like_business_page(self, text_content: str, publisher_name, emails: list) -> bool:
        text_lower = compact_text(text_content, max_chars=800).lower()
        if publisher_name:
            return True
        if any(not self._looks_personal_email(email) for email in emails):
            return True
        return any(keyword in text_lower for keyword in self.business_keywords)

    def _requires_js_rendering(self, response_text: str, text_content: str) -> bool:
        response_lower = response_text.lower()
        if any(phrase in response_lower for phrase in self.js_wall_phrases):
            return True
        if len(compact_text(text_content, max_chars=500)) < 120 and "__next_data__" in response_lower:
            return True
        return False

    def _has_robots_or_terms_flag(self, response_text: str) -> bool:
        response_lower = response_text.lower()
        return any(phrase in response_lower for phrase in self.terms_flag_phrases)

    def _is_content_thin(self, text_content: str) -> bool:
        return len(compact_text(text_content, max_chars=500)) < 180

    def _score_email_confidence(self, response_text: str, emails: list) -> float:
        if not emails:
            return 0.0
        if "mailto:" in response_text.lower():
            return 1.0
        if any(self._looks_personal_email(email) for email in emails):
            return 0.75
        return 0.6

    def _score_author_confidence(self, author_source: str) -> float:
        if author_source == 'meta[name="author"]':
            return 1.0
        if author_source.startswith("pattern:"):
            return 0.7
        if author_source in {"title_before_pipe", "title_before_dash"}:
            return 0.4
        return 0.0

    def _score_title_confidence(self, title_source: str) -> float:
        if title_source == 'meta[property="og:title"]':
            return 1.0
        if title_source == "h1":
            return 0.7
        return 0.0

    def _recompute_extraction_confidence(self, analysis: dict) -> float:
        return round(
            (
                (0.4 * analysis["email_confidence"])
                + (0.3 * analysis["author_confidence"])
                + (0.3 * analysis["title_confidence"])
            ) * 100,
            2
        )

    def _build_page_signals(self, response_text: str, soup, text_content: str, source_type=None) -> dict:
        page_title = soup.title.string.strip() if soup.title and soup.title.string else ""
        emails = self._extract_emails(soup, response_text, text_content)
        personal_emails = [email for email in emails if self._looks_personal_email(email)]
        generic_emails = [email for email in emails if not self._looks_personal_email(email)]
        author_name, author_source = self._extract_author_name(soup, text_content)
        book_title, book_title_source = self._extract_book_title(soup)
        publisher_name, publisher_source = self._extract_publisher_name(soup, text_content)
        classifier_result = self.classifier.classify_page(
            response_text,
            soup,
            text_content,
            page_title,
            emails=emails
        )
        intent_match = classifier_result["is_relevant"] or self._matches_author_book_intent(text_content, page_title)
        business_page = classifier_result["business_signal"] or self._looks_like_business_page(text_content, publisher_name, emails)
        captcha_suspected = "captcha" in response_text.lower() or "unusual traffic" in response_text.lower()
        js_required = self._requires_js_rendering(response_text, text_content)
        robots_terms_flag = self._has_robots_or_terms_flag(response_text)
        content_thin = self._is_content_thin(text_content)
        email_confidence = self._score_email_confidence(response_text, emails)
        author_confidence = self._score_author_confidence(author_source)
        title_confidence = self._score_title_confidence(book_title_source)

        keyword_hits = list(classifier_result["keyword_hits"])
        discovery_signal = bool(author_name and book_title)
        relevance_score = classifier_result["relevance_score"]
        is_relevant = classifier_result["is_relevant"]

        if discovery_signal:
            keyword_hits.append("author_title_combo")
            if source_type == "author_platform":
                relevance_score = max(relevance_score, 45)
                is_relevant = True
            elif intent_match:
                relevance_score = max(relevance_score, 40)
                is_relevant = True

        keyword_hits = self._dedupe_preserve_order(keyword_hits)

        return {
            "page_title": page_title,
            "text_preview": compact_text(text_content),
            "emails": emails,
            "email_address": self._select_primary_email(emails),
            "has_email": bool(emails),
            "personal_email_count": len(personal_emails),
            "generic_email_count": len(generic_emails),
            "author_name": author_name,
            "has_author_name": bool(author_name),
            "author_source": author_source,
            "publisher_name": publisher_name,
            "has_publisher_name": bool(publisher_name),
            "publisher_source": publisher_source,
            "book_title": book_title,
            "has_book_title": bool(book_title),
            "book_title_source": book_title_source,
            "keyword_hits": keyword_hits,
            "schema_hits": classifier_result["schema_hits"],
            "relevance_score": relevance_score,
            "is_relevant": is_relevant,
            "intent_match": intent_match,
            "business_page": business_page,
            "captcha_suspected": captcha_suspected,
            "js_required": js_required,
            "robots_terms_flag": robots_terms_flag,
            "content_thin": content_thin,
            "email_confidence": email_confidence,
            "author_confidence": author_confidence,
            "title_confidence": title_confidence,
            "extraction_confidence": round(
                ((0.4 * email_confidence) + (0.3 * author_confidence) + (0.3 * title_confidence)) * 100,
                2
            )
        }

    def _should_expand_contact_search(self, analysis: dict, source_type=None) -> bool:
        if analysis["has_email"] or analysis["captcha_suspected"] or analysis["js_required"]:
            return False
        if analysis["has_author_name"] and analysis["has_book_title"]:
            return True
        if source_type == "author_platform" and (analysis["has_author_name"] or analysis["has_book_title"]):
            return True
        return analysis["is_relevant"] or analysis["intent_match"] or analysis["business_page"]

    def _score_follow_up_link(self, base_url: str, href: str, anchor_text: str, source_type=None):
        href = (href or "").strip()
        if not href or href.startswith("#"):
            return None

        lowered_href = href.lower()
        if lowered_href.startswith(("javascript:", "mailto:", "tel:", "data:")):
            return None

        absolute_url = urljoin(base_url, href)
        parsed = urlparse(absolute_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return None

        descriptor = f"{anchor_text} {href}".lower()
        matched_signals = [signal for signal in self.follow_up_link_signals if signal in descriptor]
        if not matched_signals:
            return None

        base_host = urlparse(base_url).netloc.lower()
        target_host = parsed.netloc.lower()
        score = 0

        if "contact" in descriptor or "email" in descriptor:
            score += 80
        if any(signal in descriptor for signal in {"about", "bio", "profile"}):
            score += 45
        if any(signal in descriptor for signal in self.follow_up_external_signals):
            score += 35
        if "author" in descriptor or "writer" in descriptor:
            score += 20
        if target_host == base_host:
            score += 15
        elif source_type == "author_platform":
            score += 10
        else:
            score -= 20

        if any(host in target_host for host in self.noisy_external_hosts):
            score -= 30

        if score <= 0:
            return None

        return score, absolute_url

    def _collect_follow_up_links(self, base_url: str, soup, source_type=None, limit: int = 3) -> list:
        ranked_candidates = []

        for anchor in soup.find_all("a", href=True):
            anchor_text = compact_text(anchor.get_text(" ", strip=True), max_chars=120)
            scored = self._score_follow_up_link(base_url, anchor.get("href"), anchor_text, source_type=source_type)
            if scored:
                score, absolute_url = scored
                ranked_candidates.append((score, absolute_url))

        ranked_candidates.sort(key=lambda item: item[0], reverse=True)

        deduped_urls = []
        seen_urls = set()
        for _, candidate_url in ranked_candidates:
            if candidate_url in seen_urls:
                continue
            seen_urls.add(candidate_url)
            deduped_urls.append(candidate_url)
            if len(deduped_urls) >= limit:
                break

        return deduped_urls

    def _merge_follow_up_signals(self, analysis: dict, follow_up_signals: dict, follow_up_url: str):
        merged_emails = self._merge_unique_lists(analysis["emails"], follow_up_signals["emails"])
        analysis["emails"] = merged_emails
        analysis["has_email"] = bool(merged_emails)
        analysis["email_address"] = self._select_primary_email(merged_emails)
        analysis["personal_email_count"] = sum(1 for email in merged_emails if self._looks_personal_email(email))
        analysis["generic_email_count"] = len(merged_emails) - analysis["personal_email_count"]

        if not analysis["author_name"] and follow_up_signals["author_name"]:
            analysis["author_name"] = follow_up_signals["author_name"]
            analysis["has_author_name"] = True
            analysis["author_source"] = follow_up_signals["author_source"]
        if not analysis["book_title"] and follow_up_signals["book_title"]:
            analysis["book_title"] = follow_up_signals["book_title"]
            analysis["has_book_title"] = True
            analysis["book_title_source"] = follow_up_signals["book_title_source"]
        if not analysis["publisher_name"] and follow_up_signals["publisher_name"]:
            analysis["publisher_name"] = follow_up_signals["publisher_name"]
            analysis["has_publisher_name"] = True
            analysis["publisher_source"] = follow_up_signals["publisher_source"]

        analysis["keyword_hits"] = self._merge_unique_lists(analysis["keyword_hits"], follow_up_signals["keyword_hits"])
        analysis["schema_hits"] = self._merge_unique_lists(analysis["schema_hits"], follow_up_signals["schema_hits"])
        analysis["relevance_score"] = max(analysis["relevance_score"], follow_up_signals["relevance_score"])
        analysis["is_relevant"] = analysis["is_relevant"] or follow_up_signals["is_relevant"]
        analysis["intent_match"] = analysis["intent_match"] or follow_up_signals["intent_match"]
        analysis["business_page"] = analysis["business_page"] or follow_up_signals["business_page"]
        analysis["captcha_suspected"] = analysis["captcha_suspected"] or follow_up_signals["captcha_suspected"]
        analysis["robots_terms_flag"] = analysis["robots_terms_flag"] or follow_up_signals["robots_terms_flag"]
        analysis["content_thin"] = analysis["content_thin"] and follow_up_signals["content_thin"]

        analysis["email_confidence"] = max(analysis["email_confidence"], follow_up_signals["email_confidence"])
        analysis["author_confidence"] = max(analysis["author_confidence"], follow_up_signals["author_confidence"])
        analysis["title_confidence"] = max(analysis["title_confidence"], follow_up_signals["title_confidence"])
        analysis["extraction_confidence"] = self._recompute_extraction_confidence(analysis)

        if follow_up_signals["has_email"]:
            analysis["email_source"] = "follow_up"
            analysis["contact_page_url"] = follow_up_url
            analysis["follow_up_email_found"] = True

    def analyze_url(self, url: str, request_context=None) -> dict:
        """Fetches a page and returns detailed diagnostics for platform-level scoring."""
        logger.info(f"Analyzing page: {url}")
        request_context = request_context or {"stage": "analysis"}
        source_type = request_context.get("source_type")
        response, request_meta = safe_request(
            url,
            self.session,
            request_context=request_context,
            return_meta=True
        )

        analysis = {
            "url": url,
            "final_url": request_meta.get("final_url", url),
            "fetch_succeeded": bool(response),
            "status_code": request_meta.get("status_code"),
            "fetch_time_ms": request_meta.get("elapsed_ms"),
            "redirected": request_meta.get("redirected", False),
            "request_error": request_meta.get("error"),
            "page_title": "",
            "text_preview": "",
            "emails": [],
            "email_address": None,
            "email_source": "none",
            "has_email": False,
            "personal_email_count": 0,
            "generic_email_count": 0,
            "author_name": None,
            "has_author_name": False,
            "author_source": "unknown",
            "publisher_name": None,
            "has_publisher_name": False,
            "publisher_source": "unknown",
            "book_title": None,
            "has_book_title": False,
            "book_title_source": "unknown",
            "keyword_hits": [],
            "schema_hits": [],
            "relevance_score": 0,
            "is_relevant": False,
            "intent_match": False,
            "business_page": False,
            "captcha_suspected": False,
            "js_required": False,
            "robots_terms_flag": False,
            "content_thin": True,
            "contact_page_url": None,
            "follow_up_urls_considered": [],
            "follow_up_urls_followed": [],
            "follow_up_email_found": False,
            "email_confidence": 0.0,
            "author_confidence": 0.0,
            "title_confidence": 0.0,
            "extraction_confidence": 0.0
        }

        if not response:
            append_execution_log(
                "page_analyzed",
                url=url,
                fetch_succeeded=False,
                status_code=request_meta.get("status_code"),
                request_error=request_meta.get("error")
            )
            return analysis

        soup = BeautifulSoup(response.text, 'html.parser')
        text_content = soup.get_text(separator=" ", strip=True)
        analysis.update({
            "final_url": response.url,
            **self._build_page_signals(response.text, soup, text_content, source_type=source_type)
        })
        if analysis["has_email"]:
            analysis["email_source"] = "page"

        if self._should_expand_contact_search(analysis, source_type=source_type):
            follow_up_urls = self._collect_follow_up_links(response.url, soup, source_type=source_type)
            analysis["follow_up_urls_considered"] = follow_up_urls

            if follow_up_urls:
                append_execution_log(
                    "contact_path_probe_started",
                    url=url,
                    final_url=response.url,
                    source_type=source_type,
                    candidate_count=len(follow_up_urls),
                    candidates=follow_up_urls
                )

            for follow_up_url in follow_up_urls:
                analysis["follow_up_urls_followed"].append(follow_up_url)
                follow_up_response, _ = safe_request(
                    follow_up_url,
                    self.session,
                    request_context={
                        **request_context,
                        "stage": "contact_follow_up",
                        "parent_url": response.url,
                    },
                    return_meta=True,
                    backoff_on_block=False
                )
                if not follow_up_response:
                    continue

                follow_up_soup = BeautifulSoup(follow_up_response.text, 'html.parser')
                follow_up_text = follow_up_soup.get_text(separator=" ", strip=True)
                follow_up_signals = self._build_page_signals(
                    follow_up_response.text,
                    follow_up_soup,
                    follow_up_text,
                    source_type=source_type
                )
                self._merge_follow_up_signals(analysis, follow_up_signals, follow_up_response.url)

                if analysis["has_email"]:
                    break

            if follow_up_urls:
                append_execution_log(
                    "contact_path_probe_completed",
                    url=url,
                    final_url=response.url,
                    followed_count=len(analysis["follow_up_urls_followed"]),
                    email_found=analysis["has_email"],
                    email_source=analysis["email_source"],
                    contact_page_url=analysis["contact_page_url"]
                )

        append_execution_log(
            "page_analyzed",
            url=url,
            final_url=response.url,
            fetch_succeeded=True,
            has_email=analysis["has_email"],
            email_source=analysis["email_source"],
            has_author_name=analysis["has_author_name"],
            has_publisher_name=analysis["has_publisher_name"],
            has_book_title=analysis["has_book_title"],
            relevance_score=analysis["relevance_score"],
            is_relevant=analysis["is_relevant"],
            intent_match=analysis["intent_match"],
            business_page=analysis["business_page"],
            js_required=analysis["js_required"],
            robots_terms_flag=analysis["robots_terms_flag"],
            content_thin=analysis["content_thin"],
            contact_page_url=analysis["contact_page_url"],
            follow_up_count=len(analysis["follow_up_urls_followed"]),
            extraction_confidence=analysis["extraction_confidence"]
        )
        return analysis

    def extract_from_url(self, url: str, request_context=None) -> dict:
        """Visits a URL and extracts lead data."""
        append_execution_log("extraction_started", url=url)
        merged_context = {"stage": "extraction"}
        if request_context:
            merged_context.update(request_context)
        analysis = self.analyze_url(url, request_context=merged_context)
        if not analysis["fetch_succeeded"]:
            append_execution_log(
                "extraction_failed",
                url=url,
                reason="request_failed",
                status_code=analysis["status_code"],
                request_error=analysis["request_error"]
            )
            return None
        if not analysis["has_email"]:
            append_execution_log(
                "extraction_failed",
                url=url,
                final_url=analysis["final_url"],
                reason="no_email_found",
                page_title=analysis["page_title"],
                text_preview=analysis["text_preview"],
                follow_up_count=len(analysis["follow_up_urls_followed"])
            )
            return None
        if not analysis["is_relevant"]:
            append_execution_log(
                "extraction_failed",
                url=url,
                final_url=analysis["final_url"],
                reason="low_relevance",
                relevance_score=analysis["relevance_score"],
                keyword_hits=analysis["keyword_hits"]
            )
            return None

        append_execution_log(
            "extraction_succeeded",
            url=url,
            final_url=analysis["final_url"],
            page_title=analysis["page_title"],
            email_address=analysis["email_address"],
            email_source=analysis["email_source"],
            email_candidate_count=len(analysis["emails"]),
            email_candidates=analysis["emails"][:5],
            author_name=analysis["author_name"],
            author_source=analysis["author_source"],
            publisher_name=analysis["publisher_name"],
            publisher_source=analysis["publisher_source"],
            book_title=analysis["book_title"],
            book_title_source=analysis["book_title_source"],
            contact_page_url=analysis["contact_page_url"],
            relevance_score=analysis["relevance_score"],
            extraction_confidence=analysis["extraction_confidence"]
        )

        return {
            'author_name': analysis["author_name"] or "Unknown",
            'book_title': analysis["book_title"] or "Unknown",
            'platform_url': analysis["final_url"] or url,
            'email_address': analysis["email_address"]
        }

    def process_urls(self, urls: list) -> list:
        """Processes a list of URLs and returns a list of lead dictionaries."""
        leads = []
        for url in urls:
            lead = self.extract_from_url(url)
            if lead:
                leads.append(lead)
                logger.info(f"Extracted lead: {lead['email_address']}")
            
            # Humanized delay between page visits
            humanized_delay(10, 45)
            
        return leads
