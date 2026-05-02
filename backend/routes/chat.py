from __future__ import annotations

import json

from flask import Blueprint, Response, current_app, jsonify, request, stream_with_context

from backend.services.ai_service import AIService

chat_bp = Blueprint("chat", __name__)


@chat_bp.post("/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    context = payload.get("context") or {}
    if not message:
        return jsonify({"error": "Message is required."}), 400

    client = AIService(
        current_app.config.get("OPENAI_API_KEY", ""),
        anthropic_key=current_app.config.get("ANTHROPIC_API_KEY", ""),
    )
    answer = client.ask_tutor(message=message, context=context)
    return jsonify({"answer": answer})


@chat_bp.post("/chat/stream")
def chat_stream():
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    context = payload.get("context") or {}
    if not message:
        return jsonify({"error": "Message is required."}), 400

    client = AIService(
        current_app.config.get("OPENAI_API_KEY", ""),
        anthropic_key=current_app.config.get("ANTHROPIC_API_KEY", ""),
    )

    @stream_with_context
    def generate():
        for chunk in client.stream_tutor(message=message, context=context):
            yield f"data: {json.dumps({'token': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return Response(generate(), mimetype="text/event-stream")


@chat_bp.post("/chat/claude/stream")
def chat_claude_stream():
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()
    context = payload.get("context") or {}
    if not message:
        return jsonify({"error": "Message is required."}), 400

    client = AIService(
        current_app.config.get("OPENAI_API_KEY", ""),
        anthropic_key=current_app.config.get("ANTHROPIC_API_KEY", ""),
    )

    @stream_with_context
    def generate():
        for chunk in client.stream_claude(message=message, context=context):
            yield f"data: {json.dumps({'token': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return Response(generate(), mimetype="text/event-stream")
