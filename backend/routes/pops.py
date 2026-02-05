# backend/routes/pops.py

from flask import Blueprint, request, jsonify, session
from extensions import db
from models.pop_template import PopTemplate
from models.pop_version import PopVersion
from models.pop_link import PopLink
from models.pop_step import PopStep
from .auth_guard import login_required
from .gravar_log import gravar_log
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from sqlalchemy.orm import Session
import sys

bp = Blueprint("pops", __name__, url_prefix="/api/pops")

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


def _get_next_version_num(template_id):
    row = db.session.execute(
        text(
            """
            SELECT NVL(MAX(IPV_VERSION_NUM), 0) + 1 AS NEXT_VER
            FROM I_POP_VERSION
            WHERE IPV_TEMPLATE_ID = :tid
        """
        ),
        {"tid": template_id},
    ).first()
    return row[0]

@bp.post("/draft")
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
        IPV_STATUS="DRAFT",
        IPV_ACTIVE=0,
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

    gravar_log(t.IPT_ID, "CRIAR", t.IPT_CODE)

    db.session.commit()

    return jsonify({
    "template_id": t.IPT_ID,
    "version_id": v.IPV_ID,
    "link_id": l.IPL_ID,
    "status": "DRAFT",
    }), 201


@bp.patch("/draft/<template_id>")
@login_required
def update_draft(template_id: str):
    data = request.get_json(force=True) or {}

    t = PopTemplate.query.get_or_404(template_id)

    # pega versão DRAFT mais recente
    v = (
        PopVersion.query
        .filter_by(
            IPV_TEMPLATE_ID=t.IPT_ID, 
            IPV_STATUS="DRAFT")
        .order_by(
            PopVersion.IPV_VERSION_NUM.desc())
        .first()
    )

    if not v:
        return jsonify({"error": "Versão ativa não encontrada."}), 404

    l = (
        PopLink.query.filter_by(IPL_VERSION_ID=v.IPV_ID)
        .order_by(PopLink.IPL_ID.desc())
        .first()
    )
    if not l:
        return jsonify({"error": "Link não encontrado."}), 404

    # =========================
    # TEMPLATE
    # =========================
    if "TITLE" in data:
        t.IPT_TITLE = data["TITLE"]

    if "DESCRIPTION" in data:
        t.IPT_DESCRIPTION = data["DESCRIPTION"]

    # =========================
    # LINK_TYPE (ÚNICO LUGAR)
    # =========================
    if "LINK_TYPE" in data:
        new_link_type = (data.get("LINK_TYPE") or "").strip().upper()
        if new_link_type:
            l.IPL_LINK_TYPE = new_link_type
        # se vier vazio → IGNORA (não grava NULL)

    # =========================
    # VERSION
    # =========================
    if "CONTENT" in data:
        v.IPV_CONTENT = data["CONTENT"]

    if "SUMMARY" in data:
        v.IPV_SUMMARY = data["SUMMARY"]

    if "COD_TAREFA" in data:
        v.IPV_COD_TAREFA = data["COD_TAREFA"]

    if "COD_MAQUINA" in data:
        v.IPV_COD_MAQUINA = data["COD_MAQUINA"]

    # =========================
    # LINK (OUTROS CAMPOS)
    # =========================
    for k, attr in [
        ("NP_CODIGO", "IPL_COD_NP"),
        ("PRODUCT_CODE", "IPL_COD_PRODUTO"),
        ("SEQ_COD", "IPL_COD_SEQ"),
        ("COD_TAREFA", "IPL_COD_TAREFA"),
        ("COD_MAQUINA", "IPL_COD_MAQUINA"),
        ("NOTES", "IPL_NOTES"),
    ]:
        if k in data:
            val = data.get(k)
            if val not in ("", None):
                setattr(l, attr, val)

    # =========================
    # STEPS (UPDATE / INSERT / DELETE)
    # =========================
    if "STEPS" in data and isinstance(data["STEPS"], list):

        existing = {
            s.IPS_ID: s for s in PopStep.query.filter_by(IPS_VERSION_ID=v.IPV_ID).all()
        }

        sent_ids = set()

        for i, s in enumerate(data["STEPS"], start=1):

            step_id = s.get("ID")

            # =====================
            # UPDATE
            # =====================
            if step_id and step_id in existing:

                step = existing[step_id]

                step.IPS_SEQ = i
                step.IPS_TITLE = s.get("TITLE")
                step.IPS_INSTRUCTION = s.get("INSTRUCTION")
                step.IPS_REQ_PHOTO = 1 if s.get("REQUIRES_PHOTO") else 0
                step.IPS_REQ_SIGN = 1 if s.get("REQUIRES_SIGNATURE") else 0

                sent_ids.add(step_id)

            # =====================
            # INSERT
            # =====================
            else:

                new_step = PopStep(
                    IPS_VERSION_ID=v.IPV_ID,
                    IPS_SEQ=i,
                    IPS_TITLE=s.get("TITLE"),
                    IPS_INSTRUCTION=s.get("INSTRUCTION"),
                    IPS_REQ_PHOTO=1 if s.get("REQUIRES_PHOTO") else 0,
                    IPS_REQ_SIGN=1 if s.get("REQUIRES_SIGNATURE") else 0,
                    IPS_STATUS="DRAFT",
                )

                db.session.add(new_step)
                db.session.flush()

                s["ID"] = new_step.IPS_ID
                sent_ids.add(new_step.IPS_ID)

        # =====================
        # DELETE REMOVIDOS
        # =====================
        for sid, step in existing.items():
            if sid not in sent_ids:
                db.session.delete(step)

    gravar_log(t.IPT_ID, "EDITAR", f"Versão {v.IPV_VERSION_NUM}")

    db.session.commit()
    # retorna steps com ID
    steps = PopStep.query.filter_by(IPS_VERSION_ID=v.IPV_ID).order_by(PopStep.IPS_SEQ).all()

    return jsonify(
        {
            "ok": True,
            "STATUS": "DRAFT",
            "steps": [
                {
                    "ID": s.IPS_ID,
                    "TITLE": s.IPS_TITLE,
                    "INSTRUCTION": s.IPS_INSTRUCTION,
                    "REQUIRES_PHOTO": bool(s.IPS_REQ_PHOTO),
                    "REQUIRES_SIGNATURE": bool(s.IPS_REQ_SIGN),
                    "IMAGE_URL": getattr(s, "IPS_IMAGE_URL", None),
                }
                for s in steps
            ],
        }
    )


@bp.post("/<template_id>/publish")
@login_required
def publish(template_id: str):
    t = PopTemplate.query.get_or_404(template_id)

    # 1️⃣ pega o último DRAFT
    v = (
        PopVersion.query.filter_by(IPV_TEMPLATE_ID=t.IPT_ID, IPV_STATUS="DRAFT")
        .order_by(PopVersion.IPV_VERSION_NUM.desc())
        .first()
    )
    if not v:
        return jsonify({"error": "Nenhuma versão em rascunho encontrada."}), 404

    # 2️⃣ valida vínculo
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

    # 3️⃣ valida passos
    if PopStep.query.filter_by(IPS_VERSION_ID=v.IPV_ID).count() == 0:
        return jsonify({"error": "Adicione pelo menos 1 passo antes de publicar."}), 400

    # =====================================================
    # 🔥 ARQUIVA E DESATIVA TODAS AS OUTRAS VERSÕES
    # =====================================================
    db.session.execute(
        text(
            """
            UPDATE SYSALL.I_POP_VERSION
            SET IPV_STATUS = 'ARCHIVED',
                IPV_ACTIVE = 0
            WHERE IPV_TEMPLATE_ID = :tid
              AND IPV_ID != :vid
        """
        ),
        {"tid": t.IPT_ID, "vid": v.IPV_ID},
    )

    # =====================================================
    # 🔥 PUBLICA E ATIVA A NOVA VERSÃO
    # =====================================================
    db.session.execute(
        text(
            """
            UPDATE SYSALL.I_POP_VERSION
            SET IPV_STATUS = 'PUBLISHED',
                IPV_ACTIVE = 1
            WHERE IPV_ID = :vid
        """
        ),
        {"vid": v.IPV_ID},
    )

    # 4️⃣ publica steps
    db.session.execute(
        text(
            """
            UPDATE SYSALL.I_POP_STEP
            SET IPS_STATUS = 'PUBLISHED'
            WHERE IPS_VERSION_ID = :vid
        """
        ),
        {"vid": v.IPV_ID},
    )

    # 5️⃣ publica template
    db.session.execute(
        text(
            """
            UPDATE SYSALL.I_POP_TEMPLATE
            SET IPT_STATUS = 'PUBLISHED',
                IPT_ACTIVE = 1
            WHERE IPT_ID = :tid
        """
        ),
        {"tid": t.IPT_ID},
    )

    # 6️⃣ publica link (se existir)
    if l and hasattr(l, "IPL_STATUS"):
        db.session.execute(
            text(
                """
                UPDATE SYSALL.I_POP_LINK
                SET IPL_STATUS = 'PUBLISHED'
                WHERE IPL_ID = :lid
            """
            ),
            {"lid": l.IPL_ID},
        )

    gravar_log(t.IPT_ID, "PUBLICAR", t.IPT_CODE)

    db.session.commit()

    return jsonify(
        {
            "ok": True,
            "template_id": t.IPT_ID,
            "version_id": v.IPV_ID,
            "version_num": v.IPV_VERSION_NUM,
            "status": "PUBLISHED",
            "active": True,
        }
    )


@bp.get("/", strict_slashes=False)
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
        AND v.IPV_ID = (
            SELECT v2.IPV_ID
            FROM I_POP_VERSION v2
            WHERE v2.IPV_TEMPLATE_ID = t.IPT_ID
            ORDER BY
                CASE
                    WHEN v2.IPV_ACTIVE = 1 THEN 1
                    ELSE 2
                END,
                v2.IPV_VERSION_NUM DESC
            FETCH FIRST 1 ROW ONLY
        )

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


@bp.get("/<template_id>", strict_slashes=False)
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
                        s.IPS_REQ_SIGN  AS REQUIRES_SIGNATURE,
                        s.IPS_IMAGE_URL AS IMAGE_URL,
                        s.IPS_STEP_TIME AS STEP_TIME
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


@bp.post("/<template_id>/new-version")
@login_required
def create_new_version(template_id: str):
    data = request.get_json(silent=True) or {}
    base_version_id = data.get("base_version_id")

    template = PopTemplate.query.get_or_404(template_id)

    # =====================================================
    # 🔒 GARANTIA: só pode existir 1 DRAFT ATIVO por template
    # =====================================================
    db.session.execute(
        text(
            """
            UPDATE SYSALL.I_POP_VERSION
            SET IPV_STATUS = 'ARCHIVED',
                IPV_ACTIVE = 0
            WHERE IPV_TEMPLATE_ID = :tid
              AND IPV_STATUS = 'DRAFT'
              AND IPV_ACTIVE = 1
        """
        ),
        {"tid": template.IPT_ID},
    )

    # =====================================================
    # 2️⃣ resolve versão base
    # =====================================================
    if base_version_id:
        base_version = PopVersion.query.filter_by(
            IPV_ID=base_version_id, IPV_TEMPLATE_ID=template.IPT_ID
        ).first()
        if not base_version:
            return jsonify({"error": "Versão base inválida."}), 400
    else:
        base_version = (
            PopVersion.query.filter_by(
                IPV_TEMPLATE_ID=template.IPT_ID, IPV_STATUS="PUBLISHED", IPV_ACTIVE=1
            )
            .order_by(PopVersion.IPV_VERSION_NUM.desc())
            .first()
        )

    if not base_version:
        return jsonify({"error": "Versão base não encontrada."}), 404

    # =====================================================
    # 3️⃣ calcula próximo número de versão
    # =====================================================
    next_version_num = _get_next_version_num(template.IPT_ID)

    # =====================================================
    # 4️⃣ cria nova versão (DRAFT ATIVO)
    # =====================================================
    new_version = PopVersion(
        IPV_TEMPLATE_ID=template.IPT_ID,
        IPV_VERSION_NUM=next_version_num,
        IPV_SUMMARY=f"Nova versão baseada na v{base_version.IPV_VERSION_NUM}",
        IPV_CONTENT=base_version.IPV_CONTENT,
        IPV_COD_TAREFA=base_version.IPV_COD_TAREFA,
        IPV_COD_MAQUINA=base_version.IPV_COD_MAQUINA,
        IPV_IS_STANDARD=base_version.IPV_IS_STANDARD,
        IPV_CREATED_BY=getattr(request, "user_id", None),
        IPV_STATUS="DRAFT",
        IPV_ACTIVE=1,  # 🔥 DRAFT nasce ativo
    )

    db.session.add(new_version)
    db.session.flush()  # gera IPV_ID

    # =====================================================
    # 5️⃣ copia links
    # =====================================================
    for link in PopLink.query.filter_by(IPL_VERSION_ID=base_version.IPV_ID).all():
        db.session.add(
            PopLink(
                IPL_VERSION_ID=new_version.IPV_ID,
                IPL_LINK_TYPE=link.IPL_LINK_TYPE,
                IPL_COD_NP=link.IPL_COD_NP,
                IPL_COD_PRODUTO=link.IPL_COD_PRODUTO,
                IPL_COD_SEQ=link.IPL_COD_SEQ,
                IPL_COD_TAREFA=link.IPL_COD_TAREFA,
                IPL_COD_MAQUINA=link.IPL_COD_MAQUINA,
                IPL_TMP_MAQUINA=link.IPL_TMP_MAQUINA,
                IPL_TMP_SETUP=link.IPL_TMP_SETUP,
                IPL_PROD_HORA=link.IPL_PROD_HORA,
                IPL_NOTES=link.IPL_NOTES,
            )
        )

    # =====================================================
    # 6️⃣ copia steps
    # =====================================================
    for step in PopStep.query.filter_by(IPS_VERSION_ID=base_version.IPV_ID).all():
        db.session.add(
            PopStep(
                IPS_VERSION_ID=new_version.IPV_ID,
                IPS_SEQ=step.IPS_SEQ,
                IPS_TITLE=step.IPS_TITLE,
                IPS_INSTRUCTION=step.IPS_INSTRUCTION,
                IPS_REQ_PHOTO=step.IPS_REQ_PHOTO,
                IPS_REQ_SIGN=step.IPS_REQ_SIGN,
                IPS_STATUS="DRAFT",
            )
        )

    db.session.commit()

    gravar_log(template.IPT_ID, "NOVA_VERSAO", f"Base v{base_version.IPV_VERSION_NUM}")

    return (
        jsonify(
            {
                "template_id": template.IPT_ID,
                "base_version_id": base_version.IPV_ID,
                "new_version_id": new_version.IPV_ID,
                "version_num": new_version.IPV_VERSION_NUM,
                "status": "DRAFT",
                "active": True,
            }
        ),
        201,
    )


@bp.get("/<template_id>/versions/<version_id>")
@login_required
def get_pop_version(template_id, version_id):

    if not version_id.isdigit():
        return jsonify({"error": "Version ID inválido"}), 400

    sql = """
        SELECT
            t.IPT_ID AS TEMPLATE_ID,
            t.IPT_CODE AS CODE,
            t.IPT_TITLE AS TITLE,
            NVL(t.IPT_STATUS,'DRAFT') AS STATUS,

            v.IPV_ID AS VERSION_ID,
            v.IPV_VERSION_NUM AS VERSION_NUM,
            v.IPV_CONTENT AS CONTENT,
            v.IPV_STATUS AS VERSION_STATUS,
            v.IPV_ACTIVE AS ACTIVE,

            l.IPL_LINK_TYPE AS LINK_TYPE,
            l.IPL_COD_MAQUINA AS COD_MAQUINA,
            l.IPL_COD_TAREFA AS COD_TAREFA,
            l.IPL_COD_NP AS NP_CODIGO,
            l.IPL_COD_SEQ AS SEQ_COD,
            l.IPL_COD_PRODUTO AS PRODUCT_CODE,
            l.IPL_NOTES AS NOTES

        FROM I_POP_TEMPLATE t
        JOIN I_POP_VERSION v
          ON v.IPV_TEMPLATE_ID = t.IPT_ID
        LEFT JOIN I_POP_LINK l
          ON l.IPL_VERSION_ID = v.IPV_ID

        WHERE v.IPV_ID = :vid
        AND v.IPV_TEMPLATE_ID = :tid

    """

    row = (
        db.session.execute(text(sql), {"tid": template_id, "vid": version_id})
        .mappings()
        .first()
    )

    if not row:
        return jsonify({"error": "Versão não encontrada"}), 404

    # ========================
    # BUSCA STEPS
    # ========================
    steps = (
        db.session.execute(
            text(
                """
            SELECT
                IPS_ID AS ID,
                IPS_SEQ AS SEQ,
                IPS_TITLE AS TITLE,
                IPS_INSTRUCTION AS INSTRUCTION,
                IPS_REQ_PHOTO AS REQUIRES_PHOTO,
                IPS_REQ_SIGN AS REQUIRES_SIGNATURE,
                IPS_IMAGE_URL AS IMAGE_URL,
                IPS_STEP_TIME AS STEP_TIME
            FROM I_POP_STEP
            WHERE IPS_VERSION_ID = :vid
            ORDER BY IPS_SEQ
        """
            ),
            {"vid": version_id},
        )
        .mappings()
        .all()
    )

    data = dict(row)
    data["steps"] = [dict(s) for s in steps]

    return jsonify(data)


# ============================================
# 🔎 BUSCAR DRAFT ATIVO
# ============================================
@bp.get("/<template_id>/draft")
@login_required
def get_active_draft(template_id):

    row = db.session.execute(
        text(
            """
            SELECT
                IPV_ID,
                IPV_VERSION_NUM
            FROM I_POP_VERSION
            WHERE IPV_TEMPLATE_ID = :tid
              AND IPV_STATUS = 'DRAFT'
              AND IPV_ACTIVE = 1
        """
        ),
        {"tid": template_id},
    ).first()

    if not row:
        return jsonify({"exists": False})

    return jsonify({"exists": True, "version_id": row[0], "version_num": row[1]})