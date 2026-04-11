SOURCES = [
    {
        "name": "linktree_authors",
        "domain": "linktr.ee",
        "type": "author_platform",
        "queries": [
            'site:linktr.ee ("author" OR "writer" OR "novelist")',
            'site:linktr.ee ("books" OR "fiction" OR "contact")',
        ],
    },
    {
        "name": "substack_authors",
        "domain": "substack.com",
        "type": "author_platform",
        "queries": [
            'site:substack.com ("author" OR "novel" OR "fiction")',
            'site:substack.com ("writer" OR "serialized fiction" OR "books")',
        ],
    },
    {
        "name": "wattpad_authors",
        "domain": "wattpad.com",
        "type": "author_platform",
        "queries": [
            'site:wattpad.com ("author" OR "writer" OR "fiction")',
            'site:wattpad.com ("novelist" OR "story" OR "books")',
        ],
    },
    {
        "name": "royalroad_authors",
        "domain": "royalroad.com",
        "type": "author_platform",
        "queries": [
            'site:royalroad.com ("author" OR "fiction" OR "writer")',
            'site:royalroad.com ("novel" OR "story" OR "books")',
        ],
    },
    {
        "name": "wordpress_authors",
        "domain": "wordpress.com",
        "type": "author_platform",
        "queries": [
            'site:wordpress.com ("author" OR "writer" OR "novel")',
            'site:wordpress.com ("books" OR "contact" OR "about") ("author" OR "writer")',
        ],
    },
    {
        "name": "medium_writers",
        "domain": "medium.com",
        "type": "author_platform",
        "queries": [
            'site:medium.com ("writer" OR "author" OR "novel")',
            'site:medium.com ("fiction" OR "books" OR "publishing")',
        ],
    },
    {
        "name": "linkedin_publishers",
        "domain": "linkedin.com",
        "type": "publisher_platform",
        "queries": [
            'site:linkedin.com ("publisher" OR "publishing" OR "imprint")',
            'site:linkedin.com ("small press" OR "independent publisher" OR "book publisher")',
        ],
    },
]


def load_sources() -> list:
    """Returns the registry of candidate sources."""
    return SOURCES


def flatten_source_queries(sources=None, max_queries_per_source=None) -> list:
    """Flattens the source registry into query profiles for search and harvesting."""
    sources = sources or load_sources()
    profiles = []

    for source in sources:
        source_queries = source["queries"][:max_queries_per_source] if max_queries_per_source else source["queries"]
        for query in source_queries:
            profiles.append({
                "source_name": source["name"],
                "server_name": source["name"],
                "domain": source["domain"],
                "source_type": source["type"],
                "query": query,
            })

    return profiles
