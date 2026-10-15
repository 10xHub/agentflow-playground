"""Create the Postgres checkpointer tables. Run once after `docker compose up -d`."""

import asyncio

from graph import checkpointer


asyncio.run(checkpointer.asetup())
print("checkpointer schema ready")
