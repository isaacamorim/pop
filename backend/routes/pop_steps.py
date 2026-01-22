# routes/pop_steps.py

from flask import Blueprint, request, jsonify
from extensions import db
from models.pop_step import PopStep

bp_steps = Blueprint("bp_steps", __name__, url_prefix="/api/steps")


@bp_steps.post("")
def create_step():
    data = request.get_json(force=True)
    s = PopStep(
        IPS_VERSION_ID=data["VERSION_ID"],
        IPS_SEQ=data["SEQ"],
        IPS_TITLE=data.get("TITLE"),
        IPS_INSTRUCTION=data.get("INSTRUCTION"),
        IPS_REQ_PHOTO=data.get("REQ_PHOTO", False),
        IPS_REQ_SIGN=data.get("REQ_SIGN", False),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@bp_steps.get("")
def list_steps():
    version_id = request.args.get("version_id", type=int)
    q = PopStep.query
    if version_id:
        q = q.filter(PopStep.IPS_VERSION_ID == version_id)
    steps = q.order_by(PopStep.IPS_SEQ.asc()).all()
    return jsonify([s.to_dict() for s in steps])


@bp_steps.delete("/<int:step_id>")
def delete_step(step_id: int):
    s = PopStep.query.get_or_404(step_id)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"deleted": True})
