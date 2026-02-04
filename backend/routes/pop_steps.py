# backend/routes/pop_steps.py

from flask import Blueprint, request, jsonify, send_from_directory
from extensions import db
from models.pop_step import PopStep
import os

bp_steps = Blueprint("bp_steps", __name__, url_prefix="/api/steps")

UPLOAD_DIR = "uploads/pop_steps"


@bp_steps.post("")
def create_step():
    data = request.get_json(force=True)
    s = PopStep(
        IPS_VERSION_ID=data["VERSION_ID"],
        IPS_SEQ=data["SEQ"],
        IPS_TITLE=data.get("TITLE"),
        IPS_INSTRUCTION=data.get("INSTRUCTION"),
        IPS_REQ_PHOTO=data.get("REQ_PHOTO", False),
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
def delete_step(step_id):
    s = PopStep.query.get_or_404(step_id)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"deleted": True})


# =========================
# 📷 UPLOAD DE IMAGEM
# =========================
@bp_steps.post("/<int:step_id>/image")
def upload_step_image(step_id):
    step = PopStep.query.get_or_404(step_id)

    file = request.files.get("file")
    if not file:
        return jsonify({"error": "Arquivo não enviado"}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        return jsonify({"error": "Formato inválido"}), 400

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    filename = f"step_{step_id}.{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    file.save(path)

    step.IPS_IMAGE_URL = f"/uploads/pop_steps/{filename}"
    db.session.commit()

    return jsonify({"image_url": step.IPS_IMAGE_URL})


# =========================
# 👁 SERVIR IMAGEM
# =========================
@bp_steps.get("/image/<filename>")
def serve_step_image(filename):
    return send_from_directory(UPLOAD_DIR, filename)
