# models/pop_version.py

from extensions import db


class PopVersion(db.Model):
    __tablename__ = "I_POP_VERSION"

    IPV_ID = db.Column(db.BigInteger, primary_key=True)
    IPV_TEMPLATE_ID = db.Column(
        db.BigInteger,
        db.ForeignKey("I_POP_TEMPLATE.IPT_ID", ondelete="CASCADE"),
        nullable=False,
    )
    IPV_VERSION_NUM = db.Column(db.Integer, nullable=False)
    IPV_SUMMARY = db.Column(db.Text, nullable=True)
    IPV_CONTENT = db.Column(db.Text, nullable=True)  # Markdown/HTML
    IPV_COD_TAREFA = db.Column(db.String(50), nullable=True)
    IPV_COD_MAQUINA = db.Column(db.String(50), nullable=True)
    IPV_IS_STANDARD = db.Column(db.Boolean, server_default=db.text("TRUE"))
    IPV_CREATED_BY = db.Column(db.Integer, nullable=True)
    IPV_CREATED_AT = db.Column(db.DateTime, server_default=db.func.now())
    IPV_ACTIVE = db.Column(db.Boolean, server_default=db.text("TRUE"))

    # relationships
    TEMPLATE = db.relationship("PopTemplate", back_populates="VERSIONS")

    STEPS = db.relationship(
        "PopStep",
        back_populates="VERSION",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PopStep.IPS_SEQ",
    )

    ATTACHMENTS = db.relationship(
        "PopAttachment",
        back_populates="VERSION",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    LINKS = db.relationship(
        "PopLink",
        back_populates="VERSION",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    INSTANCES = db.relationship("PopInstance", back_populates="VERSION")

    def to_dict(self, include_children=False):
        data = {
            "ID": self.IPV_ID,
            "TEMPLATE_ID": self.IPV_TEMPLATE_ID,
            "VERSION_NUM": self.IPV_VERSION_NUM,
            "SUMMARY": self.IPV_SUMMARY,
            "CONTENT": self.IPV_CONTENT,
            "COD_TAREFA": self.IPV_COD_TAREFA,
            "COD_MAQUINA": self.IPV_COD_MAQUINA,
            "IS_STANDARD": bool(self.IPV_IS_STANDARD),
            "CREATED_BY": self.IPV_CREATED_BY,
            "CREATED_AT": (
                self.IPV_CREATED_AT.isoformat() if self.IPV_CREATED_AT else None
            ),
            "ACTIVE": bool(self.IPV_ACTIVE),
        }
        if include_children:
            data["STEPS"] = [s.to_dict() for s in self.STEPS]
            data["ATTACHMENTS"] = [a.to_dict() for a in self.ATTACHMENTS]
            data["LINKS"] = [l.to_dict() for l in self.LINKS]
        return data

