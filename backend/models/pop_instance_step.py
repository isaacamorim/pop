# models/pop_instance_step.py

from extensions import db


class PopInstanceStep(db.Model):
    __tablename__ = "I_POP_INSTANCE_STEP"

    IPRS_ID = db.Column(db.BigInteger, primary_key=True)
    IPRS_INSTANCE_ID = db.Column(
        db.BigInteger,
        db.ForeignKey("I_POP_INSTANCE.IPI_ID", ondelete="CASCADE"),
        nullable=False,
    )
    IPRS_STEP_ID = db.Column(
        db.BigInteger, db.ForeignKey("I_POP_STEP.IPS_ID"), nullable=False
    )

    IPRS_DONE = db.Column(db.Boolean, server_default=db.text("FALSE"))
    IPRS_NOTE = db.Column(db.Text, nullable=True)
    IPRS_PHOTO_PATH = db.Column(db.Text, nullable=True)
    IPRS_RECORDED_AT = db.Column(db.DateTime, server_default=db.func.now())

    INSTANCE = db.relationship("PopInstance", back_populates="STEP_RESULTS")
    STEP = db.relationship("PopStep")

    def to_dict(self):
        return {
            "ID": self.IPRS_ID,
            "INSTANCE_ID": self.IPRS_INSTANCE_ID,
            "STEP_ID": self.IPRS_STEP_ID,
            "DONE": bool(self.IPRS_DONE),
            "NOTE": self.IPRS_NOTE,
            "PHOTO_PATH": self.IPRS_PHOTO_PATH,
            "RECORDED_AT": (
                self.IPRS_RECORDED_AT.isoformat() if self.IPRS_RECORDED_AT else None
            ),
        }
