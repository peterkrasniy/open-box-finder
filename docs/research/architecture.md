# Open Box Finder: research and acceptance gates

Status: research only. No application implementation or Site registration has begun.

## Time and evidence gates

- Research gate: October 11, 2026, 08:38 UTC. Application code must not precede this time or the parent evidence handoff.
- Minimum overall project work: through 13:38 UTC, with substantive work rather than waiting to satisfy a timer.
- Record the first complete version's UTC timestamp and source commit. Then perform at least one full hour of substantive auditing, refactoring, performance work, and realistic shopping journeys. Extend the finish time if necessary.
- The parent retains ownership of source integrity, UX/accessibility, data reliability, security/performance, and accountability audits. Findings must be incorporated and evidenced.
- Publication and canonical public GitHub source are authorized. Public visitors may read the app; they must not receive administrative writes, secrets, private profiles, or credentials.
- Free implementation only. No new retailer credentials, signups, access grants, security changes, or purchases without specific approval.

## Source admission

A source needs applicable-use review, a permitted/authenticated acquisition path, actual item data, an explicit availability interpretation, usable item identity, a supported freshness policy, and verified price/comparison semantics. Separate facts (model/price/availability) from protected photographs, descriptions, logos and payloads. Lack of an affirmative feed license is not automatically a ban on factual comparisons. Actual access/automation/contract restrictions still apply and must not be bypassed. An accessible outlet page or search result is not an admitted inventory adapter.

Separate source states: permitted item feed, credential/approval required, permission unclear, redistribution restricted, and manual retailer browsing only. An unavailable research fetch is not proof that the retailer has no inventory. Never use guessed prices, photographs, discounts, stock, store associations, or fabricated demonstration listings in production.

DealNews's permitted unmodified syndication is distinct from retailer unit inventory. Its feed display must preserve complete supplied content, links, and referral codes, with attribution. Do not translate or reshape licensed feed content into apparently verified retailer offers. Parent research found HTTP 200 and 49 entries; this environment's outbound proxy blocks the feed, so hosted end-to-end access still needs verification. Feed announcement time and fetch time do not verify current checkout stock or local-unit availability.

## Proposed architecture, pending admitted sources

Use a small Sites-hosted Worker for server-side, fixed-allowlist source fetching and a mobile-first client. The Worker can cache permitted reads for the source's supported lifetime, deduplicate simultaneous fetches, use conditional requests when supported, and return explicit source health and observation times. Public endpoints are GET/HEAD only. No browser-supplied URL fetching or public ingestion/write endpoint.

A regular browser poll can show new permitted listings without a reload. Pause while hidden, resume on visibility/online, prevent overlapping requests, back off on failure, and avoid replacing newer data with a late older response. Initial loading, successful empty results, source failure, stale data, filtered-empty, offline state, and source-not-connected need distinct copy. A browser poll is not an unattended background update. The hard original goal requires an actual unattended acquisition job, protected persistence, generation readback and client appearance without a reload. Source-supported five-minute/hourly latency may be disclosed honestly; never promise instant internal return events.

Keep expiring retailer data outside permanent public Git history. The canonical repository stores acquisition code, source configuration, schema, and evidence summaries; live observations belong in bounded runtime storage. Sites D1 is the documented structured-data option. A scheduler and any updater must use supported authorization; no public administrative writer or arbitrary-source endpoint is acceptable. Follow Sites' recurring-update workflow and verify actual acquisition, protected persistence, atomic generation publication and client readback. Do not casually substitute republishing or a static checked-in catalog for durable updates.

One candidate worth reviewing is source-controlled read-through caching: a fixed read route fetches only the approved source, atomically persists source facts when its cache is due, and exposes a public generation. A native scheduled read could trigger the same acquisition unattended. This is not an implemented or approved writer design. Confirm with security/accountability audits whether deterministic server-owned cache refresh on a public read meets the no-anonymous-write boundary; it must never accept client-supplied catalog changes. Otherwise a supported protected update path is required, and new authorization remains subject to specific approval.

Each normalized inventory offer, where normalization is licensed, needs source ID, item/offer identity, canonical item URL, condition, current price in integer cents, currency, availability scope, image authorization, fetched/observed times, and optional supported comparison metadata. Comparison metadata needs price, basis (current new / retailer regular / MSRP / former price), exact matched model/variant, and its source/time. Unknown fulfillment is neither shipped nor local.

The saved/interested list and preferences belong to this browser/app context. No account is required. Handle blocked storage, malformed/old versions, and quota errors gracefully. Do not imply synchronization across phones or automatic migration/sharing between Safari and an installed Home Screen app. Saved missing/stale items retain their last observation and a clear status instead of appearing freshly available.

## Savings and location invariants

- A comparison must be supported, same currency/model/variant, and strictly greater than the current price. Otherwise show no discount badge and exclude the offer from biggest-savings rankings.
- Do not promote a historic MSRP as a current-new price. A red struck-through comparison must have a visible basis.
- Percent discount = (comparison cents - current cents) / comparison cents; dollar savings = comparison cents - current cents. Use unrounded values for ranking, consistent displayed rounding, and stable tie-breaking.
- Rankings may use supported exact-variant MSRP/list/was/typical/comparable references if every card names its actual basis and the sort explicitly means advertised-reference savings. Current-new-only ranking is an optional stricter mode, not a required limitation. Unknown, stale, unmatched, zero and nonpositive comparisons are excluded.
- Local offers require actual offer-level pickup/store evidence and an exact store destination. Ordinary SKU stock or a retailer's store directory cannot establish open-box availability.
- Radius is miles, measured from the user-selected location to the verified pickup destination. Default location is Rocklin/Sacramento. Square source area searches require a true-distance postfilter.
- Never use a user's current location as the Navigate destination. If a store is not established, do not show a pickup Navigate action.

## Experience requirements

Retailer multi-select; categories; search; local/shipped/both; editable location/radius; min/max price; percent/dollar savings sorting; persistent English/Russian UI toggle at the top; per-phone saved/interested list; usable official product photographs and small retailer logos only where licensed; polished responsive iPhone-like presentation; accessible names, focus, keyboard operation, contrast, and reduced-motion support.

Retailer selections are OR within the selected retailers and AND across filter dimensions. None selected means none, not all. Price boundaries are inclusive; invalid ranges show an explicit error. Catalog replacement is atomic and a fetch failure must not create false sellout states. Source observation timestamps are immutable and separate from server fetch/cache times.

Every detail/page/sheet has a clear Back or Close. Maintain one active layer, preserve filter state/scroll, restore focus on close, avoid repeated-tap races, and use accessible modal semantics. Design empty/error states with the same care as populated results. Use restrained transitions and readable simple copy.

Create an original app icon and correct PWA manifest plus apple-touch-icon, including appropriate sizes, maskable safe areas, app name, start URL, scope, standalone display, theme/background colors, and accessible installation instructions when appropriate. Verify Add to Home Screen behavior as far as supported browser tooling permits.

## Delivery and source continuity

The canonical source is https://github.com/peterkrasniy/open-box-finder. Keep it synchronized with the exact deployed app source and follow Sites' own source preparation/push/commit workflow. Persist the Site ID once, preserve manifest fields, use creation_intent=user_requested, and publish publicly only through supported tools. Source write credentials belong in session memory and stdin only, never files or command arguments.

This image currently exposes Sites native tools and cloud skill references, but no installed Sites helper scripts were found under /workspace or /opt/codex. Resolve the supported helper provisioning path before packaging/publishing. Do not invent a successful Sites source workflow.

Final evidence must include the literal verified public URL, canonical public source commit, matching Sites source commit if separate, meaningful tests, source freshness behavior, remaining coverage limits, and the first-complete/audit interval evidence. A directory or mock inventory cannot satisfy live inventory completion.
