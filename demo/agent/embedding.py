"""A small local embedding so the demo's Qdrant store needs no embedding API.

Words and word prefixes are hashed into a fixed-size vector (the hashing trick) and
normalized, so cosine similarity tracks shared vocabulary. Swap in OpenAIEmbedding or
GoogleEmbedding from tenxgraph.storage.store.embedding for real semantic search.
"""

import hashlib
import math
import re

from tenxgraph.storage.store.embedding.base_embedding import BaseEmbedding


DIMENSION = 256


def _features(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9_]+", text.lower())
    # Prefixes let "prefers" match "preference" and "emails" match "email".
    return words + [w[:5] for w in words if len(w) > 5]


def _vector(text: str) -> list[float]:
    vector = [0.0] * DIMENSION
    for feature in _features(text):
        digest = hashlib.blake2b(feature.encode(), digest_size=8).digest()
        vector[int.from_bytes(digest[:4], "big") % DIMENSION] += 1.0 if digest[4] % 2 else -1.0
    norm = math.sqrt(sum(x * x for x in vector)) or 1.0
    return [x / norm for x in vector]


class HashingEmbedding(BaseEmbedding):
    async def aembed_batch(self, texts: list[str]) -> list[list[float]]:
        return [_vector(text) for text in texts]

    async def aembed(self, text: str) -> list[float]:
        return _vector(text)

    @property
    def dimension(self) -> int:
        return DIMENSION
