from flask import Blueprint, request, jsonify
from backend.services.pubchem_service import PubChemService

analysis_bp = Blueprint("analysis", __name__)

@analysis_bp.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json()
        print("DEBUG INPUT:", data)

        if not data:
            return jsonify({"error": "No JSON received"}), 400

        query = data.get("query") or data.get("smiles") or data.get("compound")

        if not query:
            return jsonify({"error": "No query provided"}), 400

        service = PubChemService()
        result = service.fetch_by_name(query)

        print("DEBUG RESULT:", result)

        if not result:
            return jsonify({"error": "Molecule not found"}), 400

        return jsonify(result)

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"error": str(e)}), 500