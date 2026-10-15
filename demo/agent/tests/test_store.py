from embedding import HashingEmbedding
from store import DemoQdrantStore


async def test_list_returns_stored_memories(tmp_path):
    store = DemoQdrantStore(embedding=HashingEmbedding(), path=str(tmp_path / "q"))
    config = {"user_id": "anonymous"}
    await store.astore(config, "Maya Chen (c_88) prefers email over phone.")

    memories = await store.aget_all(config)

    assert [m.content for m in memories] == ["Maya Chen (c_88) prefers email over phone."]


async def test_list_is_scoped_to_the_user(tmp_path):
    store = DemoQdrantStore(embedding=HashingEmbedding(), path=str(tmp_path / "q"))
    await store.astore({"user_id": "a"}, "memory for a")

    assert await store.aget_all({"user_id": "b"}) == []
