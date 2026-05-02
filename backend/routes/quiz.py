from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.quiz_service import QuizService

quiz_bp = Blueprint("quiz", __name__)
quiz_service = QuizService()


@quiz_bp.get("/quiz/question")
def get_question():
    difficulty = (request.args.get("difficulty") or "easy").strip().lower()
    question = quiz_service.get_random_question(difficulty)
    if not question:
        return jsonify({"error": "No question found."}), 404
    return jsonify(question)


@quiz_bp.post("/quiz/check")
def check_answer():
    payload = request.get_json(silent=True) or {}
    question_id = payload.get("id")
    selected = payload.get("selected")
    result = quiz_service.check_answer(question_id, selected)
    if not result:
        return jsonify({"error": "Invalid question or answer payload."}), 400
    return jsonify(result)
