# backend/routes/pops.py

from flask import Blueprint, request, jsonify
from extensions import db
from models.pop_template import PopTemplate
from models.pop_version import PopVersion
from models.pop_link import PopLink
from models.pop_step import PopStep

bp_pops = Blueprint("bp_pops", __name__, url_prefix="/api/pops")


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
def create_draft():
    data = request.get_json(force=True) or {}

    # 1) cria template DRAFT
    t = PopTemplate(
        IPT_CODE=data.get(
            "CODE"
        ),  # se você usa auto-geração, pode deixar None e gerar na rota templates
        IPT_TITLE=data.get("TITLE", "Rascunho"),
        IPT_TYPE=data.get("TYPE", "POP"),  # opcional
        IPT_DESCRIPTION=data.get("DESCRIPTION"),
        IPT_ACTIVE=0,
        IPT_STATUS="DRAFT",
    )
    db.session.add(t)
    db.session.flush()
    db.session.refresh(t)

    # 2) cria version v1 DRAFT
    v = PopVersion(
        IPV_TEMPLATE_ID=t.IPT_ID,
        IPV_VERSION_NUMBER=1,
        IPV_SUMMARY="Rascunho",
        IPV_CONTENT=data.get("CONTENT"),
        IPV_COD_TAREFA=data.get("COD_TAREFA"),
        IPV_COD_MAQUINA=data.get("COD_MAQUINA"),
        IPV_IS_STANDARD=1,
        IPV_ACTIVE=1,
        IPV_STATUS="DRAFT",
    )
    db.session.add(v)
    db.session.flush()
    db.session.refresh(v)

    # 3) cria link DRAFT
    l = PopLink(
        IPL_VERSION_ID=v.IPV_ID,
        IPL_LINK_TYPE=(data.get("LINK_TYPE") or "SERVICO").upper(),
        IPL_NP_CODIGO=data.get("NP_CODIGO"),
        IPL_PRODUCT_CODE=data.get("PRODUCT_CODE"),
        IPL_SEQ_COD=data.get("SEQ_COD"),
        IPL_COD_TAREFA=data.get("COD_TAREFA"),
        IPL_COD_MAQUINA=data.get("COD_MAQUINA"),
        IPL_NOTES=data.get("NOTES"),
        IPL_STATUS="DRAFT",
    )
    db.session.add(l)
    db.session.flush()
    db.session.refresh(l)

    db.session.commit()

    return (
        jsonify(
            {
                "TEMPLATE_ID": t.IPT_ID,
                "VERSION_ID": v.IPV_ID,
                "LINK_ID": l.IPL_ID,
                "STATUS": "DRAFT",
            }
        ),
        201,
    )


@bp_pops.patch("/draft/<template_id>")
def update_draft(template_id: str):
    data = request.get_json(force=True) or {}

    t = PopTemplate.query.get_or_404(template_id)

    if (t.IPT_STATUS or "").upper() != "DRAFT":
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
        t.IPT_TYPE = data["TYPE"]

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
        ("NP_CODIGO", "IPL_NP_CODIGO"),
        ("PRODUCT_CODE", "IPL_PRODUCT_CODE"),
        ("SEQ_COD", "IPL_SEQ_COD"),
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
                IPS_REQUIRES_PHOTO=1 if s.get("REQUIRES_PHOTO") else 0,
                IPS_REQUIRES_SIGNATURE=1 if s.get("REQUIRES_SIGNATURE") else 0,
                IPS_STATUS="DRAFT",
            )
            db.session.add(step)

    db.session.commit()
    return jsonify({"ok": True, "STATUS": "DRAFT"})


@bp_pops.post("/<template_id>/publish")
def publish(template_id: str):
    t = PopTemplate.query.get_or_404(template_id)

    if (t.IPT_STATUS or "").upper() != "DRAFT":
        return jsonify({"error": "POP já está publicado."}), 409

    v = PopVersion.query.filter_by(IPV_TEMPLATE_ID=t.IPT_ID, IPV_ACTIVE=1).first()
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
            "NP_CODIGO": l.IPL_NP_CODIGO,
            "SEQ_COD": l.IPL_SEQ_COD,
            "PRODUCT_CODE": l.IPL_PRODUCT_CODE,
        },
    ):
        return jsonify({"error": "Vínculo incompleto para publicação."}), 400

    # opcional: exigir ao menos 1 step
    step_count = PopStep.query.filter_by(IPS_VERSION_ID=v.IPV_ID).count()
    if step_count == 0:
        return jsonify({"error": "Adicione pelo menos 1 passo antes de publicar."}), 400

    t.IPT_STATUS = "PUBLISHED"
    t.IPT_ACTIVE = 1
    v.IPV_STATUS = "PUBLISHED"
    l.IPL_STATUS = "PUBLISHED"

    db.session.commit()
    return jsonify({"ok": True, "STATUS": "PUBLISHED"})
