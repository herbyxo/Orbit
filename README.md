# Orbit

AI-powered codebase visualiser for Next.js/React projects.

Parses a repo into an interactive force-directed node graph (files = nodes, imports = edges) with an AI chat interface that can answer questions about the code and highlight relevant nodes.

**Tagline:** See your codebase. Talk to it.

## What it does

- Paste a GitHub URL or upload a zip → get an interactive graph of your codebase
- Click any node to see the file contents
- Hover a node to highlight its import neighbours
- Chat with an AI about the code — it knows the graph structure and can highlight relevant files

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: set `GITHUB_TOKEN` in `.env.local` to raise the GitHub API rate limit from 60/hr to 5000/hr.

## AI setup

Orbit uses a BYO-key model — paste your own API key in the settings panel. Supports:
- Anthropic (Claude) — recommended
- OpenAI (GPT-4o)
- Google (Gemini)

Keys are stored in `localStorage` only and never sent to the server.

## Deploying

```bash
vercel deploy
```

No server-side env vars required for core functionality. Add `GITHUB_TOKEN` as a Vercel env var to lift the GitHub rate limit.

## Tech stack

- Next.js App Router (plain JS)
- React Flow + d3-force (graph)
- Anthropic / OpenAI / Google AI SDKs
- Tailwind CSS
