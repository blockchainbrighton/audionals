import argparse
import logging
import signal
import sys
from uuid import uuid4

from extraction_module import ExtractionModule
from probe_module import ProbeModule
from search_module import SearchModule
from storage_module import StorageModule
from utils import append_execution_log, humanized_delay, set_execution_log_path, set_execution_run_id

logger = logging.getLogger(__name__)


def signal_handler(sig, frame):
    """Handles Ctrl+C and other signals for graceful shutdown."""
    append_execution_log("run_interrupted", signal=sig)
    logger.info("\nGracefully shutting down. Saving current progress...")
    sys.exit(0)


def _build_profile_lookup(search_module) -> dict:
    lookup = {}
    for profile in search_module.query_profiles:
        lookup[(profile.get("source_name"), profile.get("domain"), profile.get("query"))] = profile
    return lookup


def select_harvest_profiles(search_module, storage_module, live_query_results, harvest_top: int, default_results: int) -> list:
    """Chooses the best query profiles to use for harvest mode."""
    profile_lookup = _build_profile_lookup(search_module)

    if live_query_results:
        ranked_live_queries = [
            {
                "source_name": result["source_name"],
                "server_name": result["source_name"],
                "domain": result["domain"],
                "query": result["query_text"],
                "source_type": result.get("source_type") or profile_lookup.get(
                    (result["source_name"], result["domain"], result["query_text"]),
                    {}
                ).get("source_type"),
                "budget_recommendation": result["budget_recommendation"] or default_results,
                "score": result["score"],
                "classification": result["classification"],
            }
            for result in live_query_results
            if result["budget_recommendation"] > 0
        ]
        if ranked_live_queries:
            return ranked_live_queries[:harvest_top]

    historical_profiles = storage_module.get_top_query_profiles(limit=harvest_top)
    if historical_profiles:
        for profile in historical_profiles:
            profile_match = profile_lookup.get((profile.get("source_name"), profile.get("domain"), profile.get("query")))
            if profile_match:
                profile["source_type"] = profile_match.get("source_type")
        return historical_profiles

    fallback_profiles = []
    for profile in search_module.query_profiles[:harvest_top]:
        fallback_profiles.append({
            "source_name": profile.get("source_name"),
            "server_name": profile.get("server_name"),
            "domain": profile.get("domain"),
            "query": profile.get("query"),
            "source_type": profile.get("source_type"),
            "budget_recommendation": default_results,
            "score": None,
            "classification": "fallback",
        })
    return fallback_profiles


def run_harvest(search_module, extraction_module, storage_module, harvest_profiles: list, fallback_results: int) -> dict:
    """Runs the full scraper on selected high-priority query profiles."""
    stats = {
        "harvest_profiles": len(harvest_profiles),
        "search_unhealthy_profiles": 0,
        "urls_discovered": 0,
        "urls_processed": 0,
        "leads_extracted": 0,
        "new_leads": 0,
        "duplicates": 0,
        "storage_errors": 0,
        "extraction_failures": 0,
    }

    if not harvest_profiles:
        return stats

    append_execution_log(
        "harvest_started",
        profile_count=len(harvest_profiles),
        selected_profiles=harvest_profiles
    )

    discovered_entries = []
    for index, profile in enumerate(harvest_profiles, start=1):
        requested_results = profile.get("budget_recommendation") or fallback_results
        logger.info(
            f"Harvest {index}/{len(harvest_profiles)}: running {profile['query']} with budget {requested_results}"
        )

        search_result = search_module.search_query(
            profile["query"],
            num_results=requested_results,
            profile=profile
        )
        if not search_result["learning_valid"]:
            stats["search_unhealthy_profiles"] += 1
            append_execution_log(
                "harvest_profile_skipped",
                query=profile["query"],
                source_name=profile.get("source_name"),
                domain=profile.get("domain"),
                reason="search_unhealthy",
                backend_used=search_result["backend_used"],
                search_status=search_result["search_status"]
            )
            if index < len(harvest_profiles):
                humanized_delay(20, 60)
            continue

        urls = search_result["urls"]
        for url in urls[:requested_results]:
            discovered_entries.append({
                "url": url,
                "source_name": profile.get("source_name"),
                "domain": profile.get("domain"),
                "source_type": profile.get("source_type"),
                "query": profile.get("query"),
            })

        if index < len(harvest_profiles):
            humanized_delay(20, 60)

    deduped_entries = []
    seen_urls = set()
    for entry in discovered_entries:
        if entry["url"] in seen_urls:
            continue
        seen_urls.add(entry["url"])
        deduped_entries.append(entry)
    stats["urls_discovered"] = len(deduped_entries)
    logger.info(f"Harvest search complete. Discovered {len(deduped_entries)} URLs to inspect.")

    for entry in deduped_entries:
        stats["urls_processed"] += 1
        lead_data = extraction_module.extract_from_url(
            entry["url"],
            request_context={
                "source_name": entry.get("source_name"),
                "domain": entry.get("domain"),
                "source_type": entry.get("source_type"),
                "query": entry.get("query"),
            }
        )

        if lead_data:
            stats["leads_extracted"] += 1
            add_result = storage_module.add_lead(
                author_name=lead_data["author_name"],
                book_title=lead_data["book_title"],
                platform_url=lead_data["platform_url"],
                email_address=lead_data["email_address"]
            )
            if add_result == "inserted":
                stats["new_leads"] += 1
            elif add_result == "duplicate":
                stats["duplicates"] += 1
            else:
                stats["storage_errors"] += 1
        else:
            stats["extraction_failures"] += 1

        humanized_delay(10, 45)

    append_execution_log("harvest_completed", **stats)
    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Adaptive lead-generation scraper with probe and harvest modes"
    )
    parser.add_argument("--mode", choices=["probe", "harvest", "full"], default="full")
    parser.add_argument("--results", type=int, default=10, help="Fallback number of results per harvest query.")
    parser.add_argument("--db", type=str, default="leads.db", help="Path to the SQLite database file.")
    parser.add_argument("--exec-log", type=str, default="execution_log.jsonl", help="Path to the structured execution log.")
    parser.add_argument("--probe-queries", type=int, default=2, help="Maximum queries to test per source in probe mode.")
    parser.add_argument("--probe-pages", type=int, default=5, help="Maximum pages to test per source in probe mode.")
    parser.add_argument("--probe-results", type=int, default=3, help="Search results to request per probe query.")
    parser.add_argument("--harvest-top", type=int, default=5, help="Number of top query profiles to harvest.")
    args = parser.parse_args()

    run_id = uuid4().hex
    set_execution_log_path(args.exec_log)
    set_execution_run_id(run_id)

    signal.signal(signal.SIGINT, signal_handler)

    append_execution_log(
        "run_started",
        run_id=run_id,
        mode=args.mode,
        db_path=args.db,
        exec_log=args.exec_log,
        probe_queries=args.probe_queries,
        probe_pages=args.probe_pages,
        probe_results=args.probe_results,
        harvest_top=args.harvest_top,
        fallback_results=args.results
    )
    logger.info("Starting Adaptive Lead-Generation App...")

    storage_module = StorageModule(db_path=args.db)
    search_module = SearchModule()
    extraction_module = ExtractionModule()
    probe_module = ProbeModule(search_module, extraction_module, storage_module)

    summary = {
        "mode": args.mode,
        "probe_sources_tested": 0,
        "probe_queries_tested": 0,
        "harvest_profiles_selected": 0,
        "urls_discovered": 0,
        "urls_processed": 0,
        "new_leads": 0,
        "duplicates": 0,
        "storage_errors": 0,
        "extraction_failures": 0,
    }

    try:
        source_results = []
        query_results = []

        if args.mode in {"probe", "full"}:
            logger.info("Phase 1: Probe Mode")
            source_results, query_results = probe_module.run_probes(
                run_id=run_id,
                max_queries_per_source=args.probe_queries,
                max_pages_per_source=args.probe_pages,
                results_per_query=args.probe_results
            )
            summary["probe_sources_tested"] = len(source_results)
            summary["probe_queries_tested"] = len(query_results)

            if source_results:
                best_source = source_results[0]
                logger.info(
                    f"Probe complete. Top source: {best_source['source_name']} "
                    f"(score={best_source['score']}, budget={best_source['budget_recommendation']})."
                )

        if args.mode in {"harvest", "full"}:
            logger.info("Phase 2: Harvest Mode")
            harvest_profiles = select_harvest_profiles(
                search_module=search_module,
                storage_module=storage_module,
                live_query_results=query_results,
                harvest_top=args.harvest_top,
                default_results=args.results
            )
            summary["harvest_profiles_selected"] = len(harvest_profiles)

            harvest_stats = run_harvest(
                search_module=search_module,
                extraction_module=extraction_module,
                storage_module=storage_module,
                harvest_profiles=harvest_profiles,
                fallback_results=args.results
            )
            summary.update({
                "urls_discovered": harvest_stats["urls_discovered"],
                "urls_processed": harvest_stats["urls_processed"],
                "new_leads": harvest_stats["new_leads"],
                "duplicates": harvest_stats["duplicates"],
                "storage_errors": harvest_stats["storage_errors"],
                "extraction_failures": harvest_stats["extraction_failures"],
            })

        logger.info(
            f"Run complete. Added {summary['new_leads']} new leads. "
            f"Processed {summary['urls_processed']} URLs."
        )
        append_execution_log("run_completed", **summary)
    except Exception as exc:
        append_execution_log("run_failed", error=str(exc), **summary)
        raise


if __name__ == "__main__":
    main()
