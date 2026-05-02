from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from backend.routes.analysis import analysis_bp
from backend.routes.chat import chat_bp
from backend.routes.quiz import quiz_bp


def create_app() -> Flask:
    base_dir = Path(__file__).resolve().parent
    frontend_dir = (base_dir.parent / "frontend").resolve()

    app = Flask(
        __name__,
        static_folder=str(frontend_dir),
        template_folder=str(frontend_dir),
    )

    app.config["JSON_SORT_KEYS"] = False
    app.config["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "")

    app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(quiz_bp, url_prefix="/api")

    
@app.get("/")
def index():
    return send_from_directory(frontend_dir, "index.html")

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(frontend_dir, filename)

@app.get("/dashboard")
def dashboard():
    return send_from_directory(frontend_dir, "dashboard.html")

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

    return app


# ✅ THIS LINE IS REQUIRED FOR RENDER
app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)