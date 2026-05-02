from __future__ import annotations

from flask import Blueprint, jsonify, request

from backend.services.molecule_service import MoleculeService

analysis_bp = Blueprint("analysis", __name__)
molecule_service = MoleculeService()


@analysis_bp.post("/analyze")
def analyze_molecule():
    payload = request.get_json(silent=True) or {}
    query = (payload.get("query") or "").strip()
    if not query:
        return jsonify({"error": "Please provide a SMILES string or compound name."}), 400

    try:
        analysis = molecule_service.analyze(query)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover
        return jsonify({"error": f"Failed to analyze molecule: {exc}"}), 500

    return jsonify(analysis)


@analysis_bp.post("/compare")
def compare_molecules():
    payload = request.get_json(silent=True) or {}
    left_query = (payload.get("left") or "").strip()
    right_query = (payload.get("right") or "").strip()

    if not left_query or not right_query:
        return jsonify({"error": "Both molecule fields are required."}), 400

    try:
        comparison = molecule_service.compare(left_query, right_query)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # pragma: no cover
        return jsonify({"error": f"Failed to compare molecules: {exc}"}), 500

    return jsonify(comparison)
