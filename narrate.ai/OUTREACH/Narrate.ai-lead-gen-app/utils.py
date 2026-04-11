import json
import time
import random
import logging
import sys
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("lead_gen.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

EXECUTION_LOG_PATH = "execution_log.jsonl"
EXECUTION_RUN_ID = None

# List of modern browser User-Agents
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/118.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/119.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
]

def get_random_user_agent() -> str:
    """Returns a random modern User-Agent string."""
    return random.choice(USER_AGENTS)

def set_execution_log_path(path: str):
    """Sets the path for the structured execution log."""
    global EXECUTION_LOG_PATH
    EXECUTION_LOG_PATH = path

def set_execution_run_id(run_id: str):
    """Sets the current run identifier for structured execution events."""
    global EXECUTION_RUN_ID
    EXECUTION_RUN_ID = run_id

def compact_text(text: str, max_chars: int = 200) -> str:
    """Collapses whitespace and truncates text for compact logging."""
    collapsed = " ".join(text.split())
    if len(collapsed) <= max_chars:
        return collapsed
    return f"{collapsed[:max_chars - 3]}..."

def append_execution_log(event_type: str, **data):
    """Appends a JSONL record describing a meaningful execution event."""
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "run_id": EXECUTION_RUN_ID,
        "event": event_type
    }
    record.update(data)

    try:
        with open(EXECUTION_LOG_PATH, "a", encoding="utf-8") as log_file:
            log_file.write(json.dumps(record, ensure_ascii=True) + "\n")
    except Exception as exc:
        logger.warning(f"Failed to write execution log event '{event_type}': {exc}")

def humanized_delay(min_sec: int = 10, max_sec: int = 45):
    """Implements a randomized time delay between search queries or page visits."""
    delay = random.uniform(min_sec, max_sec)
    logger.info(f"Sleeping for {delay:.2f} seconds to mimic human behavior...")
    time.sleep(delay)

def handle_backoff(error_code: int, request_context=None):
    """
    Handles 429 (Too Many Requests) or 403 (Forbidden) errors with a 15-minute pause.
    """
    context = request_context.copy() if request_context else {}
    if error_code in [429, 403]:
        wait_time = 15 * 60  # 15 minutes in seconds
        append_execution_log(
            "request_backoff_started",
            error_code=error_code,
            wait_seconds=wait_time,
            **context
        )
        logger.warning(f"Encountered error {error_code}. Pausing operations for 15 minutes to avoid IP ban.")
        time.sleep(wait_time)
        logger.info("Resuming operations after backoff period.")
        append_execution_log(
            "request_backoff_completed",
            error_code=error_code,
            wait_seconds=wait_time,
            **context
        )
    else:
        append_execution_log(
            "request_backoff_unhandled_error",
            error_code=error_code,
            **context
        )
        logger.error(f"Encountered unhandled error {error_code}. Gracefully shutting down.")
        sys.exit(1)

def safe_request(
    url: str,
    session,
    headers=None,
    request_context=None,
    attempt: int = 1,
    return_meta: bool = False,
    backoff_on_block: bool = True,
    accepted_status_codes=None
):
    """
    Wraps a request with error handling and user-agent rotation.
    """
    if headers is None:
        headers = {}

    headers['User-Agent'] = get_random_user_agent()
    context = request_context.copy() if request_context else {}
    accepted_status_codes = set(accepted_status_codes or {200})
    request_meta = {
        "url": url,
        "final_url": url,
        "status_code": None,
        "elapsed_ms": None,
        "response_bytes": 0,
        "redirected": False,
        "attempt": attempt,
        "error": None
    }

    append_execution_log(
        "request_started",
        url=url,
        attempt=attempt,
        user_agent=headers['User-Agent'],
        **context
    )

    try:
        started_at = time.time()
        response = session.get(url, headers=headers, timeout=30)
        elapsed_ms = round((time.time() - started_at) * 1000, 2)
        request_meta.update({
            "final_url": response.url,
            "status_code": response.status_code,
            "elapsed_ms": elapsed_ms,
            "response_bytes": len(response.content),
            "redirected": bool(response.history) or response.url.rstrip("/") != url.rstrip("/")
        })
        if response.status_code in accepted_status_codes:
            event_name = "request_succeeded"
            if response.status_code != 200:
                event_name = "request_accepted_nonstandard_status"
            append_execution_log(
                event_name,
                url=url,
                final_url=response.url,
                status_code=response.status_code,
                elapsed_ms=elapsed_ms,
                response_bytes=len(response.content),
                attempt=attempt,
                **context
            )
            return (response, request_meta) if return_meta else response
        elif response.status_code in [429, 403]:
            append_execution_log(
                "request_rate_limited",
                url=url,
                final_url=response.url,
                status_code=response.status_code,
                elapsed_ms=elapsed_ms,
                attempt=attempt,
                **context
            )
            if not backoff_on_block:
                append_execution_log(
                    "request_blocked_no_backoff",
                    url=url,
                    final_url=response.url,
                    status_code=response.status_code,
                    elapsed_ms=elapsed_ms,
                    attempt=attempt,
                    **context
                )
                logger.warning(
                    f"Request to {url} was blocked with status {response.status_code}; "
                    "returning control to caller without backoff."
                )
                return (None, request_meta) if return_meta else None
            handle_backoff(response.status_code, request_context={"url": url, "attempt": attempt, **context})
            # Retry once after backoff
            append_execution_log(
                "request_retry_scheduled",
                url=url,
                next_attempt=attempt + 1,
                **context
            )
            return safe_request(
                url,
                session,
                headers,
                request_context=context,
                attempt=attempt + 1,
                return_meta=return_meta
            )
        else:
            append_execution_log(
                "request_failed",
                url=url,
                final_url=response.url,
                status_code=response.status_code,
                elapsed_ms=elapsed_ms,
                attempt=attempt,
                **context
            )
            logger.error(f"Request to {url} failed with status code {response.status_code}")
            return (None, request_meta) if return_meta else None
    except Exception as e:
        request_meta["error"] = str(e)
        append_execution_log(
            "request_exception",
            url=url,
            error=str(e),
            attempt=attempt,
            **context
        )
        logger.error(f"An error occurred while requesting {url}: {str(e)}")
        return (None, request_meta) if return_meta else None
