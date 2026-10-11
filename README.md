# Open Box Finder

A responsive English/Russian app for open-box deal discovery, local pickup, shipping, and device-local saves. Canonical source: https://github.com/peterkrasniy/open-box-finder.

**Current milestone:** the UI and tested domain/refresh foundation are implemented. All retailer adapters are disabled. The catalog is empty; this is not live inventory completion. The public UI is deployed at https://open-box-finder.peter-krasniy.chatgpt.site. The executor cannot verify its public HTTP surface because the configured proxy denies the connection before origin. Real permitted source acquisition and unattended refresh remain pending.

## Run and edit

Use Node 24 (minimum 22.13) and npm. A fresh canonical GitHub clone at the version-4 commit was installed, tested, typechecked, linted and built in an isolated clean checkout in this environment; framework-generated build IDs can differ. Install the committed dependency state with `npm ci`, then run `npm run dev`. The app's own UI lives in `components/`, client hooks in `hooks/`, offer/filter/price/persistence rules in `lib/`, and protected acquisition modules in `lib/server/`. English/Russian strings are in `lib/i18n.ts`; responsive styles are in `app/globals.css`. The original app-icon source is in `assets/`; only the derived install icons ship from `public/icons/`.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` before sharing changes. `npm run db:generate` creates the D1 migrations after schema edits. Runtime data is not seeded in source. Synthetic records are confined to tests and isolated browser fixtures.

## Sources and freshness

A source is admitted only after permitted acquisition, actual item availability, stable exact identity, price/reference semantics, freshness, and media rights are checked. `lib/sources.ts` contains the current admission state; `docs/research/source-feasibility.md` records the broader retailer review. Directory links, cached research observations, syndication, and verified unit inventory are distinct.

The source transport uses fixed developer-defined HTTPS endpoints, bounded responses, no redirects, timeouts and server backoff. The inactive durable writer uses a D1 database lease, daily quota, strict next-sequence publication and source admission gates. Schema-only local migrations and compiled Worker reads are tested. Hosted source acquisition and unattended execution are not verified; the publication map remains empty. The accepted timestamped private A4L preflight was consumed during a canceled hosted invocation, with no persisted observation. Its marker prevents replay. A local lifecycle fix retains the same bounded maintenance promise with the trusted Worker waitUntil hook; it neither renews the grant nor admits inventory. Public visitors cannot submit records or set ingestion URLs. Shopper preferences and saved identity/link pointers stay in this browser; prices and offer payloads are not stored in localStorage.

Comparisons appear only with a fresh supported reference for the exact variant, labeled as current-new/MSRP/retailer-list/regular/previous price. Unverified comparisons do not produce a savings percentage. Local delivery does not imply national shipping. Pickup directions target the verified exact branch.

## Publish and update

This project uses the official Sites starter and source workflow. Preserve the SDK Vite integration and the exact project ID in `.openai/hosting.json`. Use the Sites tools and official helper workflow for source preparation, build, archive, saved version and deployment. Keep the same exact source commit synchronized to canonical GitHub and Sites; runtime catalog changes must not require republishing or copying licensed offer data into Git.

For an update from any device, edit this canonical repository through GitHub or a cloned checkout, then open the project in Codex and request the change be built, checked and published to the existing Sites project. Reuse the project ID and run the official source workflow, which prepares and pushes the exact source before archiving. Save that exact commit as a Sites version, deploy the saved version, and verify the returned deployment status and public HTTP behavior. A GitHub edit alone does not redeploy the site. Preserve the existing public audience; never recreate the project or overwrite unrelated source work.

Review `docs/source-integration-review.md` before enabling any source. Its concrete maintenance boundary preserves the parent-owned source/security acceptance. Database schema migrations contain no retailer records. The database binding is private to the Worker; the public read route rejects query-controlled acquisition and write methods.

Do not add retailer credentials, enroll in affiliate programs, purchase services, grant new access, expose administrative writes, or change environment security without specific approval. Standard Sites source credentials stay memory-only. `docs/evidence-ledger.md` and `docs/release-quality-checklist.md` track completed checks and remaining limits. Native iPhone/VoiceOver and real unattended refresh are not yet verified.
