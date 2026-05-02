from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from backend.routes.analysis import analysis_bp
from backend.routes.chat import chat_bp
from backend.routes.quiz import quiz_bp


def create_app() -> Flask:
    app = Flask(
        __name__,
        static_folder="frontend",
        static_url_path=""
    )

    frontend_dir = Path(app.static_folder).resolve()

    app.config["JSON_SORT_KEYS"] = False
    app.config["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "")

    app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(quiz_bp, url_prefix="/api")

    # ✅ ROUTES MUST BE INSIDE THIS FUNCTION

@app.get("/")
def index():
    return app.send_static_file("index.html")

@app.get("/dashboard")
def dashboard():
    return app.send_static_file("dashboard.html")
    return app


# ✅ THIS is what gunicorn uses
app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)