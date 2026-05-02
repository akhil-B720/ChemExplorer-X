from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.services.molecule_service import MoleculeService

analysis_bp = Blueprint("analysis", __name__)
molecule_service = MoleculeService()


@analysis_bp.post("/analyze")
def analyze_molecule():
    payload = request.get_json(silent=True) or {}
    query = (payload.get("query") or payload.get("compound") or payload.get("smiles") or "").strip()
    if not query:
        return (
            jsonify(
                {
                    "valid": False,
                    "error": "Molecule not found",
                    "hint": "Try glucose, caffeine, dopamine, or SMILES like CCO",
                }
            ),
            400,
        )

    analysis = molecule_service.analyze(query)
    if not analysis.get("valid"):
        return jsonify(analysis), 400
    return jsonify(analysis)
