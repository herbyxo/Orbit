# Orbit — Plan

## Done
- [x] Phase 1 — Zip parse, import extraction, React Flow graph, node detail panel
- [x] Phase 2 (partial) — Hover-dim highlighting of import neighbours
- [x] Phase 3 — AI chat with BYO-key (Anthropic/OpenAI/Google), [[highlight:path]] token parsing, graph context trimming
- [x] Phase 3b — GitHub URL parsing, landing page URL flow end-to-end

## Next (priority order)
- [ ] **Auto-summary on load** — fire one AI call when graph renders: "What is this codebase? Entry point? Major areas?" Pin to top of chat. Highest-leverage feature next.
- [ ] Node filtering by file type / directory
- [ ] Cmd+K search across nodes
- [ ] Update @anthropic-ai/sdk from ^0.30.1 to latest (currently 63+ versions behind)

## Future (Phase 4)
- [ ] Impact mode — highlight what breaks if you change a node
- [ ] Complexity signals on nodes (line count, import count)
- [ ] Subgraph focus — zoom into a directory
- [ ] Circular dependency detection (Tarjan's algorithm)
- [ ] Feature grouping — cluster nodes by feature area

## Out of scope
- Multi-repo support
- Auth / user accounts (BYO-key is intentional — no keys stored server-side)
- Paid tier (free tool)
