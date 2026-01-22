# routes/pop_attachments.py

from flask import Blueprint, request, jsonify
from extensions import db
from models.pop_attachment import PopAttachment

bp_attachments = Blueprint("bp_attachments", __name__, url_prefix="/api/attachments")


@bp_attachments.post("")
def create_attachment():
    data = request.get_json(force=True)
    a = PopAttachment(
        IPA_VERSION_ID=data["VERSION_ID"],
        IPA_FILENAME=data.get("FILENAME"),
        IPA_MIME=data.get("MIME"),
        IPA_STORAGE_PATH=data.get("STORAGE_PATH"),
        IPA_UPLOADED_BY=data.get("UPLOADED_BY"),
    )
    db.session.add(a)
    db.session.commit()
    return jsonify(a.to_dict()), 201


@bp_attachments.get("")
def list_attachments():
    version_id = request.args.get("version_id", type=int)
    q = PopAttachment.query
    if version_id:
        q = q.filter(PopAttachment.IPA_VERSION_ID == version_id)
    items = q.order_by(PopAttachment.IPA_ID.desc()).all()
    return jsonify([a.to_dict() for a in items])


@bp_attachments.delete("/<int:attachment_id>")
def delete_attachment(attachment_id: int):
    a = PopAttachment.query.get_or_404(attachment_id)
    db.session.delete(a)
    db.session.commit()
    return jsonify({"deleted": True})
