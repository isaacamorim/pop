# models/pop_attachment.py

from extensions import db


class PopAttachment(db.Model):
    __tablename__ = "I_POP_ATTACHMENT"

    IPA_ID = db.Column(db.BigInteger, primary_key=True)
    IPA_VERSION_ID = db.Column(
        db.BigInteger,
        db.ForeignKey("I_POP_VERSION.IPV_ID", ondelete="CASCADE"),
        nullable=False,
    )
    IPA_FILENAME = db.Column(db.Text, nullable=True)
    IPA_MIME = db.Column(db.String(100), nullable=True)
    IPA_STORAGE_PATH = db.Column(db.Text, nullable=True)
    IPA_UPLOADED_BY = db.Column(db.Integer, nullable=True)
    IPA_UPLOADED_AT = db.Column(db.DateTime, server_default=db.func.now())

    VERSION = db.relationship("PopVersion", back_populates="ATTACHMENTS")

    def to_dict(self):
        return {
            "ID": self.IPA_ID,
            "VERSION_ID": self.IPA_VERSION_ID,
            "FILENAME": self.IPA_FILENAME,
            "MIME": self.IPA_MIME,
            "STORAGE_PATH": self.IPA_STORAGE_PATH,
            "UPLOADED_BY": self.IPA_UPLOADED_BY,
            "UPLOADED_AT": (
                self.IPA_UPLOADED_AT.isoformat() if self.IPA_UPLOADED_AT else None
            ),
        }
