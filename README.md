# Chem Explorer H

Single-page premium chemistry platform (static `frontend/` assets) served by **Flask**, with **PubChem + RDKit** molecule analysis, **Three.js** structure rendering from an RDKit MolBlock, **SSE streaming** Claude tutoring (server-side key), and a **300+** question quiz API.

## Versions (for RDKit on Windows / pip)

Your repo already pins the Python runtime:

- **Python:** `3.10.13` (see `.python-version` and `runtime.txt`)

For **NumPy + RDKit** compatibility with **PyPI wheels**:

- **NumPy:** pinned in `requirements.txt` as **`numpy==2.2.6`**
- **RDKit (PyPI package name):** **`rdkit>=2024.9.5`**  
  Recent RDKit wheels are aligned with modern **NumPy 2.x** builds; mixing **NumPy 1.26.x** against a NumPy‑2‑built wheel often fails at import time.

Rule of thumb:

- Installing via **pip**: keep **Python 3.10–3.12** and use **NumPy 2.x** with a modern **rdkit** wheel (what `requirements.txt` encodes).

- Installing via **conda-forge**: you can alternatively use **`numpy 1.26.x`** alongside **`conda install -c conda-forge rdkit`** — conda solves the ABI stack for you.

## Folder structure

```text
chem-explorer-h/
├─ backend/
│  ├─ app.py
│  ├─ routes/
│  │  ├─ analysis.py
│  │  ├─ chat.py
│  │  └─ quiz.py
│  ├─ services/
│  │  ├─ ai_service.py
│  │  ├─ molecule_service.py
│  │  ├─ pubchem_service.py
│  │  └─ quiz_service.py
│  └─ data/
│     └─ quiz_questions.json          # regenerated if empty / invalid
├─ frontend/
│  ├─ index.html                       # SPA shell matching your CEH UI
│  ├─ chem-explorer-h.css
│  └─ chem-explorer-h.js               # Flask /api bindings + visuals
├─ requirements.txt
├─ runtime.txt / .python-version
└─ README.md
```

## Configure keys

PowerShell examples:

```powershell
$env:ANTHROPIC_API_KEY="sk-ant-..."
# Optional (OpenAI still works on /api/chat/stream if you wire the UI):
$env:OPENAI_API_KEY="sk-..."
```

## Run (single Flask server loads the SPA)

```powershell
pip install -r requirements.txt
python backend/app.py
```

If you previously saw **`ModuleNotFoundError: backend`**, ensure you launch from the repo root **or** rely on `backend/app.py` (it injects the project root onto `sys.path` automatically).

Alternative (also valid from repo root):

```powershell
python -m backend.app
```

Open:

```text
http://127.0.0.1:5000/
```

## API endpoints used by `chem-explorer-h.js`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/analyze` | PubChem name → canonical SMILES, else SMILES parse; **RDKit** props + stereocenters + MolBlock |
| `GET` | `/api/tutor-status` | Shows whether `ANTHROPIC_API_KEY` is configured |
| `POST` | `/api/chat/claude/stream` | SSE `data: {\"token\":\"...\"}` stream (Anthropic Claude via server) |
| `POST` | `/api/chat/stream` | SSE stream for OpenAI GPT if you expose it in UI |
| `GET` | `/api/quiz/question` | Random question (`difficulty=easy|medium|hard`) |
| `POST` | `/api/quiz/check` | Grade `{ \"id\", \"selected\" }` |

## Notes

- The AI tutor intentionally uses a **server API key** (no browser Claude key, no wasted CORS‑complexity unless you redesign for it).
- The 3D view **lazy‑loads Three.js from CDN** the first time a structure is rendered (`r128`).
- Molecular geometry is reconstructed from **`mol_block`** (not heuristic SMILES graph layout).
