import logging
import re
import urllib.parse

import requests
from bs4 import BeautifulSoup

from source_registry import flatten_source_queries
from utils import append_execution_log, humanized_delay, safe_request

logger = logging.getLogger(__name__)


class SearchModule:
    def __init__(self):
        self.session = requests.Session()
        self.query_profiles = flatten_source_queries()
        self.queries = [profile["query"] for profile in self.query_profiles]
        self.google_block_phrases = {
            "automated queries",
            "detected unusual traffic",
            "our systems have detected unusual traffic",
            "sorry/index",
            "unusual traffic from your computer network",
        }
        self.duckduckgo_block_phrases = {
            "anomaly",
            "automated traffic",
            "unusual traffic",
            "captcha",
        }
        self.bing_block_phrases = {
            "one last step",
            "solve the challenge below to continue",
            "captcha",
            "verify you are a human",
        }
        self.google_circuit_open = False
        self.google_circuit_reason = None

    def _dedupe_urls(self, urls: list) -> list:
        return list(dict.fromkeys(urls))

    def _is_search_engine_or_internal_url(self, url: str) -> bool:
        host = urllib.parse.urlparse(url).netloc.lower()
        blocked_hosts = (
            "google.",
            "duckduckgo.com",
            "bing.com",
            "webcache.googleusercontent.com",
        )
        return any(blocked_host in host for blocked_host in blocked_hosts)

    def _looks_like_ad_or_tracking_url(self, url: str) -> bool:
        lowered = url.lower()
        return any(marker in lowered for marker in [
            "duckduckgo.com/y.js",
            "/aclick?",
            "/shopping/product/",
            "microsoft.com/fwlink",
        ])

    def _extract_direct_url(self, href: str) -> str | None:
        if not href:
            return None

        normalized_href = f"https:{href}" if href.startswith("//") else href
        parsed = urllib.parse.urlparse(normalized_href)
        query = urllib.parse.parse_qs(parsed.query)

        if href.startswith("/url?") or ("google." in parsed.netloc and parsed.path == "/url"):
            for key in ("q", "url"):
                if query.get(key):
                    return urllib.parse.unquote(query[key][0])

        if "duckduckgo.com/l/" in normalized_href and query.get("uddg"):
            return urllib.parse.unquote(query["uddg"][0])

        if normalized_href.startswith("http://") or normalized_href.startswith("https://"):
            return normalized_href

        return None

    def _candidate_url_from_anchor(self, anchor) -> str | None:
        href = anchor.get("href")
        direct_url = self._extract_direct_url(href) if href else None

        if not direct_url:
            return None
        if self._is_search_engine_or_internal_url(direct_url):
            return None
        if self._looks_like_ad_or_tracking_url(direct_url):
            return None
        return direct_url

    def _backend_diagnostics(self, soup, urls: list, extra=None) -> dict:
        anchors = soup.find_all("a", href=True)
        diagnostics = {
            "anchor_count": len(anchors),
            "h2_count": len(soup.find_all("h2")),
            "h3_count": len(soup.find_all("h3")),
            "candidate_link_count": len(urls),
            "first_candidate_hrefs": self._dedupe_urls(urls)[:5],
            "page_title": soup.title.string.strip() if soup.title and soup.title.string else "",
        }
        if extra:
            diagnostics.update(extra)
        return diagnostics

    def _extract_google_urls(self, soup, response_text: str) -> tuple[list, dict]:
        urls = []

        for anchor in soup.find_all("a", href=True):
            has_result_shape = (
                anchor.find("h3") is not None
                or anchor.get("data-ved") is not None
                or anchor.get("jsname") is not None
                or anchor.get("href", "").startswith("/url?")
            )
            if not has_result_shape:
                continue
            candidate_url = self._candidate_url_from_anchor(anchor)
            if candidate_url:
                urls.append(candidate_url)

        if not urls:
            for href in re.findall(r'\/url\?(?:q|url)=([^"&]+)', response_text):
                candidate_url = urllib.parse.unquote(href)
                if not self._is_search_engine_or_internal_url(candidate_url):
                    urls.append(candidate_url)

        diagnostics = self._backend_diagnostics(
            soup,
            self._dedupe_urls(urls),
            extra={"form_count": len(soup.find_all("form"))}
        )
        return self._dedupe_urls(urls), diagnostics

    def _extract_duckduckgo_urls(self, soup) -> tuple[list, dict]:
        urls = []
        selectors = [
            "a.result__a[href]",
            ".result__title a[href]",
            ".links_main a[href]",
            ".result a[href]",
        ]

        for selector in selectors:
            for anchor in soup.select(selector):
                candidate_url = self._candidate_url_from_anchor(anchor)
                if candidate_url:
                    urls.append(candidate_url)

        if not urls:
            for anchor in soup.find_all("a", href=True):
                candidate_url = self._candidate_url_from_anchor(anchor)
                if candidate_url:
                    urls.append(candidate_url)

        diagnostics = self._backend_diagnostics(
            soup,
            self._dedupe_urls(urls),
            extra={"result_anchor_count": len(soup.select("a.result__a[href]"))}
        )
        return self._dedupe_urls(urls), diagnostics

    def _extract_bing_urls(self, soup) -> tuple[list, dict]:
        urls = []
        selectors = [
            "li.b_algo h2 a[href]",
            "ol#b_results h2 a[href]",
            "main h2 a[href]",
        ]

        for selector in selectors:
            for anchor in soup.select(selector):
                candidate_url = self._candidate_url_from_anchor(anchor)
                if candidate_url:
                    urls.append(candidate_url)

        if not urls:
            for anchor in soup.find_all("a", href=True):
                candidate_url = self._candidate_url_from_anchor(anchor)
                if candidate_url:
                    urls.append(candidate_url)

        diagnostics = self._backend_diagnostics(
            soup,
            self._dedupe_urls(urls),
            extra={
                "b_algo_count": len(soup.select("li.b_algo")),
                "captcha_node_count": len(soup.select(".captcha")),
            }
        )
        return self._dedupe_urls(urls), diagnostics

    def _build_backend_failure(self, backend: str, search_url: str, request_meta: dict, blocked: bool) -> dict:
        return {
            "backend": backend,
            "urls": [],
            "response_received": False,
            "search_url": search_url,
            "search_healthy": False,
            "blocked": blocked,
            "anti_bot_suspected": blocked,
            "diagnostics": {
                "status_code": request_meta.get("status_code"),
                "request_error": request_meta.get("error"),
                "final_url": request_meta.get("final_url"),
            }
        }

    def _request_search_page(self, backend: str, search_url: str, query: str, profile=None, accepted_status_codes=None):
        server_name = profile.get("server_name") if profile else None
        source_name = profile.get("source_name") if profile else None
        domain = profile.get("domain") if profile else None

        append_execution_log(
            "query_backend_started",
            backend=backend,
            query=query,
            search_url=search_url,
            server_name=server_name,
            source_name=source_name,
            domain=domain
        )

        response, request_meta = safe_request(
            search_url,
            self.session,
            request_context={
                "stage": "search",
                "backend": backend,
                "query": query,
                "server_name": server_name,
                "source_name": source_name,
                "domain": domain,
            },
            return_meta=True,
            backoff_on_block=False,
            accepted_status_codes=accepted_status_codes or {200}
        )
        return response, request_meta

    def _search_google_backend(self, query: str, num_results: int, profile=None) -> dict:
        search_url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&num={num_results}"

        if self.google_circuit_open:
            append_execution_log(
                "query_backend_skipped",
                backend="google",
                query=query,
                reason="circuit_open",
                circuit_reason=self.google_circuit_reason
            )
            return {
                "backend": "google",
                "urls": [],
                "response_received": False,
                "search_url": search_url,
                "search_healthy": False,
                "blocked": True,
                "anti_bot_suspected": True,
                "diagnostics": {
                    "status_code": 429,
                    "request_error": "google_circuit_open",
                    "final_url": search_url,
                    "circuit_reason": self.google_circuit_reason,
                }
            }

        response, request_meta = self._request_search_page(
            "google",
            search_url,
            query,
            profile=profile,
            accepted_status_codes={200}
        )

        if not response:
            blocked = request_meta.get("status_code") in {403, 429}
            if blocked:
                self.google_circuit_open = True
                self.google_circuit_reason = f"status_{request_meta.get('status_code')}"
            return self._build_backend_failure("google", search_url, request_meta, blocked=blocked)

        soup = BeautifulSoup(response.text, "html.parser")
        urls, diagnostics = self._extract_google_urls(soup, response.text)
        response_lower = response.text.lower()
        anti_bot_suspected = (
            response.status_code in {403, 429}
            or "/sorry/" in response.url
            or any(phrase in response_lower for phrase in self.google_block_phrases)
        )
        suspicious_shell = (
            diagnostics["page_title"].lower() == "google search"
            and diagnostics["candidate_link_count"] == 0
            and diagnostics["h3_count"] == 0
        )
        if anti_bot_suspected:
            self.google_circuit_open = True
            self.google_circuit_reason = "anti_bot_page"

        diagnostics.update({
            "status_code": response.status_code,
            "final_url": response.url,
            "response_bytes": len(response.content),
            "suspicious_shell": suspicious_shell,
        })

        append_execution_log(
            "query_backend_completed",
            backend="google",
            query=query,
            discovered_url_count=len(urls),
            blocked=anti_bot_suspected,
            diagnostics=diagnostics
        )

        return {
            "backend": "google",
            "urls": urls,
            "response_received": True,
            "search_url": search_url,
            "search_healthy": not anti_bot_suspected and not suspicious_shell,
            "blocked": anti_bot_suspected,
            "anti_bot_suspected": anti_bot_suspected,
            "diagnostics": diagnostics,
        }

    def _search_duckduckgo_backend(self, query: str, num_results: int, profile=None) -> dict:
        search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        response, request_meta = self._request_search_page(
            "duckduckgo",
            search_url,
            query,
            profile=profile,
            accepted_status_codes={200, 202}
        )

        if not response:
            blocked = request_meta.get("status_code") in {403, 429}
            return self._build_backend_failure("duckduckgo", search_url, request_meta, blocked=blocked)

        soup = BeautifulSoup(response.text, "html.parser")
        urls, diagnostics = self._extract_duckduckgo_urls(soup)
        urls = urls[:num_results]
        response_lower = response.text.lower()
        suspicious_shell = diagnostics["result_anchor_count"] == 0 and diagnostics["candidate_link_count"] == 0
        anti_bot_suspected = (
            response.status_code in {403, 429}
            or any(phrase in response_lower for phrase in self.duckduckgo_block_phrases)
            and suspicious_shell
        )

        diagnostics.update({
            "status_code": response.status_code,
            "final_url": response.url,
            "response_bytes": len(response.content),
            "suspicious_shell": suspicious_shell,
        })

        append_execution_log(
            "query_backend_completed",
            backend="duckduckgo",
            query=query,
            discovered_url_count=len(urls),
            blocked=anti_bot_suspected,
            diagnostics=diagnostics
        )

        return {
            "backend": "duckduckgo",
            "urls": urls,
            "response_received": True,
            "search_url": search_url,
            "search_healthy": not anti_bot_suspected and not suspicious_shell,
            "blocked": anti_bot_suspected,
            "anti_bot_suspected": anti_bot_suspected,
            "diagnostics": diagnostics,
        }

    def _search_bing_backend(self, query: str, num_results: int, profile=None) -> dict:
        search_url = f"https://www.bing.com/search?q={urllib.parse.quote(query)}&count={num_results}"
        response, request_meta = self._request_search_page(
            "bing",
            search_url,
            query,
            profile=profile,
            accepted_status_codes={200}
        )

        if not response:
            blocked = request_meta.get("status_code") in {403, 429}
            return self._build_backend_failure("bing", search_url, request_meta, blocked=blocked)

        soup = BeautifulSoup(response.text, "html.parser")
        urls, diagnostics = self._extract_bing_urls(soup)
        urls = urls[:num_results]
        response_lower = response.text.lower()
        suspicious_shell = diagnostics["b_algo_count"] == 0 and diagnostics["candidate_link_count"] == 0
        anti_bot_suspected = (
            response.status_code in {403, 429}
            or any(phrase in response_lower for phrase in self.bing_block_phrases)
            or diagnostics["captcha_node_count"] > 0
        )

        diagnostics.update({
            "status_code": response.status_code,
            "final_url": response.url,
            "response_bytes": len(response.content),
            "suspicious_shell": suspicious_shell,
        })

        append_execution_log(
            "query_backend_completed",
            backend="bing",
            query=query,
            discovered_url_count=len(urls),
            blocked=anti_bot_suspected,
            diagnostics=diagnostics
        )

        return {
            "backend": "bing",
            "urls": urls,
            "response_received": True,
            "search_url": search_url,
            "search_healthy": not anti_bot_suspected and not suspicious_shell,
            "blocked": anti_bot_suspected,
            "anti_bot_suspected": anti_bot_suspected,
            "diagnostics": diagnostics,
        }

    def search_query(self, query: str, num_results: int = 10, profile=None) -> dict:
        """Searches for candidate URLs and falls back if the primary backend looks unhealthy."""
        logger.info(f"Searching for query: {query}")
        server_name = profile.get("server_name") if profile else None
        source_name = profile.get("source_name") if profile else None
        domain = profile.get("domain") if profile else None

        append_execution_log(
            "query_started",
            query=query,
            requested_results=num_results,
            server_name=server_name,
            source_name=source_name,
            domain=domain
        )

        backend_results = []
        backend_used = "none"
        final_urls = []

        google_result = self._search_google_backend(query, num_results, profile=profile)
        backend_results.append(google_result)

        if google_result["urls"]:
            backend_used = "google"
            final_urls = google_result["urls"]
            search_status = "ok_google"
            learning_valid = google_result["search_healthy"]
        else:
            append_execution_log(
                "query_zero_yield_diagnostic",
                query=query,
                backend="google",
                server_name=server_name,
                source_name=source_name,
                domain=domain,
                diagnostics=google_result["diagnostics"]
            )

            duckduckgo_result = self._search_duckduckgo_backend(query, num_results, profile=profile)
            backend_results.append(duckduckgo_result)
            backend_used = "duckduckgo"

            if duckduckgo_result["urls"]:
                final_urls = duckduckgo_result["urls"]
                search_status = "ok_duckduckgo_fallback"
                learning_valid = True
            else:
                append_execution_log(
                    "query_zero_yield_diagnostic",
                    query=query,
                    backend="duckduckgo",
                    server_name=server_name,
                    source_name=source_name,
                    domain=domain,
                    diagnostics=duckduckgo_result["diagnostics"]
                )

                bing_result = self._search_bing_backend(query, num_results, profile=profile)
                backend_results.append(bing_result)
                backend_used = "bing"

                if bing_result["urls"]:
                    final_urls = bing_result["urls"]
                    search_status = "ok_bing_fallback"
                    learning_valid = True
                elif all(result["search_healthy"] for result in backend_results):
                    search_status = "zero_yield_confirmed"
                    learning_valid = True
                else:
                    search_status = "search_unhealthy"
                    learning_valid = False

        result = {
            "query": query,
            "urls": self._dedupe_urls(final_urls),
            "backend_used": backend_used,
            "backend_results": backend_results,
            "search_status": search_status,
            "learning_valid": learning_valid,
            "search_healthy": learning_valid,
        }

        logger.info(
            f"Found {len(result['urls'])} URLs for query: {query} "
            f"(backend={backend_used}, status={search_status})"
        )
        append_execution_log(
            "query_completed",
            query=query,
            requested_results=num_results,
            discovered_url_count=len(result["urls"]),
            discovered_urls=result["urls"],
            backend_used=backend_used,
            attempted_backends=[backend_result["backend"] for backend_result in backend_results],
            search_status=search_status,
            learning_valid=learning_valid,
            server_name=server_name,
            source_name=source_name,
            domain=domain
        )
        return result

    def search_google(self, query: str, num_results: int = 10, profile=None) -> list:
        """Backward-compatible wrapper returning only URLs."""
        return self.search_query(query, num_results=num_results, profile=profile)["urls"]

    def run_query_profiles(self, query_profiles: list, results_per_query: int = 10) -> list:
        """Runs a list of query profiles and returns a combined deduplicated URL list."""
        append_execution_log(
            "query_batch_started",
            query_count=len(query_profiles),
            results_per_query=results_per_query
        )

        all_urls = []
        for profile in query_profiles:
            query = profile.get("query") or profile.get("query_text")
            result = self.search_query(query, num_results=results_per_query, profile=profile)
            all_urls.extend(result["urls"])
            humanized_delay(20, 60)

        deduped_urls = self._dedupe_urls(all_urls)
        append_execution_log(
            "query_batch_completed",
            query_count=len(query_profiles),
            combined_url_count=len(deduped_urls)
        )
        return deduped_urls

    def run_all_queries(self, results_per_query: int = 10) -> list:
        """Iterates through all predefined queries and returns a combined list of URLs."""
        return self.run_query_profiles(self.query_profiles, results_per_query=results_per_query)
