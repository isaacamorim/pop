# routes/pop_versions.py

from flask import Blueprint, request, jsonify
from extensions import db
from models.pop_version import PopVersion

bp_versions = Blueprint("bp_versions", __name__, url_prefix="/api/versions")


@bp_versions.post("")
def create_version():
    data = request.get_json(force=True) or {}

    # SUMMARY (NOT NULL) — aceita SUMMARY ou summary
    summary = (data.get("SUMMARY") or data.get("summary") or "").strip()
    if not summary:
        summary = "Sem resumo"

    v = PopVersion(
        IPV_TEMPLATE_ID=data["TEMPLATE_ID"],
        IPV_VERSION_NUM=data["VERSION_NUM"],
        IPV_SUMMARY=summary,
        IPV_CONTENT=data.get("CONTENT"),
        IPV_COD_TAREFA=data.get("COD_TAREFA"),
        IPV_COD_MAQUINA=data.get("COD_MAQUINA"),
        IPV_IS_STANDARD=data.get("IS_STANDARD", True),
        IPV_CREATED_BY=data.get("CREATED_BY"),
        IPV_ACTIVE=data.get("ACTIVE", True),
        IPV_STATUS=data.get("STATUS", "DRAFT"),
        # IPV_BASE_VERSION_ID=db.Column(db.BigInteger, db.ForeignKey("I_POP_VERSION.IPV_ID"), nullable=True),
    )

    db.session.add(v)
    db.session.commit()
    return jsonify(v.to_dict()), 201


@bp_versions.get("/<int:version_id>")
def get_version(version_id: int):
    v = (
        PopVersion.query.filter(PopVersion.IPV_ID == version_id)
        .filter(PopVersion.IPV_STATUS.in_(["DRAFT", "PUBLISHED"]))
        .first_or_404()
    )
    include = request.args.get("include_children", "0") == "1"
    return jsonify(v.to_dict(include_children=include))


@bp_versions.patch("/<int:version_id>")
def update_version(version_id: int):
    v = PopVersion.query.get_or_404(version_id)

    if v.IPV_STATUS == "PUBLISHED":
        return jsonify({"error": "Versão publicada não pode ser editada"}), 400

    data = request.get_json(force=True) or {}

    for field, col in [
        ("SUMMARY", "IPV_SUMMARY"),
        ("CONTENT", "IPV_CONTENT"),
        ("COD_TAREFA", "IPV_COD_TAREFA"),
        ("COD_MAQUINA", "IPV_COD_MAQUINA"),
        ("IS_STANDARD", "IPV_IS_STANDARD"),
        ("ACTIVE", "IPV_ACTIVE"),
    ]:
        if field in data:
            setattr(v, col, data[field])

    db.session.commit()
    return jsonify(v.to_dict())


@bp_versions.get("")
def list_versions():
    template_id = request.args.get("template_id", type=int)
    q = PopVersion.query.filter(PopVersion.IPV_STATUS.in_(["DRAFT", "PUBLISHED"]))
    if template_id:
        q = q.filter(PopVersion.IPV_TEMPLATE_ID == template_id)
    versions = q.order_by(PopVersion.IPV_ID.desc()).all()
    return jsonify([v.to_dict() for v in versions])
