# models/pop_step.py

from extensions import db


class PopStep(db.Model):
    __tablename__ = "I_POP_STEP"

    IPS_ID = db.Column(db.BigInteger, primary_key=True)
    IPS_VERSION_ID = db.Column(
        db.BigInteger,
        db.ForeignKey("I_POP_VERSION.IPV_ID", ondelete="CASCADE"),
        nullable=False,
    )
    IPS_SEQ = db.Column(db.Integer, nullable=False)
    IPS_TITLE = db.Column(db.Text, nullable=True)
    IPS_INSTRUCTION = db.Column(db.Text, nullable=True)
    IPS_REQ_PHOTO = db.Column(db.Boolean, server_default=db.text("FALSE"))
    IPS_REQ_SIGN = db.Column(db.Boolean, server_default=db.text("FALSE"))
    IPS_STATUS = db.Column(db.String(20), nullable=False, server_default="DRAFT")
    IPS_IMAGE_URL = db.Column(db.String(255))
    IPS_STEP_TIME = db.Column(db.Integer)

    VERSION = db.relationship("PopVersion", back_populates="STEPS")

    def to_dict(self):
        return {
            "ID": self.IPS_ID,
            "VERSION_ID": self.IPS_VERSION_ID,
            "SEQ": self.IPS_SEQ,
            "TITLE": self.IPS_TITLE,
            "INSTRUCTION": self.IPS_INSTRUCTION,
            "REQ_PHOTO": bool(self.IPS_REQ_PHOTO),
            "REQ_SIGN": bool(self.IPS_REQ_SIGN),
            "IMAGE_URL": self.IPS_IMAGE_URL,   # 
            "STEP_TIME": self.IPS_STEP_TIME,
    }
