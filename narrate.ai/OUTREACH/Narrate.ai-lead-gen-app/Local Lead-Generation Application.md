# Narrate.ai Lead Gen: Adaptive Probe + Harvest Architecture

## Objective

Move the app from a static query runner to an adaptive workflow that:

- tests sources cheaply
- scores them
- ranks them
- allocates effort based on observed performance
- stores those results for later runs

## Current Architecture

The current implementation is built around these modules:

1. `source_registry.py`
   Defines structured candidate sources with domains, source types, and multiple queries.

2. `probe_module.py`
   Runs micro-probes against each source, gathers source-level and query-level metrics, and saves them to SQLite.

3. `scoring_module.py`
   Scores sources and queries, assigns labels such as `fertile` or `dud`, and produces a budget recommendation.

4. `classifier_module.py`
   Performs a cheap relevance check based on keywords, contact markers, schema.org hints, and title patterns.

5. `search_module.py`
   Executes Google-first queries, opens a circuit after repeated Google anti-bot responses, falls back to DuckDuckGo HTML and Bing, and parses result pages.

6. `extraction_module.py`
   Analyzes fetched pages, extracts lead signals, assigns confidence scores, follows likely contact/about/homepage links when the first page is relevant but contact-light, and filters low-relevance pages.

7. `storage_module.py`
   Persists saved leads plus source/query probe results in SQLite.

## Runtime Modes

### Probe Mode

Used to cheaply test sources.

What it does:

- runs a small number of queries per source
- samples a small number of pages
- uses broader relevance-first discovery queries instead of requiring direct email matches in the SERP
- records yield, quality, cost, and diversity metrics
- stores the results for future harvests
- skips writing false "dud" outcomes when the search layer is blocked or clearly broken

### Harvest Mode

Used to spend effort on the best historical queries.

What it does:

- loads the strongest query profiles from SQLite
- requests a budget based on learned score
- runs the full extraction path
- saves unique leads into `leads`

### Full Mode

Runs probe first, then harvests using the best current probe results.

## Implemented Metrics

### Yield

- pages tested
- pages fetched
- email hits
- author hits
- publisher hits
- title hits
- valid leads
- leads inserted
- duplicates
- duplicate rate

### Quality

- personal email percentage
- generic email percentage
- leads with both name and title percentage
- relevance rate
- business-page percentage
- extraction confidence mean

### Cost / Friction

- average fetch time
- block count and block rate
- redirect rate
- JS render rate
- robots/terms flag rate
- thin-content rate

### Diversity

- unique emails per 100 pages
- unique domains discovered
- duplicate emails across platforms
- repeated contact-hub emails

## Confidence Model

Lead confidence currently uses:

- `email_confidence`
- `author_confidence`
- `title_confidence`

Combined as:

```python
lead_confidence = 0.4 * email_conf + 0.3 * author_conf + 0.3 * title_conf
```

## Storage

The database now contains:

- `leads`
- `source_probe_results`
- `query_probe_results`

These tables support:

- source ranking
- query ranking
- focused harvest runs
- inspection of what is working vs what is wasting time

## Safety And Rate Control

The app still keeps the conservative safeguards from the original version:

- random delays between requests
- user-agent rotation
- backoff on `403` and `429` for page fetches
- duplicate protection in SQLite

Search requests now fail fast on `403` and `429` so the app can try a fallback backend instead of waiting through the full backoff period before continuing.

If Google trips anti-bot responses early in a run, the circuit breaker stops further Google requests for the rest of that run and relies on fallbacks instead.

## Practical Limitation

The app is still based on HTML fetching rather than browser rendering, so:

- JS-heavy pages may underperform
- Google SERP parsing can break if markup changes
- Google can also return anti-bot or empty shell pages with HTTP `200`
- contact details hidden behind forms or client-side rendering may still be missed, although the extractor now follows a small set of likely contact-path links

## Recommended Workflow

1. Run `probe` mode first and inspect `source_probe_results` and `query_probe_results`.
2. Run `harvest` mode once enough history exists.
3. Use `full` mode when you want the app to probe and then immediately act on the best current results.
