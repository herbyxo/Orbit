# Orbit — Flows

## Zip upload flow
```
User uploads .zip file on landing page
  → FileUpload component reads file client-side
  → lib/parseZip.js (JSZip) → file map {path: content}
  → lib/buildGraph.js → {nodes, edges, files}
  → lib/extractImports.js resolves import paths to node IDs
  → Navigate to /graph with graph state
  → React Flow renders force-directed layout
```

## GitHub URL flow
```
User pastes GitHub URL on landing page
  → POST /api/parse-repo (server-side, 30s maxDuration)
  → GitHub REST API fetches repo zip
  → Caps applied: 500 files, 200KB/file, 20MB total
  → Same buildGraph → extractImports pipeline as zip flow
  → Navigate to /graph
```

## Graph interaction flow
```
User hovers a node
  → Neighbours (direct imports) highlighted, others dimmed

User clicks a node
  → NodeDetail side panel opens
  → Shows file path + full source content

User clicks empty canvas
  → All nodes return to default state, side panel closes
```

## AI chat flow
```
User types question in ChatPanel
  → lib/graphContext.js trims React Flow nodes → AI payload (path, type, import list)
  → POST /api/chat with graph context + conversation history
  → Server proxies to selected LLM provider (lib/llmProviders.js)
  → Streamed response rendered in chat
  → [[highlight:path/to/file]] tokens parsed → corresponding nodes highlighted in graph
```

## LLM settings flow
```
User opens LLMSettings panel
  → Selects provider (Anthropic/OpenAI/Google) + model
  → Pastes API key
  → Saved to localStorage under 'orbit-llm-config'
  → All subsequent chat calls use this config
  → Key never sent to server — only used client-side for API calls via /api/chat proxy
```
