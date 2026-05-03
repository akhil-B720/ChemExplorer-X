from __future__ import annotations

import logging
from typing import Any
from urllib.parse import quote

import requests


logger = logging.getLogger(__name__)


class PubChemService:
    BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"

    # NCBI/PubChem may reject or silently throttle clients with generic / missing UA.
    DEFAULT_HEADERS = {
        "User-Agent": (
            "ChemExplorerH/1.0 (+https://github.com/) "
            "python-requests; academic chemistry tooling"
        ),
        "Accept": "application/json",
    }

    PROPERTY_FIELDS = (
        "CID,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES,IsomericSMILES"
    )

    def __init__(self, timeout: int = 20):
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update(self.DEFAULT_HEADERS)

    def _get_json(self, url: str) -> dict[str, Any] | None:
        try:
            r = self._session.get(url, timeout=self.timeout)
            if r.status_code != 200:
                logger.warning("PubChem HTTP %s for %s", r.status_code, url)
                return None
            return r.json()
        except requests.RequestException as exc:
            logger.warning("PubChem request failed for %s: %s", url, exc)
            return None

    def _normalize_properties(self, row: dict | None) -> dict | None:
        if not row:
            return None
        smiles = row.get("CanonicalSMILES") or row.get("IsomericSMILES")
        if not smiles:
            return None
        if not row.get("CanonicalSMILES"):
            row = {**row, "CanonicalSMILES": smiles}
        return row

    def _extract_cids(self, payload: dict[str, Any] | None) -> list[int]:
        if not payload:
            return []
        raw = (
            payload.get("IdentifierList", {}).get("CID")
            if isinstance(payload.get("IdentifierList"), dict)
            else None
        )
        if raw is None:
            return []
        if isinstance(raw, int):
            return [raw]
        if isinstance(raw, list):
            nums: list[int] = []
            for x in raw:
                try:
                    nums.append(int(x))
                except (TypeError, ValueError):
                    continue
            return nums
        return []

    def fetch_by_name(self, query: str) -> dict | None:
        name = quote(query.strip(), safe="")
        if not name:
            return None

        props_url = (
            f"{self.BASE}/compound/name/{name}/property/{self.PROPERTY_FIELDS}/JSON"
        )
        payload = self._get_json(props_url)
        if payload:
            rows = payload.get("PropertyTable", {}).get("Properties", [])
            if rows:
                return self._normalize_properties(rows[0])

        cids_payload = self._get_json(f"{self.BASE}/compound/name/{name}/cids/JSON")
        first_cids = self._extract_cids(cids_payload)[:12]
        if not first_cids:
            syn_payload = self._get_json(f"{self.BASE}/compound/synonym/{name}/cids/JSON")
            first_cids = self._extract_cids(syn_payload)[:12]
        for cid in first_cids:
            cid_url = (
                f"{self.BASE}/compound/cid/{cid}/property/{self.PROPERTY_FIELDS}/JSON"
            )
            cp = self._get_json(cid_url)
            if not cp:
                continue
            rows = cp.get("PropertyTable", {}).get("Properties", [])
            if rows:
                rec = rows[0]
                rec.setdefault("CID", cid)
                return self._normalize_properties(rec)

        return None
