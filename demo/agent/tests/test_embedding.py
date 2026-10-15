import math

from embedding import HashingEmbedding


def cosine(a, b):
    return sum(x * y for x, y in zip(a, b, strict=True))


async def test_vectors_have_the_declared_dimension_and_unit_length():
    emb = HashingEmbedding()
    vector = await emb.aembed("Maya prefers email")
    assert len(vector) == emb.dimension
    assert math.isclose(sum(x * x for x in vector), 1.0, rel_tol=1e-6)


async def test_related_text_scores_higher_than_unrelated_text():
    emb = HashingEmbedding()
    memory, related, unrelated = await emb.aembed_batch(
        ["Maya Chen (c_88) prefers email over phone.", "c_88 contact preference email", "pour-over set"]
    )
    assert cosine(memory, related) > cosine(memory, unrelated)


async def test_same_text_gives_the_same_vector():
    emb = HashingEmbedding()
    assert await emb.aembed("order 1042") == await emb.aembed("order 1042")
