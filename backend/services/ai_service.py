from __future__ import annotations

import json
from typing import Iterable

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None

try:
    from anthropic import Anthropic
except ImportError:  # pragma: no cover
    Anthropic = None


SYSTEM_PROMPT = (
    "You are Chem Explorer H AI, an expert chemistry tutor. "
    "Explain step-by-step, starting simple and going advanced. "
    "Focus on JEE/BITSAT level."
)


class AIService:
    def __init__(self, api_key: str, anthropic_key: str = ""):
        self.api_key = api_key
        self.anthropic_key = anthropic_key

    def ask_tutor(self, message: str, context: dict | None = None) -> str:
        history = self._normalize_history((context or {}).get("history"))
        if not self.api_key or OpenAI is None:
            return (
                "AI assistant is running in fallback mode. "
                "Set OPENAI_API_KEY and install the openai package for live GPT responses.\n\n"
                f"Your question: {message}\n"
                "Tip: Break down the molecule into functional groups, then reason about "
                "electron effects, hybridization, and stereochemistry."
            )

        client = OpenAI(api_key=self.api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=self._build_messages(message, context or {}, history),
            temperature=0.4,
        )
        return response.choices[0].message.content or "No response received."

    def stream_tutor(self, message: str, context: dict | None = None) -> Iterable[str]:
        history = self._normalize_history((context or {}).get("history"))
        if not self.api_key or OpenAI is None:
            fallback = (
                "AI assistant is running in fallback mode. "
                "Set OPENAI_API_KEY and install the openai package for live GPT responses. "
                "Meanwhile, analyze the molecule by functional groups, stereochemistry, and reactivity trends."
            )
            for token in fallback.split(" "):
                yield token + " "
            return

        client = OpenAI(api_key=self.api_key)
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=self._build_messages(message, context or {}, history),
            temperature=0.4,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta

    def stream_claude(
        self,
        message: str,
        context: dict | None = None,
        *,
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 1000,
    ) -> Iterable[str]:
        history = self._normalize_history((context or {}).get("history"))
        if not self.anthropic_key or Anthropic is None:
            fallback = (
                "Chem Explorer H tutor is offline. "
                "Set ANTHROPIC_API_KEY on the Flask server + `pip install anthropic`. "
                "Until then: break concepts into primitives, cite hybridization/VSEPR, "
                "then escalate to electron effects and stereochemistry when needed.\n"
            )
            for token in fallback.split(" "):
                yield token + " "
            return

        client = Anthropic(api_key=self.anthropic_key)
        claude_messages: list[dict] = [{"role": m["role"], "content": m["content"]} for m in history]
        payload = {"question": message, "context": {k: v for k, v in (context or {}).items() if k != "history"}}
        claude_messages.append({"role": "user", "content": json.dumps(payload)})

        with client.messages.stream(
            max_tokens=max_tokens,
            model=model,
            system=SYSTEM_PROMPT + "\nPrefer markdown-style emphasis when helpful (**bold**, `inline code`).",
            messages=claude_messages,
            temperature=0.35,
        ) as stream:
            for delta in stream.text_stream:
                if delta:
                    yield delta

    @staticmethod
    def _normalize_history(history: list[dict] | None) -> list[dict]:
        if not isinstance(history, list):
            return []
        cleaned = []
        for item in history[-10:]:
            role = item.get("role")
            content = item.get("content")
            if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
                cleaned.append({"role": role, "content": content.strip()})
        return cleaned

    @staticmethod
    def _build_messages(message: str, context: dict, history: list[dict]) -> list[dict]:
        context_payload = {k: v for k, v in context.items() if k != "history"}
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(history)
        messages.append(
            {
                "role": "user",
                "content": json.dumps({"question": message, "context": context_payload}),
            }
        )
        return messages
