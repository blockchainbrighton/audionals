# Narrate.ai Lead Gen App

This app is now an adaptive lead-generation scraper with two layers:

1. `Probe Mode` runs small, cheap tests across candidate sources.
2. `Harvest Mode` spends time on the sources and queries that performed best.

Instead of treating every platform equally, the app now records source-level and query-level performance in SQLite and uses that history to focus later runs.

## Pipeline

The current pipeline is:

1. Load structured sources and queries from [`source_registry.py`](/Users/melophonic/Documents/GitHub/audionals/narrate.ai/OUTREACH/Narrate.ai-lead-gen-app/source_registry.py)
2. Probe each source with a small number of queries and pages
3. Score sources and queries
4. Rank the strongest candidates
5. Harvest the best query profiles
6. Save leads, probe metrics, and execution events for future runs

The search layer now attempts Google first, then falls back to DuckDuckGo HTML and Bing when search looks blocked or unparseable.

## Main Modes

The CLI supports three modes:

- `probe`: run micro-probes only
- `harvest`: skip probing and harvest from the best historical query profiles already stored in SQLite
- `full`: run probe first, then harvest from the best current probe results

`full` is the default.

## Files

- `main.py`: entrypoint and mode orchestration
- `source_registry.py`: structured source definitions and query lists
- `search_module.py`: Google-first search, circuit-breaking fallback, and result parsing
- `probe_module.py`: micro-probes, source/query metrics, and ranking
- `scoring_module.py`: source and query scoring plus harvest budget allocation
- `classifier_module.py`: cheap relevance filter for fetched pages
- `extraction_module.py`: page analysis, confidence scoring, and lead extraction
- `storage_module.py`: SQLite schema, lead storage, and probe result storage
- `utils.py`: logging, delays, user-agent rotation, and safe request handling

## Requirements

- Python 3.8+
- `pip`

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

Run the full adaptive pipeline:

```bash
python3 main.py
```

Run probe mode only:

```bash
python3 main.py --mode probe
```

Run harvest mode only using historical probe results:

```bash
python3 main.py --mode harvest
```

Example with custom settings:

```bash
python3 main.py \
  --mode full \
  --probe-queries 2 \
  --probe-pages 5 \
  --probe-results 3 \
  --harvest-top 5 \
  --db leads.db \
  --exec-log execution_log.jsonl
```

### CLI Flags

- `--mode`: `probe`, `harvest`, or `full`
- `--results`: fallback harvest result count when no learned budget exists
- `--db`: SQLite database path
- `--exec-log`: JSON Lines execution log path
- `--probe-queries`: max queries to test per source in probe mode
- `--probe-pages`: max pages to test per source in probe mode
- `--probe-results`: search results to request per probe query
- `--harvest-top`: number of top query profiles to harvest

## What Probe Mode Measures

Probe mode stores source-level and query-level metrics for later ranking.

### Yield

- `pages_tested`
- `pages_fetched`
- `email_hits`
- `author_hits`
- `publisher_hits`
- `title_hits`
- `valid_leads`
- `leads_inserted`
- `duplicates`
- `duplicate_rate`

### Quality

- `personal_email_pct`
- `generic_email_pct`
- `leads_with_name_and_title_pct`
- `relevance_rate`
- `business_page_pct`
- `extraction_confidence_mean`

### Cost / Friction

- `avg_fetch_seconds`
- `block_count`
- `block_rate`
- `redirect_rate`
- `js_render_rate`
- `robots_terms_flag_rate`
- `content_thin_rate`

### Diversity

- `unique_emails_per_100_pages`
- `unique_domains_discovered`
- `duplicate_emails_across_platforms`
- `repeated_contact_hub_emails`

## Scoring And Budgeting

Source and query scores are calculated in [`scoring_module.py`](/Users/melophonic/Documents/GitHub/audionals/narrate.ai/OUTREACH/Narrate.ai-lead-gen-app/scoring_module.py).

The current scoring model emphasizes:

- valid lead rate
- email hit rate
- discovery strength from author/title relevance
- completeness of extracted leads
- uniqueness
- low block rate
- low fetch cost

The resulting score is mapped to:

- `fertile`
- `promising`
- `dud`

It also produces a recommended harvest budget:

- high score -> `50` URLs
- medium score -> `15` URLs
- low score -> `0`

Queries are only learned from when the search layer is healthy. A blocked or clearly broken SERP is skipped instead of being written into SQLite as a real low-performing source.

## Search Resilience

The search layer now includes:

- a Google circuit breaker so repeated `429` or `/sorry/` responses stop wasting the rest of the run
- DuckDuckGo HTML fallback
- Bing fallback after DuckDuckGo
- zero-yield diagnostics in `execution_log.jsonl`

Probe queries in [`source_registry.py`](/Users/melophonic/Documents/GitHub/audionals/narrate.ai/OUTREACH/Narrate.ai-lead-gen-app/source_registry.py) are now relevance-first instead of requiring a direct email in the SERP query.

## Relevance Classifier

Before a page becomes a saved lead, the classifier checks cheap signals such as:

- author/book/publisher keywords
- email and contact markers
- schema.org markers for `Person`, `Book`, and `Organization`
- title patterns

Low-relevance pages are skipped during harvest.

On author-platform sources, pages with a likely author name plus a likely title are now treated as meaningful discovery hits even if the contact is not on the first page.

## Confidence Scoring

Lead confidence is built from explicit signal confidence:

- email confidence
- author confidence
- title confidence

The extractor also now:

- picks up `mailto:` links directly
- prefers personal-looking emails over generic inboxes when multiple candidates exist
- follows a small set of likely `contact`, `about`, `profile`, or `website` links when a page looks relevant but has no direct email

The current weighting is:

```python
lead_confidence = 0.4 * email_conf + 0.3 * author_conf + 0.3 * title_conf
```

Examples:

- `mailto:` email -> high email confidence
- `meta[name="author"]` -> high author confidence
- `og:title` -> high title confidence

## Storage

The app stores data in SQLite:

- `leads`: saved leads
- `source_probe_results`: aggregate probe metrics per source/domain
- `query_probe_results`: probe metrics per query

Inspect the database:

```bash
sqlite3 leads.db
```

Useful queries:

```sql
.tables
SELECT author_name, book_title, email_address, contact_status FROM leads LIMIT 20;
SELECT source_name, domain, score, classification, budget_recommendation
FROM source_probe_results
ORDER BY score DESC
LIMIT 20;
SELECT source_name, query_text, score, classification
FROM query_probe_results
ORDER BY score DESC
LIMIT 20;
```

## Logs

The app writes two logs:

- `lead_gen.log`: human-readable runtime log
- `execution_log.jsonl`: structured execution log for later analysis

The structured log captures request outcomes, query results, page analysis events, probe summaries, harvest summaries, and run summaries.

It also records zero-yield search diagnostics, backend fallback decisions, and contact-path follow-up attempts.

## Customizing Sources

Edit [`source_registry.py`](/Users/melophonic/Documents/GitHub/audionals/narrate.ai/OUTREACH/Narrate.ai-lead-gen-app/source_registry.py) to add, remove, or change source definitions.

Each source has:

- `name`
- `domain`
- `type`
- `queries`

Example:

```python
{
    "name": "substack_authors",
    "domain": "substack.com",
    "type": "author_platform",
    "queries": [
        'site:substack.com "novel" "@gmail.com"',
        'site:substack.com "author" "contact"',
    ],
}
```

## Operational Notes

- Requests are intentionally slow to reduce blocking risk.
- The app rotates user-agents and backs off for `403` and `429` during page fetches.
- Search requests fail fast on `403` and `429` so the app can try a fallback backend instead of sitting through the full backoff window before probing continues.
- Google HTML changes can break search result parsing.
- Google can also return anti-bot or empty shell pages with HTTP `200`. The app now treats those as search-health problems rather than source-quality signals.
- Some pages still require JavaScript or hide contact details behind anti-bot measures.
- Probe mode inserts sampled valid leads into the same `leads` table, so probe runs are not dry runs.

## Verification

The current codebase has been verified locally with:

```bash
python3 -m py_compile *.py
python3 main.py --help
```

The scraper itself was not run end-to-end here, because that would make live network requests and trigger the built-in delays/backoff logic.

## Responsible Use

Use the app in a way that respects website terms, privacy expectations, and applicable law. This repository now includes source scoring and friction flags, but those signals do not replace your responsibility to use the tool carefully.
