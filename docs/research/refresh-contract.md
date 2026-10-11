# Proposed catalog refresh contract

Research specification only; no application code, schema, scheduled task, or hosted endpoint has been created. Parent security/data/accountability review remains required. This design does not admit a retailer or grant access rights.

## Public read boundary

The catalog route exposes only GET/HEAD. It has a fixed source registry in reviewed source code. Visitors cannot supply ingestion URLs, records, adapter names, refresh intervals, credentials, redirects, or a force-refresh parameter. Query parameters used by the client for browsing never select a server fetch target. Reject write methods and unrecognized acquisition inputs without side effects.

An ordinary read may start a server-owned acquisition when the admitted source's bounded cache is due. The resulting persistence is an internal cache operation, not a public administrative writer. The source registry, parser, validation, lease duration, request budget and retention are deployment-controlled. The parent must confirm that this meets the authorized boundary before implementation. No arbitrary fetching, browser-submitted stock or synthetic production rows.

## Concurrency and source load

In-memory single-flight alone cannot coordinate Worker instances. [Cloudflare Cache API documentation](https://developers.cloudflare.com/workers/runtime-apis/cache/) states that cache contents do not replicate beyond their originating data center. Use durable shared coordination rather than relying on one isolate's memory or one edge cache.

A possible D1 design uses one source-state record with a bounded acquisition lease, next-allowed-attempt time, active generation, last successful check, and failure health. Claim a due lease atomically; only its owner may publish, release, or extend it. Compare the lease token when publishing so a timed-out older operation cannot overwrite a newer generation. An expired lease permits recovery after a crash, with no permanently stuck refresh. A losing read serves the existing generation and health status instead of launching another acquisition.

Perform network work outside the database operation. Never hold an interactive SQL transaction open across HTTP requests. [D1's documented batch interface](https://developers.cloudflare.com/d1/worker-api/d1-database/) provides transactional rollback for failed batches; its [prepared statement interface](https://developers.cloudflare.com/d1/worker-api/prepared-statements/) binds values. These support a proposed atomic publication step, but do not establish that the implementation is correct. Migrations belong to deployment preparation, not runtime request handlers.

Every admitted adapter needs limits for response bytes, request timeout, page count, item count, redirects, retries and total acquisition duration. Restrict redirect destinations to reviewed source hosts and paths. Respect Retry-After and supported conditional requests. A denied origin, challenge, exhausted quota or unsupported representation stops acquisition; do not change IPs, impersonate a browser, strip protections or probe private endpoints.

TTL is server-controlled and no shorter than source policy or justified load budget. The parent-proposed unattended trigger is an hourly automation reading the verified public endpoint. The available parent automation tool has no linked-Site metadata field; do not invent one. Scheduling must be recorded honestly as an external hourly read, with any Sites-native scheduling compatibility checked separately.

## Validation and publication

Validate the actual fetched response, not a research crawl or source documentation example. Preserve a stable source-level unit/offer identity. Admit only valid USD integer-cent prices and explicit source-supported stock/fulfillment evidence. Unknown fulfillment is unknown. Validate canonical links and image hosts separately, with media rights recorded by source. Exclude private/customer fields and source HTML, scripts, hidden metadata and credentials.

Paginated or multi-page acquisition must establish completeness before replacing a source's active generation. A failed page is not an empty page. An unexpectedly empty result needs a source-specific valid-empty signal; a parse failure or layout change must preserve the prior catalog and expose failure health. A disappeared item may be classified as absent only after a complete successful source acquisition. Absence is not automatically proof of sale.

Construct and validate the entire new snapshot, then atomically replace the active snapshot and advance its monotonic generation. Keep content generation distinct from a successful unchanged check. A conditional 304 can confirm the same upstream representation, with its semantics documented; it must not claim an item-level source event timestamp. A fetch attempt never makes old prices newly observed.

Keep content generation distinct from representation revision as well. A successful unchanged check or a new failure can change check times, freshness or health without creating a newly listed offer. The public response validator must cover those exposed fields; an ETag containing only content generation could incorrectly leave a browser's health/freshness state unchanged forever. A client accepts newer metadata for unchanged content without reordering cards or announcing new offers. Per-request serving time belongs in response metadata rather than a volatile content hash that disables every conditional response.

Expiry must still work while a phone is offline or its wall clock is wrong. Treat server observation/expiry times as authoritative, test client clock skew and suspension/resume, and revalidate on return. A failed/offline check must not extend freshness. Distinguish an item actually observed again in a validated successful response from a retained value after a failed request.

Per-source failures do not erase healthy source results. Responses expose the active generation, source check time, original observation time, freshness deadline and simple source health. Expired offers leave current availability/savings results even if the last snapshot remains available to explain failure. Saved items may retain a minimal last-known observation with an explicit unavailable/stale status; source retention rules still apply to that local copy.

Persist only the necessary bounded licensed/factual snapshot, not a growing event history or raw payload archive. Runtime data must never enter the permanent public Git history. Review the storage platform's automatic backups and retention as well as deletion in active tables; erasing a row does not by itself prove every retained copy has expired. If source rules demand a shorter retention than supported storage provides, select an allowed storage approach or keep that source blocked.

## Browser appearance without reload

The visible client periodically revalidates the catalog with a lightweight conditional request. Its timer is independent of the source fetch TTL, so many browser polls do not cause many origin fetches. Pause while hidden, revalidate on visibility/online, avoid overlap, back off on errors, and ignore older/out-of-order responses. Maintain filters, saves, open detail state and scroll when a newer generation arrives.

Announce newly available results politely and once. Do not steal focus or suddenly move the card the shopper is reading. New source generations can appear while the user remains on the page. Derive the disclosed latency from the actual source-exposure delay, cache TTL, unattended hourly check phase, acquisition time and client revalidation delay. A job that fires just before the TTL expires may defer acquisition until the next scheduled read, so do not casually promise a one-hour maximum when TTL/schedule phase can extend it. No promise of instant retailer return events or background execution by a sleeping iPhone app.

## Free operating budget to verify

These are underlying-platform research limits, not an assertion about the billing or quotas of ChatGPT Sites. Confirm the actual supported deployment before treating them as applicable. No Cloudflare account, subscription, limit increase or billing change is authorized here.

[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) documents free daily limits of 5 million rows read and 100,000 written, counts scanned rows rather than returned rows, and says row size does not change that count. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) bound a string/blob/table row to 2,000,000 bytes and free database size to 500 MB. A compact bounded source snapshot keyed by source can reduce reads relative to returning hundreds of individually scanned offer rows on every browser poll; it still needs atomic generation/lease correctness and a strict serialized-byte cap. This is a proposal, not a measured optimization.

As an illustrative calculation, 100 continuously visible clients polling each minute generate 144,000 daily dynamic reads. Scanning 360 offers each time would scan 51.84 million rows; reading one bounded snapshot would read 144,000 snapshot rows, plus coordination/metadata operations. Hidden-client pauses and short sessions change the load. Measure actual query metadata, bytes, CPU and requests on the eventual candidate.

[Workers limits](https://developers.cloudflare.com/workers/platform/limits/) separately document free request, CPU, subrequest and connection bounds. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) distinguishes static-asset requests from dynamic Worker requests and explains that Worker cache hits still count as requests. A small conditional response reduces bytes; it does not prove that public polling is free at arbitrary traffic. Prefer one shared client subscription, bounded visible polling and error backoff, with no paid fallback silently enabled.

## Required evidence before a live-update claim

1. Exact deployed source commit and public catalog route, with permitted source/actual response acquisition.
2. Concurrent hosted reads demonstrate bounded source attempts and one valid publication, including lease expiry and late-result rejection.
3. A source/schema failure preserves the previous observation times, reports failure, and removes expired availability/savings claims.
4. The unattended automation runs without a foreground visitor, starts the bounded source acquisition, persists the resulting generation, and records public readback.
5. A browser already open observes a subsequent generation without navigation/reload and preserves shopping state. An isolated synthetic test may verify races/appearance, but cannot substitute for actual source acquisition and actual unattended persistence proof.
6. Cross-source partial failure, valid empty inventory, sold/absent units, unchanged responses, stale comparisons, and delayed source exposure are exercised separately.

All these checks are currently NOT RUN. A successful manual request alone does not prove unattended operation, and a created schedule alone does not prove that it executed.

## Actual change trace required by the parent

Record a baseline and a subsequent actual source addition, plus an actual disappearance or material change of a previously seen source identity. Capture the exact source identity and supported public observation facts, source-acquisition start/end, protected publication revision, public readback revision, and already-open browser appearance time. Record acquisition-to-publication and publication-to-client latency separately; where an independent source observation exists, report observation-to-client delay. Keep permissible evidence outside permanent catalog data in Git and follow source retention rules.

A retailer's private return/listing event time is generally unknown. Bound the publicly observed change between the last successful prior observation and the first successful changed observation; never substitute first-seen time for an internal event timestamp. A complete catalog absence means no longer listed, not necessarily sold. Cached research counts from separate crawls cannot establish a source change trace. If no natural qualifying event is observed, mark that criterion NOT OBSERVED, even if isolated synthetic generation/race tests pass.
