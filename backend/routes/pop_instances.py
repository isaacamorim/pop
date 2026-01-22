# routes/pop_instances.py

from flask import Blueprint, request, jsonify
from extensions import db
from models.pop_instance import PopInstance
from models.pop_instance_step import PopInstanceStep

bp_instances = Blueprint("bp_instances", __name__, url_prefix="/api/instances")


@bp_instances.post("/start")
def start_instance():
    data = request.get_json(force=True)
    inst = PopInstance(
        IPI_VERSION_ID=data["VERSION_ID"],
        IPI_LINK_ID=data.get("LINK_ID"),
        IPI_OPERATOR_ID=data.get("OPERATOR_ID"),
        IPI_STATUS="STARTED",
        IPI_NOTES=data.get("NOTES"),
    )
    db.session.add(inst)
    db.session.commit()
    return jsonify(inst.to_dict()), 201


@bp_instances.post("/<int:instance_id>/finish")
def finish_instance(instance_id: int):
    inst = PopInstance.query.get_or_404(instance_id)
    data = request.get_json(force=True) if request.data else {}

    inst.IPI_STATUS = data.get("STATUS", "COMPLETED")
    inst.IPI_NOTES = data.get("NOTES", inst.IPI_NOTES)
    inst.IPI_FINISHED_AT = db.func.now()

    db.session.commit()
    return jsonify(inst.to_dict())


@bp_instances.post("/<int:instance_id>/step")
def upsert_instance_step(instance_id: int):
    # Cria/atualiza evidência de um step
    inst = PopInstance.query.get_or_404(instance_id)
    data = request.get_json(force=True)

    step_id = data["STEP_ID"]
    row = PopInstanceStep.query.filter_by(
        IPRS_INSTANCE_ID=inst.IPI_ID, IPRS_STEP_ID=step_id
    ).first()

    if row is None:
        row = PopInstanceStep(IPRS_INSTANCE_ID=inst.IPI_ID, IPRS_STEP_ID=step_id)
        db.session.add(row)

    if "DONE" in data:
        row.IPRS_DONE = data["DONE"]
    if "NOTE" in data:
        row.IPRS_NOTE = data["NOTE"]
    if "PHOTO_PATH" in data:
        row.IPRS_PHOTO_PATH = data["PHOTO_PATH"]

    db.session.commit()
    return jsonify(row.to_dict())
