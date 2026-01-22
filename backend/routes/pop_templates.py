# routes/pop_templates.py

from flask import Blueprint, request, jsonify
from extensions import db
from models.pop_template import PopTemplate
from datetime import datetime

bp_templates = Blueprint("bp_templates", __name__, url_prefix="/api/templates")


@bp_templates.get("")
def list_templates():
    templates = PopTemplate.query.order_by(PopTemplate.IPT_ID.desc()).all()
    return jsonify([t.to_dict() for t in templates])


@bp_templates.post("")
def create_template():
    data = request.get_json(force=True)

    code = (data.get("CODE") or "").strip()
    if not code:
        code = "POP-" + datetime.now().strftime("%Y%m%d%H%M%S")

    t = PopTemplate(
        IPT_CODE=code,  # <-- nunca mais None
        IPT_TITLE=data["TITLE"],
        IPT_TYPE=data["TYPE"],
        IPT_DESCRIPTION=data.get("DESCRIPTION"),
        IPT_DUR_PADRAO=data.get("DUR_PADRAO"),
        IPT_CREATED_BY=data.get("CREATED_BY"),
        IPT_ACTIVE=data.get("ACTIVE", True),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify(t.to_dict()), 201


@bp_templates.get("/<int:template_id>")
def get_template(template_id: int):
    t = PopTemplate.query.get_or_404(template_id)
    return jsonify(t.to_dict())


@bp_templates.patch("/<int:template_id>")
def update_template(template_id: int):
    t = PopTemplate.query.get_or_404(template_id)
    data = request.get_json(force=True)

    for field, col in [
        ("CODE", "IPT_CODE"),
        ("TITLE", "IPT_TITLE"),
        ("TYPE", "IPT_TYPE"),
        ("DESCRIPTION", "IPT_DESCRIPTION"),
        ("DUR_PADRAO", "IPT_DUR_PADRAO"),
        ("ACTIVE", "IPT_ACTIVE"),
    ]:
        if field in data:
            setattr(t, col, data[field])

    db.session.commit()
    return jsonify(t.to_dict())

def create_template(self, data):
    code = (data.get("CODE") or "").strip()
    if not code:
        code = "POP-" + datetime.now().strftime("%Y%m%d%H%M%S")