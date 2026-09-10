"""Remember which embedding model built the Qdrant collection.

Vectors from two different embedding models are not comparable, and a different
model almost always means a different vector size. So after changing
EMBEDDING_PROVIDER or EMBEDDING_MODEL in .env you must rebuild the collection
with `python ingest.py --recreate`.

This module writes a tiny JSON file next to the project (git-ignored) recording
the provider / model / dimension used for the last ingest, and checks it on the
next run so the mistake is caught with a clear message instead of a confusing
dimension error deep inside Qdrant.
"""

import json
from pathlib import Path
from typing import Optional

import config

META_PATH: Path = config.BASE_DIR / ".rag_index_meta.json"


def _current() -> dict:
    return {
        "provider": config.EMBEDDING_PROVIDER,
        "model": config.EMBEDDING_MODEL,
        "collection": config.COLLECTION_NAME,
    }


def load() -> Optional[dict]:
    if not META_PATH.exists():
        return None
    try:
        return json.loads(META_PATH.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return None


def save(dimension: int) -> None:
    data = _current()
    data["dimension"] = dimension
    META_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _mismatch(saved: dict) -> Optional[str]:
    now = _current()
    if saved.get("collection") != now["collection"]:
        return None  # a different collection - not what this meta describes
    if (saved.get("provider"), saved.get("model")) != (now["provider"], now["model"]):
        return (
            f"the '{now['collection']}' collection was built with "
            f"{saved.get('provider')}/{saved.get('model')}, but .env now says "
            f"{now['provider']}/{now['model']}"
        )
    return None


def check_before_ingest(recreate: bool) -> None:
    """ingest.py: block an append that would mix two models in one collection."""
    saved = load()
    if saved is None or recreate:
        return
    problem = _mismatch(saved)
    if problem:
        raise RuntimeError(
            f"Embedding model changed - {problem}.\n"
            "Re-run with --recreate to rebuild the collection with the new model:\n"
            "    python ingest.py --recreate"
        )


def check_before_query() -> None:
    """ask.py / main.py: stop if the stored index and .env disagree."""
    saved = load()
    if saved is None:
        return
    problem = _mismatch(saved)
    if problem:
        raise RuntimeError(
            f"Embedding model changed - {problem}.\n"
            "Re-index with the new model before querying:\n"
            "    python ingest.py --recreate"
        )
