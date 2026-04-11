import logging
from collections import Counter
from datetime import datetime, timezone
from urllib.parse import urlparse

from scoring_module import allocate_budget, classify_score, compute_query_score, compute_source_score
from source_registry import load_sources
from utils import append_execution_log, humanized_delay

logger = logging.getLogger(__name__)


class ProbeModule:
    """Runs small-scale probes against sources so the full scraper can focus later."""

    def __init__(self, search_module, extraction_module, storage_module):
        self.search_module = search_module
        self.extraction_module = extraction_module
        self.storage_module = storage_module

    def _mean(self, values: list) -> float:
        return round(sum(values) / len(values), 4) if values else 0.0

    def _count_blocked_pages(self, analyses: list) -> int:
        return sum(
            1 for analysis in analyses
            if analysis["status_code"] in {403, 429}
            or analysis["captcha_suspected"]
            or analysis["js_required"]
        )

    def _build_query_result(
        self,
        run_id: str,
        source: dict,
        query: str,
        search_result: dict,
        analyses: list,
        leads_inserted: int,
        duplicates: int
    ) -> dict:
        urls = search_result["urls"]
        pages_tested = len(analyses)
        pages_fetched = sum(1 for analysis in analyses if analysis["fetch_succeeded"])
        email_hits = sum(1 for analysis in analyses if analysis["has_email"])
        author_hits = sum(1 for analysis in analyses if analysis["has_author_name"])
        title_hits = sum(1 for analysis in analyses if analysis["has_book_title"])
        valid_leads = sum(1 for analysis in analyses if analysis["has_email"] and analysis["is_relevant"])
        relevance_rate = round(
            sum(1 for analysis in analyses if analysis["is_relevant"]) / max(pages_tested, 1),
            4
        )
        avg_fetch_seconds = round(self._mean([
            (analysis["fetch_time_ms"] or 0.0) / 1000.0
            for analysis in analyses if analysis["fetch_succeeded"]
        ]), 4)
        extraction_confidence_mean = round(self._mean([
            analysis["extraction_confidence"] for analysis in analyses if analysis["fetch_succeeded"]
        ]), 4)
        block_count = self._count_blocked_pages(analyses)

        metrics = {
            "results_returned": len(urls),
            "pages_tested": pages_tested,
            "pages_fetched": pages_fetched,
            "email_hits": email_hits,
            "author_hits": author_hits,
            "title_hits": title_hits,
            "valid_leads": valid_leads,
            "duplicates": duplicates,
            "relevance_rate": relevance_rate,
            "block_count": block_count,
            "avg_fetch_seconds": avg_fetch_seconds,
            "extraction_confidence_mean": extraction_confidence_mean,
        }
        score = compute_query_score(metrics)

        return {
            "run_id": run_id,
            "source_name": source["name"],
            "domain": source["domain"],
            "source_type": source["type"],
            "query_text": query,
            "run_timestamp": datetime.now(timezone.utc).isoformat(),
            "results_returned": len(urls),
            "pages_tested": pages_tested,
            "pages_fetched": pages_fetched,
            "email_hits": email_hits,
            "author_hits": author_hits,
            "title_hits": title_hits,
            "valid_leads": valid_leads,
            "duplicates": duplicates,
            "relevance_rate": relevance_rate,
            "block_count": block_count,
            "avg_fetch_seconds": avg_fetch_seconds,
            "extraction_confidence_mean": extraction_confidence_mean,
            "score": score,
            "classification": classify_score(score),
            "budget_recommendation": allocate_budget(score),
            "sampled_urls": [analysis["url"] for analysis in analyses],
            "raw_metrics": {
                "leads_inserted": leads_inserted,
                "backend_used": search_result["backend_used"],
                "search_status": search_result["search_status"],
                "page_summaries": [
                    {
                        "url": analysis["url"],
                        "fetch_succeeded": analysis["fetch_succeeded"],
                        "has_email": analysis["has_email"],
                        "is_relevant": analysis["is_relevant"],
                        "relevance_score": analysis["relevance_score"],
                        "extraction_confidence": analysis["extraction_confidence"],
                        "status_code": analysis["status_code"],
                    }
                    for analysis in analyses
                ]
            }
        }

    def _build_source_result(
        self,
        run_id: str,
        source: dict,
        query_results: list,
        all_discovered_urls: list,
        analyses: list,
        leads_inserted: int,
        duplicates: int,
        global_seen_emails: set,
        invalid_search_queries: int
    ) -> dict:
        pages_tested = len(analyses)
        pages_fetched = sum(1 for analysis in analyses if analysis["fetch_succeeded"])
        email_hits = sum(1 for analysis in analyses if analysis["has_email"])
        author_hits = sum(1 for analysis in analyses if analysis["has_author_name"])
        publisher_hits = sum(1 for analysis in analyses if analysis["has_publisher_name"])
        title_hits = sum(1 for analysis in analyses if analysis["has_book_title"])
        valid_leads = sum(1 for analysis in analyses if analysis["has_email"] and analysis["is_relevant"])
        insert_attempts = leads_inserted + duplicates
        duplicate_rate = round(duplicates / max(insert_attempts, 1), 4)

        unique_emails = []
        all_emails = []
        for analysis in analyses:
            for email in analysis["emails"]:
                all_emails.append(email)
                if email not in unique_emails:
                    unique_emails.append(email)

        personal_email_count = sum(
            1 for email in unique_emails if self.extraction_module._looks_personal_email(email)
        )
        generic_email_count = len(unique_emails) - personal_email_count
        personal_email_pct = round(personal_email_count / max(len(unique_emails), 1), 4)
        generic_email_pct = round(generic_email_count / max(len(unique_emails), 1), 4)
        leads_with_name_and_title = sum(
            1 for analysis in analyses
            if analysis["has_email"] and analysis["has_author_name"] and analysis["has_book_title"]
        )
        leads_with_name_and_title_pct = round(leads_with_name_and_title / max(valid_leads, 1), 4)
        relevance_rate = round(
            sum(1 for analysis in analyses if analysis["is_relevant"]) / max(pages_tested, 1),
            4
        )
        business_page_pct = round(
            sum(1 for analysis in analyses if analysis["has_email"] and analysis["business_page"]) / max(valid_leads, 1),
            4
        )
        extraction_confidence_mean = round(self._mean([
            analysis["extraction_confidence"] for analysis in analyses if analysis["fetch_succeeded"]
        ]), 4)
        block_count = self._count_blocked_pages(analyses)
        block_rate = round(block_count / max(pages_tested, 1), 4)
        avg_fetch_seconds = round(self._mean([
            (analysis["fetch_time_ms"] or 0.0) / 1000.0
            for analysis in analyses if analysis["fetch_succeeded"]
        ]), 4)
        redirect_rate = round(
            sum(1 for analysis in analyses if analysis["redirected"]) / max(pages_fetched, 1),
            4
        )
        js_render_rate = round(
            sum(1 for analysis in analyses if analysis["js_required"]) / max(pages_tested, 1),
            4
        )
        robots_terms_flag_rate = round(
            sum(1 for analysis in analyses if analysis["robots_terms_flag"]) / max(pages_fetched, 1),
            4
        )
        content_thin_rate = round(
            sum(1 for analysis in analyses if analysis["content_thin"]) / max(pages_fetched, 1),
            4
        )
        unique_emails_per_100_pages = round((len(unique_emails) / max(pages_tested, 1)) * 100, 4)
        unique_domains_discovered = len({urlparse(url).netloc for url in all_discovered_urls if url})
        duplicate_emails_across_platforms = sum(1 for email in unique_emails if email in global_seen_emails)
        repeated_contact_hub_emails = sum(
            1 for email, count in Counter(all_emails).items()
            if count > 1 and not self.extraction_module._looks_personal_email(email)
        )

        metrics = {
            "pages_tested": pages_tested,
            "pages_fetched": pages_fetched,
            "email_hits": email_hits,
            "author_hits": author_hits,
            "title_hits": title_hits,
            "valid_leads": valid_leads,
            "duplicates": duplicates,
            "relevance_rate": relevance_rate,
            "block_count": block_count,
            "avg_fetch_seconds": avg_fetch_seconds,
            "extraction_confidence_mean": extraction_confidence_mean,
        }
        score = compute_source_score(metrics)

        return {
            "run_id": run_id,
            "source_name": source["name"],
            "domain": source["domain"],
            "run_timestamp": datetime.now(timezone.utc).isoformat(),
            "query_count": len(query_results),
            "pages_tested": pages_tested,
            "pages_fetched": pages_fetched,
            "email_hits": email_hits,
            "author_hits": author_hits,
            "publisher_hits": publisher_hits,
            "title_hits": title_hits,
            "valid_leads": valid_leads,
            "leads_inserted": leads_inserted,
            "duplicates": duplicates,
            "duplicate_rate": duplicate_rate,
            "personal_email_pct": personal_email_pct,
            "generic_email_pct": generic_email_pct,
            "leads_with_name_and_title_pct": leads_with_name_and_title_pct,
            "relevance_rate": relevance_rate,
            "business_page_pct": business_page_pct,
            "extraction_confidence_mean": extraction_confidence_mean,
            "block_count": block_count,
            "block_rate": block_rate,
            "avg_fetch_seconds": avg_fetch_seconds,
            "redirect_rate": redirect_rate,
            "js_render_rate": js_render_rate,
            "robots_terms_flag_rate": robots_terms_flag_rate,
            "content_thin_rate": content_thin_rate,
            "unique_emails_per_100_pages": unique_emails_per_100_pages,
            "unique_domains_discovered": unique_domains_discovered,
            "duplicate_emails_across_platforms": duplicate_emails_across_platforms,
            "repeated_contact_hub_emails": repeated_contact_hub_emails,
            "score": score,
            "classification": classify_score(score),
            "budget_recommendation": allocate_budget(score),
            "sampled_urls": [analysis["url"] for analysis in analyses],
            "unique_emails": unique_emails,
            "raw_metrics": {
                "query_scores": [
                    {
                        "query_text": query_result["query_text"],
                        "score": query_result["score"],
                        "classification": query_result["classification"],
                    }
                    for query_result in query_results
                ],
                "invalid_search_queries": invalid_search_queries,
            }
        }

    def run_probes(self, run_id: str, max_queries_per_source: int = 2, max_pages_per_source: int = 5, results_per_query: int = 3):
        """Runs micro-probes across the source registry and persists the results."""
        append_execution_log(
            "probe_mode_started",
            run_id=run_id,
            max_queries_per_source=max_queries_per_source,
            max_pages_per_source=max_pages_per_source,
            results_per_query=results_per_query
        )

        source_results = []
        query_results = []
        global_seen_emails = set()

        for source_index, source in enumerate(load_sources(), start=1):
            logger.info(
                f"Probe {source_index}: testing source {source['name']} on {source['domain']}"
            )

            selected_queries = source["queries"][:max_queries_per_source]
            remaining_pages = max_pages_per_source
            source_query_results = []
            source_analyses = []
            all_discovered_urls = []
            source_leads_inserted = 0
            source_duplicates = 0
            invalid_search_queries = 0

            for query_index, query in enumerate(selected_queries, start=1):
                if remaining_pages <= 0:
                    break

                remaining_queries = len(selected_queries) - query_index + 1
                pages_for_query = max(1, remaining_pages // remaining_queries)
                profile = {
                    "source_name": source["name"],
                    "server_name": source["name"],
                    "domain": source["domain"],
                    "source_type": source["type"],
                    "query": query,
                }

                search_result = self.search_module.search_query(
                    query,
                    num_results=results_per_query,
                    profile=profile
                )
                if not search_result["learning_valid"]:
                    invalid_search_queries += 1
                    append_execution_log(
                        "query_probe_skipped",
                        run_id=run_id,
                        source_name=source["name"],
                        domain=source["domain"],
                        query=query,
                        reason="search_unhealthy",
                        backend_used=search_result["backend_used"],
                        search_status=search_result["search_status"]
                    )
                    if query_index < len(selected_queries):
                        humanized_delay(5, 15)
                    continue

                urls = search_result["urls"]
                sampled_urls = urls[:pages_for_query]
                query_analyses = []
                query_leads_inserted = 0
                query_duplicates = 0
                all_discovered_urls.extend(urls)

                for page_index, url in enumerate(sampled_urls, start=1):
                    analysis = self.extraction_module.analyze_url(
                        url,
                        request_context={
                            "stage": "probe",
                            "source_name": source["name"],
                            "domain": source["domain"],
                            "source_type": source["type"],
                            "query": query
                        }
                    )
                    query_analyses.append(analysis)
                    source_analyses.append(analysis)

                    if analysis["has_email"] and analysis["is_relevant"]:
                        add_result = self.storage_module.add_lead(
                            author_name=analysis["author_name"] or "Unknown",
                            book_title=analysis["book_title"] or "Unknown",
                            platform_url=analysis["final_url"] or url,
                            email_address=analysis["email_address"]
                        )
                        if add_result == "inserted":
                            query_leads_inserted += 1
                            source_leads_inserted += 1
                        elif add_result == "duplicate":
                            query_duplicates += 1
                            source_duplicates += 1

                    if page_index < len(sampled_urls):
                        humanized_delay(3, 8)

                query_result = self._build_query_result(
                    run_id=run_id,
                    source=source,
                    query=query,
                    search_result=search_result,
                    analyses=query_analyses,
                    leads_inserted=query_leads_inserted,
                    duplicates=query_duplicates
                )
                self.storage_module.save_query_probe_result(query_result)
                source_query_results.append(query_result)
                query_results.append(query_result)

                remaining_pages -= len(sampled_urls)

                if query_index < len(selected_queries):
                    humanized_delay(5, 15)

            if not source_query_results and invalid_search_queries:
                append_execution_log(
                    "source_probe_skipped",
                    run_id=run_id,
                    source_name=source["name"],
                    domain=source["domain"],
                    reason="search_unhealthy",
                    invalid_search_queries=invalid_search_queries
                )
                if source_index < len(load_sources()):
                    humanized_delay(8, 18)
                continue

            source_result = self._build_source_result(
                run_id=run_id,
                source=source,
                query_results=source_query_results,
                all_discovered_urls=all_discovered_urls,
                analyses=source_analyses,
                leads_inserted=source_leads_inserted,
                duplicates=source_duplicates,
                global_seen_emails=global_seen_emails,
                invalid_search_queries=invalid_search_queries
            )
            self.storage_module.save_source_probe_result(source_result)
            source_results.append(source_result)
            global_seen_emails.update(source_result["unique_emails"])

            append_execution_log(
                "source_probed",
                source_name=source_result["source_name"],
                domain=source_result["domain"],
                score=source_result["score"],
                classification=source_result["classification"],
                valid_leads=source_result["valid_leads"],
                budget_recommendation=source_result["budget_recommendation"]
            )

            if source_index < len(load_sources()):
                humanized_delay(8, 18)

        source_results.sort(key=lambda item: item["score"], reverse=True)
        query_results.sort(key=lambda item: item["score"], reverse=True)

        append_execution_log(
            "probe_mode_completed",
            run_id=run_id,
            ranked_sources=[
                {
                    "source_name": source_result["source_name"],
                    "score": source_result["score"],
                    "classification": source_result["classification"],
                    "budget_recommendation": source_result["budget_recommendation"]
                }
                for source_result in source_results
            ]
        )

        return source_results, query_results
