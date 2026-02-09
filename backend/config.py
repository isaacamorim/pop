# backend/config.py

import os
from urllib.parse import quote_plus


class Config:
    DB_USER = os.getenv("DB_USER", "")
    DB_PASS = os.getenv("DB_PASS", "")
    DB_HOST = os.getenv("DB_HOST", "")
    DB_PORT = os.getenv("DB_PORT", "")
    DB_SERVICE = os.getenv("DB_SERVICE", "ORCL")

    EMPRESA_PADRAO = os.getenv("EMPRESA_PADRAO", "1")

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"

    # IMPORTANTE: escapar senha
    _PW = quote_plus(DB_PASS)

    SQLALCHEMY_DATABASE_URI = f"oracle+oracledb://{DB_USER}:{_PW}@{DB_HOST}:{DB_PORT}/?service_name={DB_SERVICE}"
