from __future__ import annotations

from dataclasses import dataclass

from services.pubchem_service import PubChemService

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem, Descriptors, Lipinski, rdMolDescriptors
except ImportError:  # pragma: no cover
    Chem = None
    AllChem = None
    Descriptors = None
    Lipinski = None
    rdMolDescriptors = None


@dataclass
class MoleculeRecord:
    query: str
    smiles: str
    iupac_name: str
    formula: str
    molecular_weight: float
    logp: float | None
    h_donors: int
    h_acceptors: int
    chiral_centers: list[dict]
    functional_groups: dict


class MoleculeService:
    def __init__(self):
        self.pubchem = PubChemService()
        self.group_smarts = {
            "Alcohol": "[OX2H]",
            "Ketone": "[#6][CX3](=O)[#6]",
            "Amine": "[NX3;H2,H1;!$(NC=O)]",
        }

    def analyze(self, query: str) -> dict:
        if Chem is None:
            raise ValueError("RDKit is not installed. Please install rdkit first.")

        smiles, pubchem_data = self._resolve_smiles(query)
        mol = Chem.MolFromSmiles(smiles)
        if not mol:
            raise ValueError("Could not parse molecule.")

        mol = Chem.AddHs(mol)
        AllChem.EmbedMolecule(mol, randomSeed=0xF00D)
        AllChem.UFFOptimizeMolecule(mol)
        Chem.AssignStereochemistry(mol, cleanIt=True, force=True)

        chiral_centers = Chem.FindMolChiralCenters(
            mol, includeUnassigned=True, useLegacyImplementation=False
        )

        chirality_details = []
        for atom_idx, label in chiral_centers:
            atom = mol.GetAtomWithIdx(atom_idx)
            neighbor_symbols = [n.GetSymbol() for n in atom.GetNeighbors()]
            chirality_details.append(
                {
                    "atom_index": atom_idx,
                    "atom_label": f"{atom.GetSymbol()}{atom_idx}",
                    "configuration": label,
                    "neighbors": neighbor_symbols,
                    "explanation": self._chirality_explanation(atom_idx, label, neighbor_symbols),
                }
            )

        base_mol = Chem.RemoveHs(mol)
        functional_groups = self._detect_functional_groups(base_mol)

        xyz_block = Chem.MolToMolBlock(mol)
        record = MoleculeRecord(
            query=query,
            smiles=Chem.MolToSmiles(base_mol),
            iupac_name=pubchem_data.get("IUPACName", query) if pubchem_data else query,
            formula=rdMolDescriptors.CalcMolFormula(base_mol),
            molecular_weight=round(float(Descriptors.MolWt(base_mol)), 4),
            logp=round(float(Descriptors.MolLogP(base_mol)), 4),
            h_donors=int(Lipinski.NumHDonors(base_mol)),
            h_acceptors=int(Lipinski.NumHAcceptors(base_mol)),
            chiral_centers=chirality_details,
            functional_groups=functional_groups,
        )

        return {
            "query": record.query,
            "smiles": record.smiles,
            "iupac_name": record.iupac_name,
            "formula": record.formula,
            "molecular_weight": record.molecular_weight,
            "logp": record.logp,
            "h_donors": record.h_donors,
            "h_acceptors": record.h_acceptors,
            "chiral_present": len(record.chiral_centers) > 0,
            "chiral_count": len(record.chiral_centers),
            "chiral_centers": record.chiral_centers,
            "functional_groups": record.functional_groups,
            "mol_block": xyz_block,
        }

    def compare(self, left_query: str, right_query: str) -> dict:
        left = self.analyze(left_query)
        right = self.analyze(right_query)

        return {
            "left": left,
            "right": right,
            "delta": {
                "molecular_weight": round(left["molecular_weight"] - right["molecular_weight"], 4),
                "logp": round((left["logp"] or 0) - (right["logp"] or 0), 4),
                "h_donors": left["h_donors"] - right["h_donors"],
                "h_acceptors": left["h_acceptors"] - right["h_acceptors"],
            },
        }

    def _resolve_smiles(self, query: str) -> tuple[str, dict | None]:
        maybe_mol = Chem.MolFromSmiles(query)
        if maybe_mol:
            return Chem.MolToSmiles(maybe_mol), None

        pubchem_data = self.pubchem.fetch_by_name(query)
        if not pubchem_data or not pubchem_data.get("CanonicalSMILES"):
            raise ValueError("Could not resolve molecule from SMILES or compound name.")
        return pubchem_data["CanonicalSMILES"], pubchem_data

    def _detect_functional_groups(self, mol) -> dict:
        found = {}
        for label, pattern in self.group_smarts.items():
            smarts_mol = Chem.MolFromSmarts(pattern)
            matches = mol.GetSubstructMatches(smarts_mol)
            found[label] = [
                {"match_index": i, "atom_indices": list(indices)} for i, indices in enumerate(matches)
            ]
        return found

    @staticmethod
    def _chirality_explanation(atom_idx: int, label: str, neighbors: list[str]) -> str:
        return (
            f"Center {atom_idx} is tetrahedral with four substituent paths. "
            f"Using CIP priorities around neighboring atoms ({', '.join(neighbors)}), "
            f"the sequence maps to {label}. This center is chiral because no mirror-plane "
            "passes through this stereocenter with identical substituent ordering."
        )
