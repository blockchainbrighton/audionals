import re
from utils import compact_text


class ClassifierModule:
    """Cheap relevance filter used before committing to a lead extraction result."""

    def __init__(self):
        self.intent_keywords = {
            "author", "book", "fiction", "imprint", "novel", "publisher",
            "publishing", "story", "writer"
        }
        self.business_keywords = {
            "agency", "books", "imprint", "press", "publisher",
            "publishing", "rights", "submissions"
        }
        self.title_pattern = re.compile(r"\b(author|book|novel|publisher|imprint|press)\b", re.IGNORECASE)
        self.contact_pattern = re.compile(r"\b(contact|email|mailto)\b", re.IGNORECASE)
        self.schema_markers = {
            "Person": "schema.org/Person",
            "Book": "schema.org/Book",
            "Organization": "schema.org/Organization",
        }

    def classify_page(self, response_text: str, soup, text_content: str, page_title: str, emails=None) -> dict:
        """Returns lightweight relevance signals for probe and harvest decisions."""
        emails = emails or []
        page_blob = f"{page_title} {compact_text(text_content, max_chars=1000)}"
        page_blob_lower = page_blob.lower()

        keyword_hits = [keyword for keyword in self.intent_keywords if keyword in page_blob_lower]
        contact_signal = bool(emails) or bool(self.contact_pattern.search(page_blob)) or "mailto:" in response_text.lower()
        title_signal = bool(self.title_pattern.search(page_title))
        schema_hits = [name for name, marker in self.schema_markers.items() if marker.lower() in response_text.lower()]
        business_signal = any(keyword in page_blob_lower for keyword in self.business_keywords) or "Organization" in schema_hits

        relevance_score = 0
        relevance_score += min(len(keyword_hits), 4) * 15
        relevance_score += 15 if contact_signal else 0
        relevance_score += 15 if title_signal else 0
        relevance_score += min(len(schema_hits), 2) * 10
        relevance_score += 10 if business_signal else 0

        return {
            "keyword_hits": keyword_hits,
            "contact_signal": contact_signal,
            "title_signal": title_signal,
            "schema_hits": schema_hits,
            "business_signal": business_signal,
            "relevance_score": relevance_score,
            "is_relevant": relevance_score >= 35,
        }
