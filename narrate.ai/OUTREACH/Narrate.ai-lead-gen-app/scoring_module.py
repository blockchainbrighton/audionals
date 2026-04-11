def compute_source_score(metrics: dict) -> float:
    """Scores a probed source using lead yield, quality, uniqueness, and friction."""
    pages_tested = max(metrics.get("pages_tested", 0), 1)
    valid_lead_rate = metrics.get("valid_leads", 0) / pages_tested
    email_hit_rate = metrics.get("email_hits", 0) / pages_tested
    completeness = min(metrics.get("author_hits", 0), metrics.get("title_hits", 0)) / pages_tested
    relevance_rate = metrics.get("relevance_rate", 0.0)
    discovery_rate = max(completeness, relevance_rate)
    uniqueness = (metrics.get("valid_leads", 0) - metrics.get("duplicates", 0)) / max(metrics.get("valid_leads", 0), 1)
    block_rate = metrics.get("block_count", 0) / pages_tested
    speed_penalty = min(metrics.get("avg_fetch_seconds", 0.0) / 10.0, 1.0)

    return round(
        (4.0 * valid_lead_rate)
        + (2.0 * email_hit_rate)
        + (1.5 * completeness)
        + (1.25 * discovery_rate)
        + (1.5 * uniqueness)
        - (3.0 * block_rate)
        - (1.0 * speed_penalty),
        4
    )


def compute_query_score(metrics: dict) -> float:
    """Scores an individual query so weak queries can be deprioritized later."""
    pages_tested = max(metrics.get("pages_tested", 0), 1)
    valid_lead_rate = metrics.get("valid_leads", 0) / pages_tested
    email_hit_rate = metrics.get("email_hits", 0) / pages_tested
    completeness = min(metrics.get("author_hits", 0), metrics.get("title_hits", 0)) / pages_tested
    uniqueness = (metrics.get("valid_leads", 0) - metrics.get("duplicates", 0)) / max(metrics.get("valid_leads", 0), 1)
    relevance_rate = metrics.get("relevance_rate", 0.0)
    block_rate = metrics.get("block_count", 0) / pages_tested
    speed_penalty = min(metrics.get("avg_fetch_seconds", 0.0) / 10.0, 1.0)

    return round(
        (4.0 * valid_lead_rate)
        + (2.0 * email_hit_rate)
        + (2.0 * relevance_rate)
        + (1.25 * completeness)
        + (1.5 * uniqueness)
        - (3.0 * block_rate)
        - (1.0 * speed_penalty),
        4
    )


def classify_score(score: float) -> str:
    """Maps a score to a simple descriptive label for ranking and budgeting."""
    if score >= 4.5:
        return "fertile"
    if score >= 2.0:
        return "promising"
    return "dud"


def allocate_budget(score: float) -> int:
    """Converts a score into a harvest budget in URLs."""
    if score >= 4.5:
        return 50
    if score >= 3.0:
        return 15
    if score >= 2.0:
        return 5
    return 0
