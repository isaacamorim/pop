# backend/routes/pops.py

from flask import Blueprint, request, jsonify
from extensions import db
from models.pop_template import PopTemplate
from models.pop_version import PopVersion
from models.pop_link import PopLink
from models.pop_step import PopStep
from .auth_guard import login_required
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
import sys

bp_pops = Blueprint("bp_pops", __name__, url_prefix="/api/pops")


def keys_lower(d: dict):
    return {(k.lower() if isinstance(k, str) else k): v for k, v in d.items()}


def gen_code(prefix="POP"):
    # ex: POP-20260116075243
    return f"{prefix}-{datetime.now().strftime('%Y%m%d%H%M%S')}"


def _require_link_fields(link_type: str, data: dict):
    lt = (link_type or "").upper()

    def has(k):
        v = data.get(k)
        return v is not None and str(v).strip() != ""

    if lt == "MAQUINA":
        return has("COD_MAQUINA")
    if lt == "TAREFA":
        return has("COD_TAREFA")
    if lt == "NP":
        return has("NP_CODIGO")
    if lt == "PECA":
        return has("PRODUCT_CODE")
    if lt == "PECA_OP":
        ok_prod = has("PRODUCT_CODE")
        ok_np = has("NP_CODIGO") or has("SEQ_COD")
        return ok_prod and ok_np
    if lt == "SERVICO":
        return True  # serviço pode ser só título/descrição
    return False


@bp_pops.post("/draft")
@login_required
def create_draft():
    data = request.get_json(force=True) or {}

    # gera CODE obrigatório (sua tabela I_POP_TEMPLATE exige IPT_CODE NOT NULL)
    code = (data.get("CODE") or "").strip() or gen_code("POP")

    # 1) cria template
    t = PopTemplate(
        IPT_CODE=code,
        IPT_TITLE=(data.get("TITLE") or "Rascunho"),
        IPT_TYPE=(data.get("TYPE") or "POP"),
        IPT_DESCRIPTION=(data.get("DESCRIPTION") or ""),
        IPT_ACTIVE=1,
        IPT_STATUS="DRAFT",
    )
    db.session.add(t)
    db.session.flush()  # pega IPT_ID

    # 2) cria version v1
    v = PopVersion(
        IPV_TEMPLATE_ID=t.IPT_ID,
        IPV_VERSION_NUM=1,  # <-- seu campo correto
        IPV_SUMMARY="Rascunho",
        IPV_CONTENT=(data.get("CONTENT") or ""),
        IPV_COD_TAREFA=data.get("COD_TAREFA"),
        IPV_COD_MAQUINA=data.get("COD_MAQUINA"),
        IPV_IS_STANDARD=1,
        IPV_ACTIVE=1,
        # IPV_STATUS="DRAFT",  # <-- remover (não existe)
    )
    db.session.add(v)
    db.session.flush()  # pega IPV_ID

    # 3) cria link
    l = PopLink(
        IPL_VERSION_ID=v.IPV_ID,
        IPL_LINK_TYPE=(data.get("LINK_TYPE") or "SERVICO").upper(),
        IPL_COD_NP=data.get("NP_CODIGO"),
        IPL_COD_PRODUTO=data.get("PRODUCT_CODE"),
        IPL_COD_SEQ=data.get("SEQ_COD"),
        IPL_COD_TAREFA=data.get("COD_TAREFA"),
        IPL_COD_MAQUINA=data.get("COD_MAQUINA"),
        IPL_NOTES=data.get("NOTES"),
        # IPL_STATUS="DRAFT",  # <-- remover se não existir
    )
    db.session.add(l)
    db.session.flush()  # pega IPL_ID

    db.session.commit()

    return jsonify({
    "template_id": t.IPT_ID,
    "version_id": v.IPV_ID,
    "link_id": l.IPL_ID,
    "status": "DRAFT",
    }), 201


@bp_pops.patch("/draft/<template_id>")
@login_required
def update_draft(template_id: str):
    data = request.get_json(force=True) or {}

    t = PopTemplate.query.get_or_404(template_id)

    if hasattr(t, "IPT_STATUS") and (t.IPT_STATUS or "").upper() != "DRAFT":
        return jsonify({"error": "POP já publicado. Crie nova versão."}), 409

    # pega versão ativa do rascunho
    v = PopVersion.query.filter_by(IPV_TEMPLATE_ID=t.IPT_ID, IPV_ACTIVE=1).first()
    if not v:
        return jsonify({"error": "Versão ativa não encontrada."}), 404

    l = (
        PopLink.query.filter_by(IPL_VERSION_ID=v.IPV_ID)
        .order_by(PopLink.IPL_ID.desc())
        .first()
    )
    if not l:
        return jsonify({"error": "Link não encontrado."}), 404

    # atualiza template
    if "TITLE" in data:
        t.IPT_TITLE = data["TITLE"]
    if "DESCRIPTION" in data:
        t.IPT_DESCRIPTION = data["DESCRIPTION"]
    if "TYPE" in data:
        t.IPT_TYPE = data.get("TYPE") or "POP"

    # atualiza version
    if "CONTENT" in data:
        v.IPV_CONTENT = data["CONTENT"]
    if "SUMMARY" in data:
        v.IPV_SUMMARY = data["SUMMARY"]
    if "COD_TAREFA" in data:
        v.IPV_COD_TAREFA = data["COD_TAREFA"]
    if "COD_MAQUINA" in data:
        v.IPV_COD_MAQUINA = data["COD_MAQUINA"]

    # atualiza link
    if "LINK_TYPE" in data:
        l.IPL_LINK_TYPE = (data["LINK_TYPE"] or "").upper()
    for k, attr in [
        ("NP_CODIGO", "IPL_COD_NP"),
        ("PRODUCT_CODE", "IPL_COD_PRODUTO"),
        ("SEQ_COD", "IPL_COD_SEQ"),
        ("COD_TAREFA", "IPL_COD_TAREFA"),
        ("COD_MAQUINA", "IPL_COD_MAQUINA"),
        ("NOTES", "IPL_NOTES"),
    ]:
        if k in data:
            setattr(l, attr, data[k])

    # steps (substituição simples)
    if "STEPS" in data and isinstance(data["STEPS"], list):
        PopStep.query.filter_by(IPS_VERSION_ID=v.IPV_ID).delete()
        for i, s in enumerate(data["STEPS"], start=1):
            step = PopStep(
                IPS_VERSION_ID=v.IPV_ID,
                IPS_SEQ=i,
                IPS_TITLE=s.get("TITLE"),
                IPS_INSTRUCTION=s.get("INSTRUCTION"),
                IPS_REQ_PHOTO=1 if s.get("REQUIRES_PHOTO") else 0,
                IPS_REQ_SIGN=1 if s.get("REQUIRES_SIGNATURE") else 0,
                IPS_STATUS="DRAFT",
            )
            db.session.add(step)

    db.session.commit()
    return jsonify({"ok": True, "STATUS": "DRAFT"})


@bp_pops.post("/<template_id>/publish")
@login_required
def publish(template_id: str):
    t = PopTemplate.query.get_or_404(template_id)

    if hasattr(t, "IPT_STATUS") and (t.IPT_STATUS or "").upper() != "DRAFT":
        return jsonify({"error": "POP já está publicado."}), 409

    v = PopVersion.query.filter_by(IPV_TEMPLATE_ID=t.IPT_ID, IPV_ACTIVE=1).first()
    if not v:
        return jsonify({"error": "Versão ativa não encontrada."}), 404

    l = (
        PopLink.query.filter_by(IPL_VERSION_ID=v.IPV_ID)
        .order_by(PopLink.IPL_ID.desc())
        .first()
    )

    if not l or not _require_link_fields(
        l.IPL_LINK_TYPE,
        {
            "COD_MAQUINA": l.IPL_COD_MAQUINA,
            "COD_TAREFA": l.IPL_COD_TAREFA,
            "NP_CODIGO": l.IPL_COD_NP,
            "SEQ_COD": l.IPL_COD_SEQ,
            "PRODUCT_CODE": l.IPL_COD_PRODUTO,
        },
    ):
        return jsonify({"error": "Vínculo incompleto para publicação."}), 400

    step_count = PopStep.query.filter_by(IPS_VERSION_ID=v.IPV_ID).count()
    if step_count == 0:
        return jsonify({"error": "Adicione pelo menos 1 passo antes de publicar."}), 400

    # publica steps (se sua tabela tem IPS_STATUS)
    db.session.execute(
        text(
            "UPDATE SYSALL.I_POP_STEP SET IPS_STATUS = 'PUBLISHED' WHERE IPS_VERSION_ID = :vid"
        ),
        {"vid": v.IPV_ID},
    )

    t.IPT_STATUS = "PUBLISHED"
    t.IPT_ACTIVE = 1
    v.IPV_STATUS = "PUBLISHED"
    l.IPL_STATUS = "PUBLISHED"

    db.session.commit()
    return jsonify({"ok": True, "status": "PUBLISHED"})

@bp_pops.get("/", strict_slashes=False)
def list_pops():
    status = (request.args.get("status") or "ALL").upper()
    q = (request.args.get("q") or "").strip()
    link_type = (request.args.get("link_type") or "").upper().strip()

    sql = """
        SELECT
            t.IPT_ID          AS TEMPLATE_ID,
            t.IPT_CODE        AS CODE,
            t.IPT_TITLE       AS TITLE,
            t.IPT_TYPE        AS TYPE,
            t.IPT_DESCRIPTION AS DESCRIPTION,
            t.IPT_ACTIVE      AS ACTIVE,
            NVL(t.IPT_STATUS,'DRAFT') AS STATUS,
            t.IPT_CREATED_AT  AS CREATED_AT,

            v.IPV_ID          AS VERSION_ID,
            v.IPV_VERSION_NUM AS VERSION_NUM,

            l.IPL_ID          AS LINK_ID,
            l.IPL_LINK_TYPE   AS LINK_TYPE,
            l.IPL_COD_MAQUINA  AS COD_MAQUINA,
            l.IPL_COD_TAREFA   AS COD_TAREFA,
            l.IPL_COD_NP       AS NP_CODIGO,
            l.IPL_COD_SEQ      AS SEQ_COD,
            l.IPL_COD_PRODUTO  AS PRODUCT_CODE
        FROM I_POP_TEMPLATE t
        LEFT JOIN I_POP_VERSION v
            ON v.IPV_TEMPLATE_ID = t.IPT_ID
            AND NVL(v.IPV_ACTIVE, 1) = 1
        LEFT JOIN I_POP_LINK l
            ON l.IPL_VERSION_ID = v.IPV_ID
        WHERE 1=1
    """

    params = {}

    if status != "ALL":
        sql += " AND UPPER(NVL(t.IPT_STATUS,'DRAFT')) = :status "
        params["status"] = status
        
    if link_type:
        sql += " AND UPPER(l.IPL_LINK_TYPE) = :link_type "
        params["link_type"] = link_type

    if q:
        sql += """
          AND (
            UPPER(t.IPT_TITLE) LIKE :q OR
            UPPER(t.IPT_CODE)  LIKE :q OR
            UPPER(NVL(l.IPL_COD_MAQUINA,'-')) LIKE :q OR
            UPPER(NVL(l.IPL_COD_TAREFA,'-'))  LIKE :q OR
            UPPER(NVL(l.IPL_COD_NP,'-'))      LIKE :q OR
            UPPER(NVL(l.IPL_COD_PRODUTO,'-')) LIKE :q
          )
        """
        params["q"] = f"%{q.upper()}%"

    sql += " ORDER BY t.IPT_CREATED_AT DESC NULLS LAST, t.IPT_ID DESC "

    rows = db.session.execute(text(sql), params).mappings().all()
    return jsonify([keys_lower(dict(r)) for r in rows])


@bp_pops.get("/<template_id>", strict_slashes=False)
def get_pop(template_id: str):

    sql = """
        SELECT
            t.IPT_ID          AS TEMPLATE_ID,
            t.IPT_CODE        AS CODE,
            t.IPT_TITLE       AS TITLE,
            t.IPT_TYPE        AS TYPE,
            t.IPT_DESCRIPTION AS DESCRIPTION,
            t.IPT_ACTIVE      AS ACTIVE,
            NVL(t.IPT_STATUS,'DRAFT') AS STATUS,
            t.IPT_CREATED_AT  AS CREATED_AT,

            v.IPV_ID          AS VERSION_ID,
            v.IPV_VERSION_NUM AS VERSION_NUM,
            v.IPV_SUMMARY     AS SUMMARY,
            v.IPV_CONTENT     AS CONTENT,

            l.IPL_ID          AS LINK_ID,
            l.IPL_LINK_TYPE   AS LINK_TYPE,
            l.IPL_COD_MAQUINA  AS COD_MAQUINA,
            l.IPL_COD_TAREFA   AS COD_TAREFA,
            l.IPL_COD_NP       AS NP_CODIGO,
            l.IPL_COD_SEQ      AS SEQ_COD,
            l.IPL_COD_PRODUTO  AS PRODUCT_CODE,
            l.IPL_NOTES        AS NOTES
        FROM SYSALL.I_POP_TEMPLATE t
        LEFT JOIN SYSALL.I_POP_VERSION v
            ON v.IPV_TEMPLATE_ID = t.IPT_ID
            AND NVL(v.IPV_ACTIVE, 1) = 1
        LEFT JOIN SYSALL.I_POP_LINK l
            ON l.IPL_VERSION_ID = v.IPV_ID
        WHERE t.IPT_ID = :tid
    """

    row = db.session.execute(text(sql), {"tid": template_id}).mappings().first()
    if not row:
        return jsonify({"error": "POP não encontrado"}), 404

    vid = row.get("VERSION_ID") or row.get("version_id")


    steps_sql = """
        SELECT
            s.IPS_ID AS STEP_ID,
            s.IPS_SEQ AS SEQ,
            s.IPS_TITLE AS TITLE,
            s.IPS_INSTRUCTION AS INSTRUCTION,
            s.IPS_REQ_PHOTO AS REQUIRES_PHOTO,
            s.IPS_REQ_SIGN  AS REQUIRES_SIGNATURE
        FROM SYSALL.I_POP_STEP s
        WHERE s.IPS_VERSION_ID = :vid
        ORDER BY s.IPS_SEQ ASC
    """

    steps = []
    if vid is not None:
        steps = db.session.execute(text(steps_sql), {"vid": vid}).mappings().all()

    data = keys_lower(dict(row))
    data["steps"] = [keys_lower(dict(s)) for s in steps]
    return jsonify(data)
