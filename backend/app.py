## backend/app.py

from flask import Flask
from config import Config
from extensions import db, migrate
from flask_cors import CORS

from oracle_client import init_oracle_thick

print("🔥 ESTE APP.PY FOI CARREGADO 🔥")

def create_app():
    app = Flask(__name__)

    app.config.from_object(Config)

    # sessão
    app.secret_key = "troque-por-uma-chave-forte"
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    # app.config["SESSION_COOKIE_SECURE"] = True  # só se HTTPS

    # CORS + cookie
    CORS(
        app,
        supports_credentials=True,
        origins=[
            "http://127.0.0.1:8080",
            "http://localhost:8080",
            "http://10.42.92.200:8080",
            # dev
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://10.42.92.200:5500",
        ],
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    )

    # ATIVA THICK ANTES DO SQLALCHEMY
    init_oracle_thick()

    db.init_app(app)
    migrate.init_app(app, db)

    @app.get("/health")
    def health():
        return {"status": "ok"}, 200

    from routes import register_blueprints

    print("ROTAS REGISTRADAS:")
    for r in app.url_map.iter_rules():
        print(r)
    register_blueprints(app)

    return app



if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8100, debug=True)
