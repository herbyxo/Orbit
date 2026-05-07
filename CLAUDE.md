@C:\Files\Claude\memory\project_orbit.md

# Orbit — Claude Code Context

## What this is
Orbit is an AI-powered codebase visualiser for Next.js/React projects. It parses a repo into an interactive force-directed node graph (files = nodes, imports = edges) with an AI chat interface that can answer questions about the code and highlight relevant nodes.

**Tagline:** See your codebase. Talk to it.  
**Repo:** github.com/herbyxo/Orbit  
**Deploy:** Vercel (no server-side env vars required — BYO-key architecture)

---

## Tech Stack
| Layer | Choice |
|---|---|
| Frontend | Next.js App Router, plain JS |
| Graph | React Flow + d3-force layout |
| AI | Anthropic API (claude-sonnet-4-20250514), also supports OpenAI + Google |
| Repo fetching | GitHub REST API (server-side) |
| Zip parsing | JSZip (client-side) |
| Styling | Tailwind CSS |
| Deploy | Vercel |

---

## Project Structure
```
src/
  app/
    page.js                    — landing page (URL input + zip upload)
    graph/page.js              — main graph + AI chat view
    api/
      parse-repo/route.js      — GitHub URL fetch + parse (30s maxDuration)
      chat/route.js            — stateless LLM proxy
  components/
    Graph.js                   — React Flow + d3-force + hover-dim + highlight rendering
    FileNode.js                — custom node (highlighted/focused/selected/dimmed states)
    ChatPanel.js               — chat UI, reads config from localStorage
    LLMSettings.js             — provider/model/key form
    NodeDetail.js              — side panel on node click (file content)
    FileUpload.js              — zip upload component
    RepoInput.js               — GitHub URL input
  lib/
    parseZip.js                — JSZip → file map → buildGraph
    parseRepo.js               — GitHub REST API → file map → buildGraph (caps: 500 files, 200KB/file, 20MB total)
    buildGraph.js              — {path: content} → {nodes, edges, files}, classifies file types
    extractImports.js          — regex-based import extraction + path resolution
    graphContext.js            — trims React Flow nodes → AI payload
    llmProviders.js            — unified dispatcher (Anthropic/OpenAI/Google) + model catalog
```

---

## Current Build Status
- [x] Phase 1 — zip parse, import extraction, React Flow graph, node detail panel
- [x] Phase 2 (partial) — hover-dim highlighting of neighbours
- [x] Phase 3 — AI chat, BYO-key (Anthropic/OpenAI/Google), `[[highlight:path]]` token parsing, graph context trimming
- [x] Phase 3b — GitHub URL parsing, landing page URL flow end-to-end
- [ ] **NEXT: auto-summary on load** — fire one AI call when graph renders: "What is this codebase? Entry point? Major areas?" Pin to top of chat. Highest-leverage feature.
- [ ] Phase 2 remainder — node filtering by type/directory, Cmd+K search
- [ ] Phase 4 — impact mode, complexity signals, subgraph focus, circular dep detection (Tarjan's), feature grouping

---

## Design System — OpenAI-Inspired
| Token | Value | Usage |
|---|---|---|
| `--bg` | `#FFFFFF` | Page background |
| `--bg-secondary` | `#F7F7F8` | Surfaces, dropzone |
| `--text-primary` | `#202123` | Headings, body |
| `--text-secondary` | `#6E6E80` | Descriptions |
| `--green-primary` | `#10A37F` | Primary accent — buttons, links, active |
| `--border` | `#E5E5E7` | Default borders |

**Typography:** IBM Plex Sans (body) + IBM Plex Mono (code). Border radius: 12px cards, 8px buttons. No gradients, no dark backgrounds, no glow effects.

**Graph node colours:**
- Page (`app/**/page.js`): `#10A37F` green
- Component (`components/**`): `#3B82F6` blue  
- Util (`lib/**`, `utils/**`): `#8E8EA0` gray
- API route (`app/api/**`): `#F59E0B` amber
- Config (`*.config.*`): `#8B5CF6` purple
- Circular dep: `#EF4444` red

---

## Key Conventions
- **BYO-key:** User pastes their own LLM API key → stored in `localStorage` under `orbit-llm-config`. Keys never logged server-side.
- React Flow must be wrapped in `<ReactFlowProvider>`
- Graph state: React context or Zustand if it gets complex
- Zip flow: client-side parse only, no server round-trip
- GitHub flow: server-side API route only (`/api/parse-repo`)
- Optional env var: `GITHUB_TOKEN` on Vercel to lift rate limit from 60/hr → 5000/hr

---

## Product Principle
The graph is the canvas. The AI is the query engine. Every feature should answer one of:
1. Where does X live? (orientation)
2. What breaks if I change this? (blast radius)
3. Why is this PR touching 40 files? (coupling)
4. Where's the complexity hotspot? (code smell)
5. How does data flow from API to UI? (tracing)

If a feature doesn't answer one of these, it's polish not product.

---

## Git Workflow
- Branch: `git checkout -b preview/<description>`
- Show diff → get approval → merge to main
- Commit messages: imperative, lowercase (`add auto-summary on graph load`)
- Never commit .env or API keys
