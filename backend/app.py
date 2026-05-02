from flask import Flask, jsonify

from backend.routes.analysis import analysis_bp
from backend.routes.chat import chat_bp
from backend.routes.quiz import quiz_bp


def create_app():
    app = Flask(
        __name__,
        static_folder="../frontend",   # IMPORTANT
        static_url_path=""
    )

    app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(quiz_bp, url_prefix="/api")

    @app.route("/")
    def index():
        return app.send_static_file("index.html")

    @app.route("/dashboard")
    def dashboard():
        return app.send_static_file("dashboard.html")

    @app.route("/health")
    def health():
        return jsonify({"status": "ok"})

    return app


app = create_app()