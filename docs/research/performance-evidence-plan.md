# Performance and update evidence plan

Historical research plan preserved. The parent retains the independent performance/security audit. Later local compiled-Worker lab measurements are recorded in the evidence ledger; they do not establish public-hosting performance or genuine first complete. Lighthouse 13.5.0, Chromium 154 and axe tooling remain outside the public repository.

## Measurements that answer the shopping task

[Google's Web Vitals guidance](https://web.dev/articles/vitals) distinguishes loading, responsiveness and visual stability. Its good field thresholds are LCP at most 2.5 seconds, INP at most 200 ms and CLS at most 0.1 at the 75th percentile, assessed separately for mobile/desktop. Those are evaluation targets, not a promise about the unpublished app. A new site will not automatically have enough real-user field evidence.

A Lighthouse navigation run can measure lab loading/stability and total blocking time. It cannot establish field INP without user interaction. [Chrome's performance-scoring guide](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) explains weighted lab metrics and run variability; report the actual tool version, device emulation, CPU/network settings, origin, build and raw measurements alongside the score. Compare like settings on the exact candidate. Do not call a localhost score the deployed Site's result, substitute a Desktop preset for mobile evidence, or claim native Safari performance from Chromium emulation.

After the first complete candidate, measure real rendered journeys: typing search; multi-selecting retailers; applying/canceling an invalid/valid price and location draft; switching both savings sorts; saving/removing items; opening/backing from a detail; language switching; and adopting a catalog update while the page remains open. A scripted interaction trace measures that scripted run, not the site's population-level percentile. [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) and [PerformanceEventTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming) have capability-dependent entries; inspect supportedEntryTypes and report missing instrumentation instead of inventing zeros. Keep temporary benchmark instrumentation in QA, without adding user telemetry/analytics to the public app.

## Where the budget should go

Favor the real deals/results in the first viewport. Bound the catalog and response before deciding whether client-side filtering is practical. Derive indexed search text once per accepted generation, compute filters/sorts from typed integer values, and keep selected state independent of fetch state. Do not mirror derived results into competing state that can drift. Stable offer keys must identify a unit/variant, not its price or list position.

Use one deduplicated polling lifecycle, paused while hidden and resumed deliberately on online/visibility changes. Changes to language, sort or a filter must not create another timer or new source acquisition. Out-of-order responses are ignored by revision/version; ordinary successful unchanged checks update freshness/health without pretending a new offer appeared. A timed-out/aborted request cannot leave permanent pending state. Use conservative retry/backoff and stop unnecessary reads in an offline/hidden context.

An update must remain visible without destroying a shopping task. Preserve the active modal, draft, focus and stable saved IDs. When a physical unit becomes unavailable, retain an open detail with its honest unavailable state rather than replacing it with a same-model unit. Keep status/badge space stable; do not announce every unchanged poll. Test a reader scrolled into the grid, keyboard focus on a card action and a detail open during a price/removal update. Record any deliberate ordering/scroll policy so the user can still find the newly adopted offer.

Real source photos can dominate load cost. Reserve aspect ratio/width/height before loading; lazy-load appropriate below-the-fold media, keep the first visible deal image eligible for prompt load and avoid making every image high priority. [MDN's img reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img) documents loading/decoding and intrinsic dimensions. Use exact source-allowed image URLs/transforms, not guessed CDN rewrites or generated substitutes. Test broken/slow images and long English/Russian content. System fonts cover the requested iPhone-like UI and Cyrillic without another font request; any alternative needs a concrete benefit and permission/provenance.

## Runtime cost and source freshness

Client adoption latency is separate from acquisition latency. Record last prior source observation, first changed source observation, fetch completion, durable write/publication, public readback, open-client adoption and source content generation/representation revision. A known private retailer event time is usually unavailable; do not equate publication time or first-seen time with the internal return event. Report bounded public observation intervals and measured stage latency. Synthetic tests can validate mechanics but never satisfy the required actual unattended source event proof.

Compute costs from measured request counts and rows scanned/written, including global leases, source health updates and index writes. Edge cache scope cannot serve as cross-instance quota control. Polling every 60 seconds for 100 continuously visible clients is 144,000 dynamic requests per day; every 120 seconds is 72,000. These are illustrations, not measured traffic or a chosen production interval. Actual Sites allowances are unverified; the underlying Workers/D1 free-tier examples do not establish this user's billing contract. Keep the free implementation bounded and make overload/failure visible without a paid fallback or a silent loss of freshness.

## Required published-version evidence

Record dependency audit, supported official build, exact public page identity, resource errors/console, target-size journeys, lab report and runtime request/cost observations for the same source commit. Name isolated synthetic tests separately from actual source-fetch/write/readback/client evidence. Keep raw QA captures/reports outside the shipping assets; publish compact factual summaries that contain no secret headers, private profiles, user locations or licensed raw catalog archive. Repeat broad testing only when a new change, failure or unresolved finding justifies it.


## Populated local audit, October 11 at 13:23 UTC

The isolated 2,000-unit response is 1,762,520 bytes. Three Chromium 154 runs per viewport (390/1280, CPU throttle 4) exercise search, savings sort, EN/RU, expansion from 60 to 120 cards, details and changed-generation adoption. The version-4 baseline's median largest Event Timing sample was 424 ms mobile / 552 ms desktop. Profiling attributes dominant app-function samples to currency-formatter construction. Reusing the two formatters and memoizing unchanged cards reduces the final sequential median to 288 / 320 ms, with individual maxima 232–312 / 288–440 ms. No page errors or horizontal overflow occurred.

This is an improvement, with remaining responsiveness work and substantial shared-host variance. It is not field INP, proof of a 200-ms target, native iPhone performance, real-media performance or public-hosting measurement. Concurrent QA measurements are not used for the final comparison. Raw QA traces stay outside the public app/source payload.
