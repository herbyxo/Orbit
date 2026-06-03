# Production Readiness — Orbit — 2026-06-01
**Stack:** Next.js 14.2 (App Router, JS — no TS) · Vercel (assumed) · no database   **Slug:** orbit

**Stage assumption:** solo-builder side project, pre-launch / low-traffic. Graded for that stage, not enterprise SRE.

**Architecture note:** Orbit is a stateless tool. It parses public GitHub repos server-side and runs a BYO-key AI chat over the resulting graph, with a free Groq tier as fallback. No Supabase, no auth, no database, no user data at rest. That removes a whole class of risk (RLS, auth, storage all n/a) but concentrates the remaining risk on the two public API routes: `/api/parse-repo` and `/api/chat`.

## Scorecard
| # | Dimension | Status | Severity | Summary |
|---|---|---|---|---|
| 1 | Frontend | ⚠️ partial | nit | Builds; client try/catch present but no error.tsx/loading boundaries |
| 2 | APIs & backend logic | ✅ solid | — | Both routes validate input, opaque errors, key never logged |
| 3 | Database & storage | ➖ na | — | Stateless tool — no DB or storage |
| 4 | Auth & permissions | ➖ na | — | No accounts; BYO-key model, nothing to gate |
| 5 | Hosting & deployment | ⚠️ partial | warning | No .env.example/vercel.json; deploy method unverified |
| 6 | Cloud & compute | ⚠️ partial | nit | maxDuration=30 set; region/runtime defaults, not deliberate |
| 7 | CI/CD & version control | ⚠️ partial | warning | Clean .gitignore, no secrets tracked; no CI pipeline at all |
| 8 | Security & RLS | ➖ na | — | No DB/RLS; secrets server-side only, no NEXT_PUBLIC leak |
| 9 | Rate limiting | ❌ missing | critical | parse-repo unlimited; chat limiter in-memory + free-tier only |
| 10 | Caching & CDN | ⚠️ partial | nit | Vercel CDN default; no deliberate caching, no staleness bug |
| 11 | Load balancing & scaling | ✅ solid | — | Serverless auto-scales; no raw DB pool; size/file caps in place |
| 12 | Error tracking & logs | ❌ missing | warning | console.error only; no Sentry, no log drain (~1h retention) |
| 13 | Availability & recovery | ❌ missing | warning | No uptime monitor, no error boundaries, no kill switch |

**Readiness: 2/13 solid · 5 partial · 3 missing · 3 n/a.** Top risk: **rate-limiting** (denial-of-wallet on the free Groq tier + GitHub-token abuse).

## 🔴 Critical (close before launch/scale)

- **[rate-limiting]** `/api/parse-repo` has **no rate limiter**. It triggers 1 tree call + up to 500 raw-file fetches against GitHub per request using the server's `GITHUB_TOKEN`. An attacker can loop it to burn the 5000/hr token quota (denying service to all users) or just hammer the function. The chat limiter (`freeTierMap`, 30/hr per IP) is better but has two holes: (a) it's **in-memory**, so it resets on every cold start and isn't shared across serverless instances — real limit is effectively `30 × instance count`; (b) it only guards the **free-tier (no-key) path** — which is correct for cost, since BYO-key calls spend the user's own money, but the parse route is still wide open.
  - **Fix:** add `@upstash/ratelimit` + Upstash Redis (free tier), sliding window keyed by IP, applied to **both** routes via `middleware.js` (tighter window on `parse-repo`, e.g. 10/min). Keep the free-tier token cap as a second layer. As an edge backstop, add a Vercel WAF rate rule if on Pro. AI cost is already bounded by `max_tokens: 1000` and the Groq free tier — good.

## 🟡 Warning (should close)

- **[hosting-deployment]** No `.env.example`. The app reads `GROQ_API_KEY` and `GITHUB_TOKEN` but nothing documents them — a fresh deploy silently loses the free tier and drops to GitHub's 60/hr anonymous limit. **Fix:** add `.env.example` with both names (values empty), and confirm both are set in Vercel project env (production). Verify prod is git-auto-deploy, not manual CLI.
- **[cicd-version-control]** No CI pipeline (`.github/workflows/` absent) and no `lint`/`typecheck` scripts in `package.json` — only `dev`/`build`/`start`. Nothing catches breakage before it ships beyond Vercel's build check. `.gitignore` is clean (no tracked secrets or build artifacts — good). **Fix:** add a minimal GitHub Action running `npm ci && npm run build` on PR; add an `eslint` script. Branch protection optional at this stage.
- **[error-tracking-logs]** Only `console.error` — on Vercel Hobby that's ~1h retention, so you can't reconstruct an incident. No Sentry. User-facing errors are correctly opaque (`humanizeLLMError` strips key fragments — good). **Fix:** add `@sentry/nextjs` (free tier) with `instrumentation.js`; optionally a Vercel log drain to BetterStack/Axiom.
- **[availability-recovery]** No uptime monitor, no `error.tsx`/`global-error.tsx` boundaries (a thrown render error white-screens the app), no kill switch for the free Groq tier (can't disable runaway spend without a redeploy). No DB so backups are n/a. **Fix:** add UptimeRobot/BetterStack ping on prod; add `error.tsx` + `global-error.tsx`; gate the free tier behind an env flag (`FREE_TIER_ENABLED`) as a kill switch.

## 🟢 Nit / verify-in-dashboard

- **[frontend]** Add route-level `loading.js` and `error.tsx` so parse/chat latency and failures show graceful UI instead of a frozen page. (Overlaps the recovery fix above.)
- **[cloud-compute]** `maxDuration = 30` is set on both routes (good for 10–20s repo parses). Runtime is default Node and region is default — fine at this scale; no Supabase to co-locate with, so region is moot. Consider Vercel Fluid compute if cold starts bite the parse route.
- **[caching-cdn]** Vercel Edge CDN serves static assets by default; no custom `headers()` override, no `force-cache`/`no-store` misuse, no staleness bug (no DB reads to go stale). Nothing to fix — verify `_next/static` immutable caching isn't overridden in the dashboard.
- **[backend-apis]** Both routes validate input at the boundary and classify client vs server errors. Run `/project-audit` for depth if desired.

## n/a rationale
- **database-storage / auth-permissions / security-rls** — Orbit stores nothing and has no accounts. These are genuinely not applicable, not dodged. The security surface that *does* exist (server-side secrets, opaque errors) is handled correctly.
