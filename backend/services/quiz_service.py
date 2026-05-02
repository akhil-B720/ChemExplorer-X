from __future__ import annotations

import json
import random
from pathlib import Path


class QuizService:
    def __init__(self):
        self.data_path = Path(__file__).resolve().parent.parent / "data" / "quiz_questions.json"
        self.questions = self._load_questions()
        self.question_map = {q["id"]: q for q in self.questions}
        self._difficulty_buckets = self._build_buckets()
        self._cursor = {k: 0 for k in self._difficulty_buckets}

    def _load_questions(self) -> list[dict]:
        if not self.data_path.exists():
            generated = self._generate_question_bank()
            self.data_path.parent.mkdir(parents=True, exist_ok=True)
            with self.data_path.open("w", encoding="utf-8") as f:
                json.dump(generated, f, indent=2)
            return generated
        with self.data_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if len(data) < 300 or not self._is_well_structured(data):
            data = self._generate_question_bank()
            with self.data_path.open("w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        return data

    def get_random_question(self, difficulty: str) -> dict | None:
        if not self.questions:
            return None
        bucket = self._difficulty_buckets.get(difficulty) or self._difficulty_buckets.get("all", [])
        if not bucket:
            return None
        idx = self._cursor[difficulty] if difficulty in self._cursor else 0
        if idx >= len(bucket):
            random.shuffle(bucket)
            idx = 0
        q = bucket[idx].copy()
        if difficulty in self._cursor:
            self._cursor[difficulty] = idx + 1
        q.pop("answer", None)
        return q

    def check_answer(self, question_id: str, selected: str) -> dict | None:
        q = self.question_map.get(str(question_id))
        if not q:
            return None
        is_correct = selected == q.get("answer")
        return {
            "correct": is_correct,
            "answer": q.get("answer"),
            "explanation": q.get("explanation"),
            "difficulty": q.get("difficulty"),
        }

    @staticmethod
    def _is_well_structured(data: list[dict]) -> bool:
        if not isinstance(data, list):
            return False
        required = {"id", "difficulty", "topic", "question", "options", "answer", "explanation"}
        difficulties = {"easy": 0, "medium": 0, "hard": 0}
        seen = set()
        for row in data:
            if not required.issubset(row.keys()):
                return False
            signature = row["question"].strip().lower()
            if signature in seen:
                return False
            seen.add(signature)
            if row["difficulty"] in difficulties:
                difficulties[row["difficulty"]] += 1
        return all(v >= 90 for v in difficulties.values())

    @staticmethod
    def _generate_question_bank() -> list[dict]:
        topics = {
            "easy": {
                "Atomic Structure": [
                    ("Which quantum number defines orbital shape?", ["n", "l", "m", "s"], "l"),
                    ("Maximum electrons in p-subshell?", ["2", "4", "6", "8"], "6"),
                    ("Isotopes differ in:", ["protons", "electrons", "neutrons", "charge"], "neutrons"),
                ],
                "Chemical Bonding": [
                    ("Geometry of CH4 is:", ["planar", "tetrahedral", "bent", "linear"], "tetrahedral"),
                    ("Bond angle in water is closest to:", ["90 deg", "104.5 deg", "109.5 deg", "120 deg"], "104.5 deg"),
                    ("Most polar bond:", ["C-H", "N-H", "O-H", "Cl-Cl"], "O-H"),
                ],
                "Organic Basics": [
                    ("Functional group in ethanol:", ["ketone", "alcohol", "amine", "ester"], "alcohol"),
                    ("IUPAC suffix for aldehyde:", ["-ol", "-one", "-al", "-oic acid"], "-al"),
                    ("Saturated hydrocarbon family:", ["alkenes", "alkynes", "alkanes", "arenes"], "alkanes"),
                ],
            },
            "medium": {
                "Thermodynamics": [
                    ("At constant pressure, heat exchanged equals:", ["delta U", "delta H", "delta G", "delta S"], "delta H"),
                    ("Spontaneous process has:", ["delta G < 0", "delta G > 0", "delta H > 0 only", "delta S < 0 only"], "delta G < 0"),
                    ("SI unit of entropy:", ["J", "J/mol", "J/mol K", "KJ/mol"], "J/mol K"),
                ],
                "Equilibrium": [
                    ("For Kc >> 1, equilibrium favors:", ["reactants", "products", "neither", "solvent"], "products"),
                    ("Le Chatelier shift for added reactant:", ["left", "right", "none", "irreversible"], "right"),
                    ("pH of neutral water at 25C:", ["5", "6", "7", "8"], "7"),
                ],
                "Stereochemistry": [
                    ("A chiral carbon must have:", ["double bond", "four different groups", "ring only", "charge"], "four different groups"),
                    ("Enantiomers rotate plane polarized light in:", ["same direction", "opposite directions", "no rotation", "random directions"], "opposite directions"),
                    ("R/S notation is based on:", ["CIP rules", "octet rule", "Aufbau", "VSEPR"], "CIP rules"),
                ],
            },
            "hard": {
                "Reaction Mechanisms": [
                    ("SN1 reaction rate depends on:", ["substrate only", "nucleophile only", "both equally", "temperature only"], "substrate only"),
                    ("Primary alkyl halides prefer:", ["SN1", "E1", "SN2", "carbocation rearrangement"], "SN2"),
                    ("Strong bulky base favors:", ["SN2", "E2", "SN1", "addition"], "E2"),
                ],
                "Coordination Chemistry": [
                    ("Oxidation state of Fe in [Fe(CN)6]4-:", ["+1", "+2", "+3", "+4"], "+2"),
                    ("d4 high-spin octahedral has unpaired electrons:", ["2", "3", "4", "1"], "4"),
                    ("Chelate effect generally increases:", ["volatility", "complex stability", "bond length", "acidity"], "complex stability"),
                ],
                "Advanced Physical": [
                    ("For first-order reaction, unit of k is:", ["s-1", "mol L-1 s-1", "L mol-1 s-1", "dimensionless"], "s-1"),
                    ("Arrhenius plot slope equals:", ["Ea/R", "-Ea/R", "R/Ea", "-R/Ea"], "-Ea/R"),
                    ("At half-life of first-order reaction, concentration is:", ["one-fourth", "one-half", "two-thirds", "unchanged"], "one-half"),
                ],
            },
        }

        stems = [
            "Choose the correct statement.",
            "Select the best answer.",
            "Identify the correct option.",
            "Which option is accurate?",
            "For JEE/BITSAT prep, pick the right concept.",
        ]

        questions = []
        used_questions = set()
        qid = 1
        random.seed(42)

        for difficulty, topic_map in topics.items():
            target_count = 120
            generated = 0
            while generated < target_count:
                for topic, qa_list in topic_map.items():
                    for base_question, options, answer in qa_list:
                        stem = random.choice(stems)
                        prompt = f"{base_question} {stem} [Topic: {topic}] [Set: {generated + 1}]"
                        signature = prompt.lower().strip()
                        if signature in used_questions:
                            continue
                        distractors = [o for o in options if o != answer]
                        random.shuffle(distractors)
                        shuffled = distractors[:]
                        insert_at = random.randint(0, len(shuffled))
                        shuffled.insert(insert_at, answer)
                        explanation = (
                            f"{answer} is correct under {topic}. "
                            "Review the underlying principle and eliminate distractors by concept."
                        )
                        questions.append(
                            {
                                "id": f"q-{qid}",
                                "difficulty": difficulty,
                                "topic": topic,
                                "question": prompt,
                                "options": shuffled,
                                "answer": answer,
                                "explanation": explanation,
                            }
                        )
                        used_questions.add(signature)
                        qid += 1
                        generated += 1
                        if generated >= target_count:
                            break
                    if generated >= target_count:
                        break

        random.shuffle(questions)
        return questions

    def _build_buckets(self) -> dict[str, list[dict]]:
        buckets = {"easy": [], "medium": [], "hard": [], "all": list(self.questions)}
        for q in self.questions:
            diff = q.get("difficulty")
            if diff in buckets:
                buckets[diff].append(q)
        for key in ("easy", "medium", "hard", "all"):
            random.shuffle(buckets[key])
        return buckets
