# models/pop_history.py

from extensions import db


class PopHistory(db.Model):
    __tablename__ = "I_POP_HISTORY"

    IPH_ID = db.Column(db.BigInteger, primary_key=True)
    IPH_ENTITY_TYPE = db.Column(
        db.String(30), nullable=True
    )  # TEMPLATE/VERSION/INSTANCE
    IPH_ENTITY_ID = db.Column(db.BigInteger, nullable=True)
    IPH_ACTION = db.Column(db.String(40), nullable=True)
    IPH_USER_ID = db.Column(db.Integer, nullable=True)
    IPH_PAYLOAD = db.Column(db.JSON, nullable=True)
    IPH_CREATED_AT = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "ID": self.IPH_ID,
            "ENTITY_TYPE": self.IPH_ENTITY_TYPE,
            "ENTITY_ID": self.IPH_ENTITY_ID,
            "ACTION": self.IPH_ACTION,
            "USER_ID": self.IPH_USER_ID,
            "PAYLOAD": self.IPH_PAYLOAD,
            "CREATED_AT": (
                self.IPH_CREATED_AT.isoformat() if self.IPH_CREATED_AT else None
            ),
        }
