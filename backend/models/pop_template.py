# models/pop_template.py

from extensions import db
from sqlalchemy import Sequence

class PopTemplate(db.Model):
    __tablename__ = "I_POP_TEMPLATE"
    __mapper_args__ = {"eager_defaults": True}  # <- importante no Oracle

    IPT_ID = db.Column(db.String(8), primary_key=True, server_default=db.FetchedValue())
    IPT_CODE = db.Column(db.String(50), nullable=False, unique=True)
    IPT_TITLE = db.Column(db.String(100), nullable=False)
    IPT_TYPE = db.Column(db.String(20), nullable=False)
    IPT_DESCRIPTION = db.Column(db.String(100))
    IPT_DUR_PADRAO = db.Column(db.String(100))
    IPT_CREATED_BY = db.Column(db.Integer)
    IPT_CREATED_AT = db.Column(db.DateTime, server_default=db.FetchedValue())
    IPT_ACTIVE = db.Column(db.Integer, nullable=False, server_default="1")
    IPT_STATUS = db.Column(db.String(20), nullable=False, server_default="DRAFT")

    # relationships
    VERSIONS = db.relationship(
        "PopVersion",
        back_populates="TEMPLATE",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def to_dict(self):
        return {
            "ID": self.IPT_ID,
            "CODE": self.IPT_CODE,
            "TITLE": self.IPT_TITLE,
            "TYPE": self.IPT_TYPE,
            "DESCRIPTION": self.IPT_DESCRIPTION,
            "DUR_PADRAO": self.IPT_DUR_PADRAO,
            "CREATED_BY": self.IPT_CREATED_BY,
            "CREATED_AT": (
                self.IPT_CREATED_AT.isoformat() if self.IPT_CREATED_AT else None
            ),
            "ACTIVE": bool(self.IPT_ACTIVE),
            "STATUS": self.IPT_STATUS,
        }

