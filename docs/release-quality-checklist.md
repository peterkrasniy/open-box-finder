# Release quality checklist

Statuses: PASS, FAIL, NOT RUN, BLOCKED. A checklist assertion is not a test pass. See the [evidence ledger](evidence-ledger.md) for UTC, exact source/build/catalog versions, findings, fixes and affected retests.

## Release gates

- [ ] Implementation begins no earlier than 2026-10-11 08:38 UTC and after parent evidence handoff.
- [ ] A genuinely complete item-deals candidate uses real permitted data. Directory, static research stock, synthetic rows, and unconnected adapters do not satisfy this gate.
- [ ] First-complete timestamp, exact commit, build URL, catalog generation and feature inventory recorded.
- [ ] Four independent audits review the final candidate; every critical finding has a specific disposition and retest on the final commit.
- [ ] At least 60 minutes of substantive work after first complete: record active interval union, findings, improvements and retests; idle elapsed time and summed parallel auditor time do not count.
- [ ] Final completion no earlier than 2026-10-11 13:38 UTC and the substantive post-completion hour.
- [ ] Exact public deployment URL and source commits verified, including canonical GitHub and Sites source continuity.

## Genuine deals and data

- [ ] Each enabled source has applicable-use review, a genuine permitted acquisition path, actual item availability evidence, freshness rules and item identities. Separate factual comparisons from protected photos/descriptions/logos; no invented universal affirmative-feed-license requirement.
- [ ] No production mock records, fake stock, inferred pickup stock, invented prices, photos, discounts, timestamps or test passes.
- [ ] Retailer selections use OR within selections and AND across filter dimensions; no selected retailers is not all retailers.
- [ ] Local/shipped/both reflects actual offer fulfillment. Nearby requires exact-offer store stock and a true miles-radius check.
- [ ] Price filters are inclusive; invalid ranges display an error and never silently yield misleading results.
- [ ] Percent and dollars rankings differ correctly and require strictly positive, exact-variant, supported comparisons.
- [ ] Red struck-through comparisons identify current-new, regular, MSRP or historic basis plainly.
- [ ] Source observation timestamps remain immutable; fetch time is separate.
- [ ] Catalog updates are atomic; failed fetches never imply sellout or clear the last valid catalog.
- [ ] Automatic/unattended update claims have actual source fetch/write and public readback evidence, beyond an open-browser timer.
- [ ] New source offer and removal/change are traced through real observed generations to an already-open client, with measured acquisition/adoption latency. Isolated synthetic injections are identified separately and cannot substitute for real observed source evidence.
- [ ] Important item restrictions appear in concise details: condition, fulfillment, source time, warranty/returns where supported, comparison basis and stock limits.

## Navigation and browser-local state

- [ ] Complete screen/sheet inventory includes a Back/Close/Cancel escape path on every detail, sheet and tab.
- [ ] Browser Back/Forward and deep links preserve navigation and valid filter state.
- [ ] At most one intended overlay; focus/scroll restore; keyboard/Escape usable; no trapped layers.
- [ ] Repeated taps, stale asynchronous responses, in-flight refresh/navigation and rapid language/filter changes are safe.
- [ ] Saved/interested state is per browser, not a public shared anonymous profile.
- [ ] Copy specifies this browser/app; no automatic Safari-to-Home-Screen localStorage migration or sharing implied. Native save-before-install and independent-context reopen checks are NOT RUN unless actually performed.
- [ ] Storage denial, malformed/old/corrupt state, quota failure, stale/expired/missing offers and empty saves handled.
- [ ] English/Russian covers controls, states, errors and accessible labels and persists. Licensed original source content is not silently translated.
- [ ] Pickup Navigate uses each exact verified store destination; absence of offer/store evidence disables that claim.

## Design, PWA, security and performance

- [ ] Original distinctive app icon; actual manifest, 192/512 icons, maskable icon treatment and apple-touch-icon verified.
- [ ] Actual licensed product photographs and allowed retailer logos; no decorative substitute passed off as product media.
- [ ] Responsive phone/tablet/desktop layouts, Russian text, 200% zoom, reduced motion, contrast, focus and touch targets checked.
- [ ] VIS-08/J9: desktop and mobile have separate purposeful layouts and controls; pointer/keyboard/available-space/filter/detail flows and thumb/keyboard/safe-area/sheet flows tested separately, including state continuity across breakpoints.
- [ ] Native iPhone/VoiceOver checks marked NOT RUN unless actually performed; phone emulation labeled accurately.
- [ ] Public reads expose no administrative/anonymous writer, unsafe link, arbitrary upstream fetch, XSS or secrets.
- [ ] Public repository history, build/package and browser responses scanned for credentials/private profile material.
- [ ] Production asset/bundle sizes, request counts, data/image loading, refresh behavior and source timeouts/caching measured.
- [ ] Routine future edit/update instructions tested or bounded accurately; no promise that authentication can be removed.
