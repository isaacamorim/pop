# routes/lookups.py

from flask import Blueprint, jsonify, request
from sqlalchemy import text
from extensions import db

bp_lookups = Blueprint("bp_lookups", __name__, url_prefix="/api/lookups")


@bp_lookups.get("/machines")
def machines():
    result = db.session.execute(
        text(
            """
                SELECT
                    JAQ_CODIGO,
                    JAQ_DESCRI
                FROM J_MAQUINA
                WHERE JAQ_DATA_EXCLUSAO IS NULL
                AND NVL(JAQ_STATUS, 0) = 0
                ORDER BY JAQ_CODIGO
            """
        )
    )

    rows = result.all()  # lista de tuplas (cod, descr)

    return jsonify([{"COD": r[0], "DESCR": r[1]} for r in rows])


@bp_lookups.get("/tasks")
def tasks():
    result = db.session.execute(
        text(
            """
                SELECT
                    JAR_CODIGO,
                    JAR_DESCRI
                FROM J_TAREFAS
                WHERE JAR_DATA_EXCLUSAO IS NULL
                ORDER BY JAR_CODIGO
            """
        )
    )

    rows = result.all()

    return jsonify([{"COD": r[0], "DESCR": r[1]} for r in rows])


@bp_lookups.get("/ops")
def ops():
    """
    Busca operações baseadas no que existe em J_ROTINA.
    Filtros opcionais: COD_PRODUTO, COD_MAQUINA, COD_TAREFA, COD_NP
    """
    cod_produto = request.args.get("cod_produto")
    cod_maquina = request.args.get("cod_maquina")
    cod_tarefa = request.args.get("cod_tarefa")
    cod_np = request.args.get("cod_np")

    sql = """
        SELECT DISTINCT
            JOT_CODCNP   AS COD_NP,
            JOT_PAIPROERP AS COD_PRODUTO,
            JOT_CODSEQ   AS COD_SEQ,
            JOT_TAREFA   AS COD_TAREFA,
            JOT_CODMAQ   AS COD_MAQUINA,
            JOT_HISTOR   AS HISTOR,
            JOT_TMPMAQ   AS TMP_MAQUINA,
            JOT_TMPREP   AS TMP_SETUP,
            JOT_PROHOR   AS PROD_HORA
        FROM J_ROTINA
        WHERE 1=1
    """
    params = {}

    if cod_produto:
        sql += " AND JOT_PAIPROERP = :COD_PRODUTO"
        params["COD_PRODUTO"] = cod_produto
    if cod_maquina:
        sql += " AND JOT_CODMAQ = :COD_MAQUINA"
        params["COD_MAQUINA"] = cod_maquina
    if cod_tarefa:
        sql += " AND JOT_TAREFA = :COD_TAREFA"
        params["COD_TAREFA"] = cod_tarefa
    if cod_np:
        sql += " AND JOT_CODCNP = :COD_NP"
        params["COD_NP"] = cod_np

    sql += " FETCH FIRST 200 ROWS ONLY"

    rows = db.session.execute(text(sql), params).mappings().all()
    return jsonify([dict(r) for r in rows])


from flask import request, jsonify
from sqlalchemy import text


@bp_lookups.get("/nps")
def get_nps():
    q = (request.args.get("q") or "").strip().upper()
    limit = int(request.args.get("limit") or 30)

    sql = """
        SELECT
            JNP_CODIGO    AS COD,
            JNP_DESCRI    AS DESCR,
            JNP_PAIPROERP AS PRODUTO
        FROM SYSALL.J_CADNP
        WHERE JNP_STATUS = 'D'
    """
    params = {}

    if q:
        sql += """
            AND (
                UPPER(JNP_CODIGO) LIKE :q
                OR UPPER(JNP_DESCRI) LIKE :q
                OR UPPER(JNP_PAIPROERP) LIKE :q
            )
        """
        params["q"] = f"%{q}%"

    sql += f" ORDER BY JNP_CODIGO FETCH FIRST {limit} ROWS ONLY"

    rows = db.session.execute(text(sql), params).all()

    return jsonify(
        [
            {
                "COD": r[0],
                "DESCR": r[1],
                "PRODUTO": r[2],
            }
            for r in rows
        ]
    )


@bp_lookups.get("/products")
def get_products():
    q = (request.args.get("q") or "").strip().upper()
    pm_only = (request.args.get("pm_only") or "0") == "1"
    limit = int(request.args.get("limit") or 30)

    sql = """
        SELECT
            JRO_PROERP AS COD,
            JRO_DESCRI AS DESCR,
            JRO_STATUS AS STATUS
        FROM SYSALL.J_PRODUTO
        WHERE 1=1
    """
    params = {}

    if q:
        sql += " AND (UPPER(JRO_PROERP) LIKE :q OR UPPER(JRO_DESCRI) LIKE :q) "
        params["q"] = f"%{q}%"

    if pm_only:
        sql += " AND (JRO_PROERP LIKE 'P%' OR JRO_PROERP LIKE 'M%') "

    sql += f" ORDER BY JRO_PROERP FETCH FIRST {limit} ROWS ONLY"

    rows = db.session.execute(text(sql), params).all()

    return jsonify(
        [
            {
                "COD": r[0],
                "DESCR": r[1],
                "STATUS": r[2],
            }
            for r in rows
        ]
    )
