# Open Box Finder

A responsive English/Russian app for open-box deal discovery, local pickup, shipping, and device-local saves. Canonical source: https://github.com/peterkrasniy/open-box-finder.

**Current milestone:** the UI and tested domain/refresh foundation are implemented. All retailer adapters are disabled. The catalog is empty; this is not live inventory completion. Sites project `appgprj_6acb528da4a48191add3aaa8e181af8f` is registered but publication and real unattended source acquisition are still pending.

## Run and edit

Use Node 24 (minimum 22.13) and npm. Install the committed dependency state with `npm ci`, then run `npm run dev`. The app's own UI lives in `components/`, client hooks in `hooks/`, offer/filter/price/persistence rules in `lib/`, and protected acquisition modules in `lib/server/`. English/Russian strings are in `lib/i18n.ts`; responsive styles are in `app/globals.css`.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` before sharing changes. `npm run db:generate` creates the D1 migrations after schema edits. Runtime data is not seeded in source. Synthetic records are confined to tests and isolated browser fixtures.

## Sources and freshness

A source is admitted only after permitted acquisition, actual item availability, stable exact identity, price/reference semantics, freshness, and media rights are checked. `lib/sources.ts` contains the current admission state; `docs/research/source-feasibility.md` records the broader retailer review. Directory links, cached research observations, syndication, and verified unit inventory are distinct.

The source transport uses fixed developer-defined HTTPS endpoints, bounded responses, no redirects, timeouts and server backoff. The proposed durable writer uses a database lease, daily quota, and atomic public-envelope publication. It is not yet connected or verified end to end. Public visitors cannot submit records or set ingestion URLs. Shopper preferences and saved identity/link pointers stay in this browser; prices and offer payloads are not stored in localStorage.

Comparisons appear only with a fresh supported reference for the exact variant, labeled as current-new/MSRP/retailer-list/regular/previous price. Unverified comparisons do not produce a savings percentage. Local delivery does not imply national shipping. Pickup directions target the verified exact branch.

## Publish and update

This project uses the official Sites starter and source workflow. Preserve the SDK Vite integration and the exact project ID in `.openai/hosting.json`. Use the Sites tools and official helper workflow for source preparation, build, archive, saved version and deployment. Keep the same exact source commit synchronized to canonical GitHub and Sites; runtime catalog changes must not require republishing or copying licensed offer data into Git.

Do not add retailer credentials, enroll in affiliate programs, purchase services, grant new access, expose administrative writes, or change environment security without specific approval. Standard Sites source credentials stay memory-only. `docs/evidence-ledger.md` and `docs/release-quality-checklist.md` track completed checks and remaining limits. Native iPhone/VoiceOver and real unattended refresh are not yet verified.
