# Orbit — Agents & Automation

## AI Chat (/api/chat)
- **Trigger:** User message in ChatPanel
- **Model:** User-selected via LLMSettings (Anthropic Claude recommended, also OpenAI/Google)
- **Context:** Graph structure trimmed by lib/graphContext.js (node paths, types, import edges)
- **Output:** Streaming text response + [[highlight:path]] tokens to highlight graph nodes
- **Key convention:** BYO-key — user's API key from localStorage is passed through. Never logged server-side.

## Auto-summary (planned)
- **Trigger:** Graph renders for first time
- **Model:** claude-sonnet-4-6 (quality matters for first impression)
- **Prompt:** "What is this codebase? What's the entry point? What are the major areas?"
- **Output:** Pinned message at top of chat

## No scheduled agents or background automation — Orbit is a stateless tool.
