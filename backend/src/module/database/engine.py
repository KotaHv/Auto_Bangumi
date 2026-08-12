from sqlmodel import create_engine

from module.conf import DATA_PATH

engine = create_engine(DATA_PATH)
