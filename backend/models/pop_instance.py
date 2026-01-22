# models/pop_instance.py

from extensions import db


class PopInstance(db.Model):
    __tablename__ = "I_POP_INSTANCE"

    IPI_ID = db.Column(db.BigInteger, primary_key=True)
    IPI_VERSION_ID = db.Column(
        db.BigInteger, db.ForeignKey("I_POP_VERSION.IPV_ID"), nullable=False
    )
    IPI_LINK_ID = db.Column(
        db.BigInteger, db.ForeignKey("I_POP_LINK.IPL_ID"), nullable=True
    )

    IPI_STARTED_AT = db.Column(db.DateTime, server_default=db.func.now())
    IPI_FINISHED_AT = db.Column(db.DateTime, nullable=True)
    IPI_OPERATOR_ID = db.Column(db.Integer, nullable=True)
    IPI_STATUS = db.Column(
        db.String(20), nullable=True
    )  # STARTED/PAUSED/COMPLETED/ABORTED
    IPI_NOTES = db.Column(db.Text, nullable=True)

    VERSION = db.relationship("PopVersion", back_populates="INSTANCES")
    LINK = db.relationship("PopLink", back_populates="INSTANCES")

    STEP_RESULTS = db.relationship(
        "PopInstanceStep",
        back_populates="INSTANCE",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def to_dict(self, include_children=False):
        data = {
            "ID": self.IPI_ID,
            "VERSION_ID": self.IPI_VERSION_ID,
            "LINK_ID": self.IPI_LINK_ID,
            "STARTED_AT": (
                self.IPI_STARTED_AT.isoformat() if self.IPI_STARTED_AT else None
            ),
            "FINISHED_AT": (
                self.IPI_FINISHED_AT.isoformat() if self.IPI_FINISHED_AT else None
            ),
            "OPERATOR_ID": self.IPI_OPERATOR_ID,
            "STATUS": self.IPI_STATUS,
            "NOTES": self.IPI_NOTES,
        }
        if include_children:
            data["STEP_RESULTS"] = [sr.to_dict() for sr in self.STEP_RESULTS]
        return data
