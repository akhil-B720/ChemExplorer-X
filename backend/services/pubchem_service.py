from __future__ import annotations

from urllib.parse import quote_plus

import requests


class PubChemService:
    BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"

    def __init__(self, timeout: int = 12):
        self.timeout = timeout

    def fetch_by_name(self, query: str) -> dict | None:
        url = (
            f"{self.BASE}/compound/name/{quote_plus(query)}/property/"
            "MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES,IsomericSMILES/JSON"
        )
        try:
            response = requests.get(url, timeout=self.timeout)
            if response.status_code != 200:
                return None
            payload = response.json()
            properties = payload.get("PropertyTable", {}).get("Properties", [])
            return properties[0] if properties else None
        except Exception:
            return None
