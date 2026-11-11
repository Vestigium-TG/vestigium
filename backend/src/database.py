import os
from datetime import datetime
from zoneinfo import ZoneInfo

import psycopg2


def connect_db():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def current_timestamp() -> datetime:
    # Columns are TIMESTAMP without time zone: store São Paulo local time as a naive
    # value, otherwise Postgres converts aware datetimes to the server zone (UTC).
    return datetime.now(tz=ZoneInfo("America/Sao_Paulo")).replace(tzinfo=None)
