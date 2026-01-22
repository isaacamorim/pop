# models/pop_link.py

from extensions import db


class PopLink(db.Model):
    __tablename__ = "I_POP_LINK"

    IPL_ID = db.Column(db.BigInteger, primary_key=True)
    IPL_VERSION_ID = db.Column(
        db.BigInteger,
        db.ForeignKey("I_POP_VERSION.IPV_ID", ondelete="CASCADE"),
        nullable=False,
    )

    IPL_LINK_TYPE = db.Column(
        db.String(20), nullable=False
    )  # NP/PECA_OP/PECA/MAQUINA/TAREFA/SERVICO
    IPL_COD_NP = db.Column(db.String(50), nullable=True)
    IPL_COD_PRODUTO = db.Column(db.String(50), nullable=True)
    IPL_COD_SEQ = db.Column(db.String(50), nullable=True)
    IPL_COD_TAREFA = db.Column(db.String(50), nullable=True)
    IPL_COD_MAQUINA = db.Column(db.String(50), nullable=True)
    IPL_TMP_MAQUINA = db.Column(db.Numeric, nullable=True)
    IPL_TMP_SETUP = db.Column(db.Numeric, nullable=True)
    IPL_PROD_HORA = db.Column(db.Numeric, nullable=True)
    IPL_NOTES = db.Column(db.Text, nullable=True)
    IPL_CREATED_AT = db.Column(db.DateTime, server_default=db.func.now())

    VERSION = db.relationship("PopVersion", back_populates="LINKS")

    INSTANCES = db.relationship("PopInstance", back_populates="LINK")

    def to_dict(self):
        return {
            "ID": self.IPL_ID,
            "VERSION_ID": self.IPL_VERSION_ID,
            "LINK_TYPE": self.IPL_LINK_TYPE,
            "COD_NP": self.IPL_COD_NP,
            "COD_PRODUTO": self.IPL_COD_PRODUTO,
            "COD_SEQ": self.IPL_COD_SEQ,
            "COD_TAREFA": self.IPL_COD_TAREFA,
            "COD_MAQUINA": self.IPL_COD_MAQUINA,
            "TMP_MAQUINA": (
                float(self.IPL_TMP_MAQUINA)
                if self.IPL_TMP_MAQUINA is not None
                else None
            ),
            "TMP_SETUP": (
                float(self.IPL_TMP_SETUP) if self.IPL_TMP_SETUP is not None else None
            ),
            "PROD_HORA": (
                float(self.IPL_PROD_HORA) if self.IPL_PROD_HORA is not None else None
            ),
            "NOTES": self.IPL_NOTES,
            "CREATED_AT": (
                self.IPL_CREATED_AT.isoformat() if self.IPL_CREATED_AT else None
            ),
        }
