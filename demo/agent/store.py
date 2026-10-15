"""QdrantStore with a working list call.

The core QdrantStore lists memories by running a vector search with an empty query
vector, which Qdrant rejects. This lists them with a filtered scroll instead.
"""

from typing import Any

from tenxgraph.storage.store import QdrantStore
from tenxgraph.storage.store.store_schema import MemorySearchResult


class DemoQdrantStore(QdrantStore):
    async def aget_all(
        self, config: dict[str, Any], limit: int = 100, **kwargs: Any
    ) -> list[MemorySearchResult]:
        user_id, _, collection = self._extract_config_values(config)
        await self._ensure_collection_exists(collection)
        points, _next = await self.client.scroll(
            collection_name=collection,
            scroll_filter=self._build_qdrant_filter(user_id=self._scope_user_id(config, user_id)),
            limit=limit,
            with_payload=True,
        )
        return [self._point_to_search_result(point) for point in points]
