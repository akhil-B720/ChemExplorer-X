# ChemExplorer X

Futuristic full-stack chemistry platform with Flask + RDKit backend and an animated glassmorphism frontend.

## Run

1. Install dependencies:
   - `pip install -r requirements.txt`
2. Set OpenAI key (optional for live AI chat):
   - PowerShell: `$env:OPENAI_API_KEY="your_key"`
3. Start app:
   - `python backend/app.py`
4. Open:
   - `http://localhost:5000`

## Core Features

- Molecule analysis with PubChem + RDKit
- Chirality detection and stereocenter explanations
- Functional group highlighting in 3D
- Molecule comparison with generated summary
- Adaptive quiz + game mode mechanics
- AI tutoring chatbot (`/api/chat`, `gpt-4o-mini`)
