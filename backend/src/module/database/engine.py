from sqlalchemy.ext.asyncio import create_async_engine

from module.conf import DATA_PATH

engine = create_async_engine(DATA_PATH)
