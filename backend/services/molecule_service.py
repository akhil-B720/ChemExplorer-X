from __future__ import annotations

from backend.services.pubchem_service import PubChemService

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors
except ImportError:  # pragma: no cover
    Chem = None
    AllChem = None
    Descriptors = None
    rdMolDescriptors = None


class MoleculeService:
    def __init__(self):
        self.pubchem = PubChemService()

    def analyze(self, query: str) -> dict:
        if Chem is None:
            return self._error_payload()

        smiles, source, pubchem_meta = self._resolve_input(query)
        if not smiles:
            return self._error_payload()

        mol = Chem.MolFromSmiles(smiles)
        if not mol:
            return self._error_payload()

        Chem.AssignStereochemistry(mol, force=True, cleanIt=True)
        formula = rdMolDescriptors.CalcMolFormula(mol)
        weight = round(float(Descriptors.MolWt(mol)), 4)
        centers = Chem.FindMolChiralCenters(
            mol, includeUnassigned=True, useLegacyImplementation=False
        )

        stereocenters = [
            {"atom_index": idx, "label": label, "atom_symbol": mol.GetAtomWithIdx(idx).GetSymbol()}
            for idx, label in centers
        ]

        mol_3d = Chem.AddHs(mol)
        if AllChem.EmbedMolecule(mol_3d, randomSeed=0xBEEF) == 0:
            AllChem.MMFFOptimizeMolecule(mol_3d, maxIters=200)
        heavy_3d = Chem.RemoveHs(mol_3d)
        mol_block = Chem.MolToMolBlock(heavy_3d)

        is_chiral = any(center["label"] in {"R", "S"} for center in stereocenters)
        resolved_smiles = Chem.MolToSmiles(mol)
        response = {
            "valid": True,
            "source": source,
            "smiles": resolved_smiles,
            "formula": formula,
            "weight": weight,
            "chirality": {
                "is_chiral": is_chiral,
                "count": len(stereocenters),
            },
            "stereocenters": stereocenters,
            "mol_block": mol_block,
        }
        if pubchem_meta:
            response["pubchem"] = pubchem_meta
        return response

    def _resolve_input(self, query: str) -> tuple[str | None, str, dict | None]:
        by_name = self.pubchem.fetch_by_name(query)
        if by_name:
            smiles = (
                by_name.get("CanonicalSMILES")
                or by_name.get("IsomericSMILES")
                or ""
            ).strip()
            if smiles:
                w_pub = by_name.get("MolecularWeight")
                try:
                    w_pub_round = (
                        round(float(w_pub), 6) if w_pub not in {None, ""} else None
                    )
                except (TypeError, ValueError):
                    w_pub_round = None

                cid_val = by_name.get("CID")
                try:
                    cid_out = int(cid_val) if cid_val is not None else None
                except (TypeError, ValueError):
                    cid_out = None

                meta = {
                    "cid": cid_out,
                    "iupac": by_name.get("IUPACName"),
                    "formula_pubchem": by_name.get("MolecularFormula"),
                    "weight_pubchem": w_pub_round,
                    "canonical_smiles_raw": by_name.get("CanonicalSMILES"),
                    "isomeric_smiles_raw": by_name.get("IsomericSMILES"),
                }
                return smiles, "pubchem-name", {k: v for k, v in meta.items() if v is not None}

        maybe_smiles = Chem.MolFromSmiles(query) if Chem else None
        if maybe_smiles:
            return Chem.MolToSmiles(maybe_smiles), "smiles-input", None

        return None, "unknown", None

    @staticmethod
    def _error_payload() -> dict:
        return {
            "valid": False,
            "error": "Molecule not found",
            "hint": "Try glucose, caffeine, dopamine, or SMILES like CCO",
        }
