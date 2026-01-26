# backend/routes/auth_guard.py

from functools import wraps
from flask import session, jsonify


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user"):
            return jsonify({"error": "Não autenticado."}), 401
        return fn(*args, **kwargs)

    return wrapper
