import json
import logging
import sqlite3
from datetime import datetime

from utils import append_execution_log

logger = logging.getLogger(__name__)


class StorageModule:
    def __init__(self, db_path="leads.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initializes the SQLite database with the required schema."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS leads (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        author_name TEXT,
                        book_title TEXT,
                        platform_url TEXT,
                        email_address TEXT UNIQUE,
                        date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        contact_status TEXT DEFAULT 'Pending'
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS source_probe_results (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        run_id TEXT,
                        source_name TEXT,
                        domain TEXT,
                        run_timestamp TEXT,
                        query_count INTEGER,
                        pages_tested INTEGER,
                        pages_fetched INTEGER,
                        email_hits INTEGER,
                        author_hits INTEGER,
                        publisher_hits INTEGER,
                        title_hits INTEGER,
                        valid_leads INTEGER,
                        leads_inserted INTEGER,
                        duplicates INTEGER,
                        duplicate_rate REAL,
                        personal_email_pct REAL,
                        generic_email_pct REAL,
                        leads_with_name_and_title_pct REAL,
                        relevance_rate REAL,
                        business_page_pct REAL,
                        extraction_confidence_mean REAL,
                        block_count INTEGER,
                        block_rate REAL,
                        avg_fetch_seconds REAL,
                        redirect_rate REAL,
                        js_render_rate REAL,
                        robots_terms_flag_rate REAL,
                        content_thin_rate REAL,
                        unique_emails_per_100_pages REAL,
                        unique_domains_discovered INTEGER,
                        duplicate_emails_across_platforms INTEGER,
                        repeated_contact_hub_emails INTEGER,
                        score REAL,
                        classification TEXT,
                        budget_recommendation INTEGER,
                        sampled_urls_json TEXT,
                        unique_emails_json TEXT,
                        raw_metrics_json TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS query_probe_results (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        run_id TEXT,
                        source_name TEXT,
                        domain TEXT,
                        query_text TEXT,
                        run_timestamp TEXT,
                        results_returned INTEGER,
                        pages_tested INTEGER,
                        pages_fetched INTEGER,
                        email_hits INTEGER,
                        author_hits INTEGER,
                        title_hits INTEGER,
                        valid_leads INTEGER,
                        duplicates INTEGER,
                        relevance_rate REAL,
                        block_count INTEGER,
                        avg_fetch_seconds REAL,
                        extraction_confidence_mean REAL,
                        score REAL,
                        classification TEXT,
                        budget_recommendation INTEGER,
                        sampled_urls_json TEXT,
                        raw_metrics_json TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS search_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        search_key TEXT UNIQUE,
                        run_id TEXT,
                        execution_mode TEXT,
                        source_name TEXT,
                        domain TEXT,
                        source_type TEXT,
                        query_text TEXT,
                        requested_results INTEGER,
                        registered_at TEXT,
                        backend_used TEXT,
                        search_status TEXT,
                        result_count INTEGER,
                        learning_valid INTEGER DEFAULT 0
                    )
                """)
                conn.commit()

            logger.info(f"Database initialized at {self.db_path}")
            append_execution_log("database_initialized", db_path=self.db_path)
        except sqlite3.Error as exc:
            logger.error(f"Error initializing database: {exc}")
            append_execution_log("database_init_failed", db_path=self.db_path, error=str(exc))

    def build_search_key(self, source_name, domain, query_text) -> str:
        normalized_source = (source_name or "").strip().lower()
        normalized_domain = (domain or "").strip().lower()
        normalized_query = " ".join((query_text or "").split()).lower()
        return f"{normalized_source}|{normalized_domain}|{normalized_query}"

    def build_search_key_from_profile(self, profile: dict) -> str:
        return self.build_search_key(
            profile.get("source_name"),
            profile.get("domain"),
            profile.get("query") or profile.get("query_text"),
        )

    def register_search(self, profile: dict, run_id: str, execution_mode: str, requested_results: int) -> bool:
        """Reserves a search so the same source/domain/query combination is never rerun."""
        search_key = self.build_search_key_from_profile(profile)

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR IGNORE INTO search_history (
                        search_key, run_id, execution_mode, source_name, domain, source_type,
                        query_text, requested_results, registered_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    search_key,
                    run_id,
                    execution_mode,
                    profile.get("source_name"),
                    profile.get("domain"),
                    profile.get("source_type"),
                    profile.get("query") or profile.get("query_text"),
                    requested_results,
                    datetime.utcnow().isoformat(),
                ))
                conn.commit()

            return cursor.rowcount == 1
        except sqlite3.Error as exc:
            logger.error(f"Error registering search history: {exc}")
            append_execution_log(
                "search_history_register_failed",
                db_path=self.db_path,
                source_name=profile.get("source_name"),
                domain=profile.get("domain"),
                query=profile.get("query") or profile.get("query_text"),
                error=str(exc)
            )
            return False

    def finalize_search(self, profile: dict, backend_used: str, search_status: str, result_count: int, learning_valid: bool):
        """Stores search outcome metadata for a previously registered search."""
        search_key = self.build_search_key_from_profile(profile)

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE search_history
                    SET backend_used = ?, search_status = ?, result_count = ?, learning_valid = ?
                    WHERE search_key = ?
                """, (
                    backend_used,
                    search_status,
                    result_count,
                    int(bool(learning_valid)),
                    search_key,
                ))
                conn.commit()
            return True
        except sqlite3.Error as exc:
            logger.error(f"Error finalizing search history: {exc}")
            append_execution_log(
                "search_history_finalize_failed",
                db_path=self.db_path,
                source_name=profile.get("source_name"),
                domain=profile.get("domain"),
                query=profile.get("query") or profile.get("query_text"),
                error=str(exc)
            )
            return False

    def get_executed_search_keys(self) -> set:
        """Returns the set of unique search keys already executed in prior or current runs."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT search_key FROM search_history")
                rows = cursor.fetchall()
            return {row[0] for row in rows}
        except sqlite3.Error as exc:
            logger.error(f"Error retrieving executed search keys: {exc}")
            append_execution_log("search_history_lookup_failed", db_path=self.db_path, error=str(exc))
            return set()

    def add_lead(self, author_name, book_title, platform_url, email_address):
        """Adds a new lead to the database. Deduplicates based on email_address."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO leads (author_name, book_title, platform_url, email_address, date_added, contact_status)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (author_name, book_title, platform_url, email_address, datetime.now(), 'Pending'))
                conn.commit()
            logger.info(f"Successfully added lead: {email_address}")
            append_execution_log(
                "lead_saved",
                db_path=self.db_path,
                email_address=email_address,
                author_name=author_name,
                book_title=book_title,
                platform_url=platform_url
            )
            return "inserted"
        except sqlite3.IntegrityError:
            logger.warning(f"Duplicate lead detected: {email_address}. Skipping.")
            append_execution_log(
                "lead_duplicate",
                db_path=self.db_path,
                email_address=email_address,
                platform_url=platform_url
            )
            return "duplicate"
        except sqlite3.Error as exc:
            logger.error(f"Error adding lead: {exc}")
            append_execution_log(
                "lead_save_failed",
                db_path=self.db_path,
                email_address=email_address,
                error=str(exc)
            )
            return "error"

    def save_source_probe_result(self, result: dict) -> bool:
        """Stores aggregate probe metrics for a source/domain."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO source_probe_results (
                        run_id, source_name, domain, run_timestamp, query_count, pages_tested,
                        pages_fetched, email_hits, author_hits, publisher_hits, title_hits,
                        valid_leads, leads_inserted, duplicates, duplicate_rate, personal_email_pct,
                        generic_email_pct, leads_with_name_and_title_pct, relevance_rate,
                        business_page_pct, extraction_confidence_mean, block_count, block_rate,
                        avg_fetch_seconds, redirect_rate, js_render_rate, robots_terms_flag_rate,
                        content_thin_rate, unique_emails_per_100_pages, unique_domains_discovered,
                        duplicate_emails_across_platforms, repeated_contact_hub_emails, score,
                        classification, budget_recommendation, sampled_urls_json, unique_emails_json,
                        raw_metrics_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    result["run_id"],
                    result["source_name"],
                    result["domain"],
                    result["run_timestamp"],
                    result["query_count"],
                    result["pages_tested"],
                    result["pages_fetched"],
                    result["email_hits"],
                    result["author_hits"],
                    result["publisher_hits"],
                    result["title_hits"],
                    result["valid_leads"],
                    result["leads_inserted"],
                    result["duplicates"],
                    result["duplicate_rate"],
                    result["personal_email_pct"],
                    result["generic_email_pct"],
                    result["leads_with_name_and_title_pct"],
                    result["relevance_rate"],
                    result["business_page_pct"],
                    result["extraction_confidence_mean"],
                    result["block_count"],
                    result["block_rate"],
                    result["avg_fetch_seconds"],
                    result["redirect_rate"],
                    result["js_render_rate"],
                    result["robots_terms_flag_rate"],
                    result["content_thin_rate"],
                    result["unique_emails_per_100_pages"],
                    result["unique_domains_discovered"],
                    result["duplicate_emails_across_platforms"],
                    result["repeated_contact_hub_emails"],
                    result["score"],
                    result["classification"],
                    result["budget_recommendation"],
                    json.dumps(result["sampled_urls"]),
                    json.dumps(result["unique_emails"]),
                    json.dumps(result["raw_metrics"])
                ))
                conn.commit()

            append_execution_log(
                "source_probe_saved",
                db_path=self.db_path,
                source_name=result["source_name"],
                domain=result["domain"],
                score=result["score"],
                classification=result["classification"]
            )
            return True
        except sqlite3.Error as exc:
            logger.error(f"Error saving source probe result: {exc}")
            append_execution_log(
                "source_probe_save_failed",
                db_path=self.db_path,
                source_name=result.get("source_name"),
                domain=result.get("domain"),
                error=str(exc)
            )
            return False

    def save_query_probe_result(self, result: dict) -> bool:
        """Stores a probe result for an individual source query."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO query_probe_results (
                        run_id, source_name, domain, query_text, run_timestamp, results_returned,
                        pages_tested, pages_fetched, email_hits, author_hits, title_hits,
                        valid_leads, duplicates, relevance_rate, block_count, avg_fetch_seconds,
                        extraction_confidence_mean, score, classification, budget_recommendation,
                        sampled_urls_json, raw_metrics_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    result["run_id"],
                    result["source_name"],
                    result["domain"],
                    result["query_text"],
                    result["run_timestamp"],
                    result["results_returned"],
                    result["pages_tested"],
                    result["pages_fetched"],
                    result["email_hits"],
                    result["author_hits"],
                    result["title_hits"],
                    result["valid_leads"],
                    result["duplicates"],
                    result["relevance_rate"],
                    result["block_count"],
                    result["avg_fetch_seconds"],
                    result["extraction_confidence_mean"],
                    result["score"],
                    result["classification"],
                    result["budget_recommendation"],
                    json.dumps(result["sampled_urls"]),
                    json.dumps(result["raw_metrics"])
                ))
                conn.commit()

            append_execution_log(
                "query_probe_saved",
                db_path=self.db_path,
                source_name=result["source_name"],
                query_text=result["query_text"],
                score=result["score"]
            )
            return True
        except sqlite3.Error as exc:
            logger.error(f"Error saving query probe result: {exc}")
            append_execution_log(
                "query_probe_save_failed",
                db_path=self.db_path,
                source_name=result.get("source_name"),
                query_text=result.get("query_text"),
                error=str(exc)
            )
            return False

    def get_top_query_profiles(self, limit=5):
        """Returns historically strong queries for focused harvest mode."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT
                        source_name,
                        domain,
                        query_text,
                        COUNT(*) AS run_count,
                        AVG(score) AS avg_score,
                        AVG(relevance_rate) AS avg_relevance_rate,
                        AVG(extraction_confidence_mean) AS avg_confidence,
                        AVG(budget_recommendation) AS avg_budget
                    FROM query_probe_results
                    GROUP BY source_name, domain, query_text
                    HAVING COUNT(*) >= 1
                    ORDER BY avg_score DESC, avg_relevance_rate DESC, avg_confidence DESC
                    LIMIT ?
                """, (limit,))
                rows = cursor.fetchall()

            return [
                {
                    "source_name": row[0],
                    "server_name": row[0],
                    "domain": row[1],
                    "query": row[2],
                    "run_count": row[3],
                    "avg_score": row[4],
                    "avg_relevance_rate": row[5],
                    "avg_confidence": row[6],
                    "budget_recommendation": int(round(row[7] or 0))
                }
                for row in rows
            ]
        except sqlite3.Error as exc:
            logger.error(f"Error retrieving top query profiles: {exc}")
            append_execution_log("top_query_profiles_failed", db_path=self.db_path, error=str(exc))
            return []

    def get_top_sources(self, limit=5):
        """Returns historically strong sources ranked by probe score."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT
                        source_name,
                        domain,
                        COUNT(*) AS run_count,
                        AVG(score) AS avg_score,
                        AVG(relevance_rate) AS avg_relevance_rate,
                        AVG(extraction_confidence_mean) AS avg_confidence,
                        AVG(budget_recommendation) AS avg_budget
                    FROM source_probe_results
                    GROUP BY source_name, domain
                    HAVING COUNT(*) >= 1
                    ORDER BY avg_score DESC, avg_relevance_rate DESC, avg_confidence DESC
                    LIMIT ?
                """, (limit,))
                rows = cursor.fetchall()

            return [
                {
                    "source_name": row[0],
                    "domain": row[1],
                    "run_count": row[2],
                    "avg_score": row[3],
                    "avg_relevance_rate": row[4],
                    "avg_confidence": row[5],
                    "avg_budget": int(round(row[6] or 0))
                }
                for row in rows
            ]
        except sqlite3.Error as exc:
            logger.error(f"Error retrieving top sources: {exc}")
            append_execution_log("top_sources_failed", db_path=self.db_path, error=str(exc))
            return []

    def get_all_leads(self):
        """Retrieves all leads from the database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM leads")
                return cursor.fetchall()
        except sqlite3.Error as exc:
            logger.error(f"Error retrieving leads: {exc}")
            return []

    def update_status(self, email_address, status):
        """Updates the contact status of a lead."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE leads SET contact_status = ? WHERE email_address = ?",
                    (status, email_address)
                )
                conn.commit()
            logger.info(f"Updated status for {email_address} to {status}")
            return True
        except sqlite3.Error as exc:
            logger.error(f"Error updating status: {exc}")
            return False
