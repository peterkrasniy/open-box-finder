# Offline checked-product refresh

The authorized parent agent performs two refresh runs per day. The parent controls the scheduled times and timezone, collection permissions, repository synchronization, and the existing owner-private deployment. This command consumes checked observations from a JSON file. It does not collect retailer pages, schedule itself, enable an inventory adapter, or call an administration endpoint.

## Parent procedure for each run

1. Read the previous source status and latest retained product/history records. Recheck the source-specific admission and current source restrictions before collection. Collect only from sources whose current permission or approved feed covers the intended facts and photos. A readable page or a `manual-only` registry entry does not admit a recurring catalog collector. Stop for access denial or challenges; preserve existing cooldowns and holds. Do not substitute another route, credentials, enrollment, payments, or transport changes.
2. Keep Direct Tools Factory Outlet collection held unless DTO supplies applicable permission or an authorized feed/export. Its [official terms](https://www.directtoolsoutlet.com/policies/terms-of-service), checked October 12, 2026, prohibit automated and manual catalog copying. The public-search-engine exception does not cover this app's refresh. Record a failed check with `reason: "permission-held"`, `complete: false`, and an empty products array. Existing DTO snapshots expire at their existing deadline; a hold does not extend the observation time or imply removal.
3. For every eligible product, verify the exact selected variant's available stock, positive USD price, qualifying condition, manufacturer/model, direct product link, and photo attribution. Distinguish an actually loaded/visually checked photo from a supplied photo URL in the source evidence. Keep one offer per normalized `manufacturer:model` product family; colors or duplicate condition offers do not increase the product count. Preserve the record's source/id when its URL changes. `productKey` identifies the family; `scopeKey` identifies the exact catalog scope checked.
4. Create a batch outside the public repository containing only `{ "checks": [...] }`. Use actual UTC observation timestamps and a review window of at most 24 hours. `complete: true` is appropriate only when successful collection proves the entire declared source/scope was covered. A partial success may update observed products and explicitly confirmed unavailable products; omission from that partial result preserves prior records. A failed check cannot contain products, unavailable evidence, or a completeness claim.
5. Run the default dry-run and inspect the changes, eligible count, source outcomes, direct links, and any archive decisions. Resolve rejected input rather than editing timestamps to evade freshness or rollback checks. An unavailable entry needs the existing record's exact URL as evidence. No uncertain or sold-out offer belongs in the successful products array.
6. Apply the reviewed local batch with `--apply`. Run the focused refresh tests plus the repository's applicable validation. The parent then synchronizes the exact reviewed revision and uses the established deployment workflow to update the existing owner-private site. This CLI does not publish or modify audience settings. Check the hosted result and existing saved links after deployment; preserve private audience, profiles, device saves, and private research evidence.
7. Retain the factual, permission, completeness, and photo-verification evidence privately with its check timestamps. Never place customer identities, profile/location data, credentials, request headers, copied page payloads, or private research traces in the checked-product batch or public catalog/history. The structural whitelist rejects additional fields; accepted factual text still requires the parent's privacy review.

No scheduled automation is installed by this implementation. Configure the two daily parent runs through the parent's authorized scheduling workflow. A scheduler alone grants no new retailer permission or deployment access.

## Command and batch contract

Node 22.13 or newer is required, as for the rest of this repository.

```sh
node scripts/refresh-manual-catalog.mjs /private/path/checked-products.json
node scripts/refresh-manual-catalog.mjs /private/path/checked-products.json --apply
node --test tests/manual-refresh.test.ts
```

`--data-dir DIR` selects a separate local directory containing the three existing data files, useful for an isolated review or fixture. It defaults to the repository's `data` directory. The default dry-run validates inputs and prints a summary without writing any files; `--apply` is required for mutation.

A successful check has this structure; `products` must contain complete `ManualProduct` objects validated by `lib/manual-snapshot-schema.ts`:

```json
{
  "checks": [
    {
      "sourceId": "newegg-manual",
      "scopeKey": "refurbished-computers",
      "checkedAt": "ACTUAL_ISO_UTC_CHECK_TIME",
      "status": "success",
      "complete": false,
      "products": [],
      "unavailable": []
    }
  ]
}
```

The placeholder time above must be replaced with a real check time. An empty successful partial check reports a successful check without freshening any product. An empty successful complete check archives prior unarchived records in that exact scope; use it only with independently established complete-scope absence evidence.

Each incoming product requires a nonempty `productKey`, matching `sourceId` and `scopeKey`, `recordType: "manual-observation"`, `observedStock: "available"`, `availability: "unknown"`, a positive integer `observedPriceCents`, `currency: "USD"`, allowed source/photo URLs, and valid `reviewedAt`/`reviewUntil`. The stored snapshots remain bounded observations; they are not live inventory guarantees. New snapshots cannot arrive already archived. Archive decisions are generated by the merge. Existing legacy records may retain their original missing optional keys until legitimately rechecked.

For a failed source, use `status: "failed"`, `complete: false`, `products: []`, and one of `access-denied`, `network-error`, `parse-error`, or `permission-held` as `reason`. Last successful check time and product timestamps remain intact. Check times must be within 24 hours of the local trusted clock, allowing at most 30 seconds of forward clock skew. Neither source state, product observation, nor archive history can move backward.

## Local persistence and recovery

Apply writes `data/manual-records.json` and `data/manual-refresh-status.json` (`schemaVersion`, content-based `revision`, `sources`). It appends new immutable before/after events to `data/manual-history.jsonl`; it never deletes old records or history. Archives remain available for saved-identity resolution. URL changes retain `previousUrls`, including earlier links. Replaying an identical check produces no duplicate change events.

The only writes are those local data files, a temporary staging directory, and an exclusive `.manual-refresh.lock` beside them. Input and target files must be ordinary files, so symlink targets are rejected. Concurrent apply refuses an existing lock and leaves it intact. The program stages both JSON replacements, restores their previous bytes on a caught write failure, and appends history after successful replacement. A dry-run does not acquire or remove an apply lock.

Three files are not a single filesystem transaction. An abrupt process or machine interruption between replacements and the history append can require recovery. The stored revision must match the hash of the records and source state; the exact `initial-v19` bootstrap revision is the sole compatibility exception, replaced with a hash on apply. Revision mismatches and incomplete history lines fail closed. After a crash, the parent must inspect the process and staged backups before removing a stale lock; restore a matched records/status pair or complete the verified interrupted append. Preserve the existing history prefix and original observations. Do not roll product evidence backward, truncate history, or automatically clear a lock to force a run. Keep the previous private deployment until the recovered batch is coherent.

The refresh command preserves all files outside this local snapshot/status/history transaction, including user profiles and saved lists. The focused tests use isolated temporary files and verify this preservation, partial/failure behavior, archival evidence, identity deduplication, rollback rejection, dry-run, idempotent replay, locking, and corrupt-input rejection.

## Current source coverage and fulfillment limits

The October 12 import includes 68 parent-supplied DTO records, 13 CUCKOO renewed models, 27 Epson Certified ReNew models, and 15 parent-verified Best Buy open-box offers. Older records keep their original observations and expiry; they are not re-dated by this import. Successful imports are partial named selections, so their omissions do not establish sold-out stock. Each published product carries its real check timestamp and source URL. Stock-unknown observations do not count toward the 100 available-product minimum.

Best Buy's 12 shipping offers were verified only for ZIP 95628. The current location model stores state and coordinates, not a postal code; it cannot prove those offers ship to a different selected origin, so they remain visible in Both and are excluded from the destination-verified Shipped filter. Three pickup offers have verified named stores and official street addresses. Their Navigate buttons use those addresses. No store coordinates were exposed by the accessible source, and distances displayed in the previous Best Buy browser context are not distances from Rocklin; radius-filtered Pickup therefore excludes those records until actual coordinates are verified. Do not infer California-wide/free shipping, copy the browser's distance into the app, or invent store coordinates.

The official address evidence is [Citrus Heights](https://stores.bestbuy.com/ca/citrus-heights.html), [Woodland](https://stores.bestbuy.com/ca/woodland/2165-bronze-star-dr-1396.html), and [Stockton](https://stores.bestbuy.com/ca/stockton.html). Current-new comparisons come from the same selected Best Buy page's Buy New link; they are explicitly labeled as current-new prices and never historical originals.

A page left open checks this app's published snapshot endpoint every minute while visible, and on focus/visibility changes. A successful new publication updates its cards without reload. This interval does not request retailer pages, and does not install the parent-controlled twice-daily collection schedule. Failed published-data requests retain the last accepted snapshot. Failed retailer checks retain original timestamps and show a warning; existing expiry still applies.

Only ordinary source-hosted photos and source-confirmed inline logo URLs are used. The current cloud environment blocks external image downloads; the parent's authorized browser must verify hosted product photos and logos. Retailer initials and the full retailer name remain visible when an image is unavailable. A source-confirmed URL is not a claim that this environment rendered the pixels.


The subsequent update imports 16 additional distinct offers: seven KitchenAid, three Roborock, two Canon, three Logitech, and one Nintendo. A second color of the already-present RKSM55 mixer is held rather than counted. The Canon V1 successful observation remains 04:10:25 UTC; a later denied recheck does not renew it. Manufacturer/list references and Nintendo's sold-out-new list price do not rank as current-new savings. KitchenAid new-model comparisons whose accessory bundles may differ are also unranked and explicitly described on the cards. Logitech gaming warranties use the conservative one-year statement; Roborock battery and six-month warranty limits and Nintendo's handheld-only/return limitations are retained. Camera/lens filtering is available in English and Russian.

The published endpoint keeps v20's source schema for already-open v20 pages; the current client requests schema 2. Those older pages keep receiving updates to their supported sources rather than rejecting a catalog containing unknown newly-added retailer types. A frontend release that adds new retailer types or controls still needs the updated client page; ordinary future checked-product updates within its supported sources appear without reload.

Dated behavioral tests use fixed checked-evidence fixtures so legitimate new observation dates or prices do not rewrite their historical assertions. The separate published-catalog gate uses the actual current clock and requires at least 100 available, unexpired distinct products. A depleted or expired catalog fails that publication gate; the refresh agent must report the limit instead of inventing availability.


Nine further Best Buy priority offers add microwaves, a dryer, a cooler, gaming hardware, a tablet, and cameras. They retain ZIP 95628 shipping or the exact named pickup store. Official new address evidence: [Elk Grove](https://stores.bestbuy.com/ca/elk-grove.html), [Auburn](https://stores.bestbuy.com/ca/auburn.html), and [Arden Fair](https://stores.bestbuy.com/ca/sacramento.html). Displayed previous-browser distances are omitted. Fair-condition cards disclose that parts may be missing and exact completeness is unverified. Eleven distant pickup candidates remain held; they are not needed to inflate the available-product count.
