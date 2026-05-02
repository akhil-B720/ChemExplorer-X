from __future__ import annotations

import os
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
root_str = str(_REPO_ROOT)
if root_str not in sys.path:
    sys.path.insert(0, root_str)

from flask import Flask, jsonify, send_from_directory

from backend.routes.analysis import analysis_bp
from backend.routes.chat import chat_bp
from backend.routes.quiz import quiz_bp


def create_app() -> Flask:
    app = Flask(__name__, static_folder="../frontend", static_url_path="/")
    app.config["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "")
    app.config["ANTHROPIC_API_KEY"] = os.getenv("ANTHROPIC_API_KEY", "")

    app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(quiz_bp, url_prefix="/api")

    @app.get("/api/health")
    def healthcheck():
        return jsonify({"ok": True})

    @app.get("/api/tutor-status")
    def tutor_status():
        return jsonify(
            {
                "ok": True,
                "openai_configured": bool(app.config.get("OPENAI_API_KEY")),
                "anthropic_configured": bool(app.config.get("ANTHROPIC_API_KEY")),
            }
        )

    @app.get("/")
    def serve_index():
        if os.path.exists(os.path.join(app.static_folder or "", "index.html")):
            return send_from_directory(app.static_folder, "index.html")
        return jsonify({"message": "Chem Explorer H API is running."})

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)