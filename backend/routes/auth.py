# backend/routes/auth.py

from flask import Blueprint, request, jsonify, session
from sqlalchemy import text
from extensions import db

bp_auth = Blueprint("bp_auth", __name__, url_prefix="/api/auth")


@bp_auth.post("/login")
def login():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "Informe usuário e senha."}), 400

    # ⚠️ Ajustar
    # - o correto é comparar: JUS_SENHA == j_cript(upper(senha_digitada))
    sql = text(
        """
        SELECT
            JUS_ID       AS id,
            JUS_NOMECOM  AS nome,
            JUS_NOMEUSU  AS usuario,
            JUS_USRADM   AS adm,
            JUS_EMAIL    AS email,
            JUS_EMPRESA  AS empresa
        FROM SYSALL.J_USERS
        WHERE UPPER(JUS_NOMEUSU) = UPPER(:u)
          AND NVL(JUS_DATA_EXCLUSAO, TO_DATE('2999-12-31','YYYY-MM-DD')) > SYSDATE
          AND JUS_SENHA = j_cript(p_password => UPPER(:p))
    """
    )

    row = db.session.execute(sql, {"u": username, "p": password}).mappings().first()
    if not row:
        return jsonify({"error": "Usuário ou senha inválidos."}), 401

    user = dict(row)

    # sessão (cookie httpOnly)
    session["user"] = {
        "id": user["id"],
        "nome": user["nome"],
        "usuario": user["usuario"],
        "adm": user["adm"],
        "email": user["email"],
        "empresa": user["empresa"],
    }

    return jsonify({"ok": True, "user": session["user"]})


@bp_auth.get("/me")
def me():
    return jsonify({"user": session.get("user")})


@bp_auth.post("/logout")
def logout():
    session.clear()
    session.pop("user", None)
    return jsonify({"ok": True})
