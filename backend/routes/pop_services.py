# routes/pop_services.py

from flask import Blueprint, request, jsonify
from models.pop_link import PopLink
from models.pop_version import PopVersion
from models.pop_template import PopTemplate
from extensions import db

bp_services = Blueprint("bp_services", __name__, url_prefix="/api/services")


@bp_services.get("")
def list_service_pops():
    cod_maquina = request.args.get("cod_maquina")
    link_type = request.args.get("link_type")

    q = (
        db.session.query(PopVersion, PopTemplate)
        .join(PopLink, PopLink.IPL_VERSION_ID == PopVersion.IPV_ID)
        .join(PopTemplate, PopTemplate.IPT_ID == PopVersion.IPV_TEMPLATE_ID)
        .filter(PopVersion.IPV_ACTIVE == True)
        .filter(PopTemplate.IPT_ACTIVE == True)
    )

    if cod_maquina:
        q = q.filter(PopLink.IPL_COD_MAQUINA == cod_maquina)

    if link_type:
        q = q.filter(PopLink.IPL_LINK_TYPE == link_type)

    rows = q.order_by(PopVersion.IPV_ID.desc()).all()

    out = []
    for v, t in rows:
        d = v.to_dict(include_children=False)
        d["TEMPLATE_TITLE"] = t.IPT_TITLE
        d["TEMPLATE_TYPE"] = t.IPT_TYPE
        out.append(d)

    return jsonify(out)


@bp_services.get("/<int:version_id>")
def view_service_pop(version_id: int):
    v = PopVersion.query.get_or_404(version_id)
    return jsonify(v.to_dict(include_children=True))
