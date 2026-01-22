# routes/pop_links.py

from flask import Blueprint, request, jsonify
from extensions import db
from models.pop_link import PopLink

bp_links = Blueprint("bp_links", __name__, url_prefix="/api/links")


@bp_links.post("")
def create_link():
    data = request.get_json(force=True)
    l = PopLink(
        IPL_VERSION_ID=data["VERSION_ID"],
        IPL_LINK_TYPE=data["LINK_TYPE"],
        IPL_COD_NP=data.get("COD_NP"),
        IPL_COD_PRODUTO=data.get("COD_PRODUTO"),
        IPL_COD_SEQ=data.get("COD_SEQ"),
        IPL_COD_TAREFA=data.get("COD_TAREFA"),
        IPL_COD_MAQUINA=data.get("COD_MAQUINA"),
        IPL_TMP_MAQUINA=data.get("TMP_MAQUINA"),
        IPL_TMP_SETUP=data.get("TMP_SETUP"),
        IPL_PROD_HORA=data.get("PROD_HORA"),
        IPL_NOTES=data.get("NOTES"),
    )
    db.session.add(l)
    db.session.commit()
    return jsonify(l.to_dict()), 201


@bp_links.get("")
def list_links():
    version_id = request.args.get("version_id", type=int)
    product = request.args.get("cod_produto")
    seq = request.args.get("cod_seq")
    np = request.args.get("cod_np")
    machine = request.args.get("cod_maquina")
    link_type = request.args.get("link_type")

    q = PopLink.query
    if version_id:
        q = q.filter(PopLink.IPL_VERSION_ID == version_id)
    if product:
        q = q.filter(PopLink.IPL_COD_PRODUTO == product)
    if seq:
        q = q.filter(PopLink.IPL_COD_SEQ == seq)
    if np:
        q = q.filter(PopLink.IPL_COD_NP == np)
    if machine:
        q = q.filter(PopLink.IPL_COD_MAQUINA == machine)
    if link_type:
        q = q.filter(PopLink.IPL_LINK_TYPE == link_type)

    items = q.order_by(PopLink.IPL_ID.desc()).all()
    return jsonify([l.to_dict() for l in items])
