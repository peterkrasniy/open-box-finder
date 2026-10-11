# Independent baseline audit fixes

The four parent-owned reviews concern baseline `713b35608080b2cfdd4529700cd5ebc584ffdba2`. This is a review handoff, not final acceptance or a live-inventory claim.

| Finding | Implemented change | Evidence boundary |
|---|---|---|
| Source S1/S2, SEC2 | Separate original full-body editorial syndication; strict server admission, retailer identity, reviewed product/reference/media scopes, complete HTML safety inspection and acquisition-evidence requirements | All seven sources remain disabled; production publication policy map is empty. No actual feed/display acceptance yet. |
| S3, D5 | Shipping state eligibility and visible restrictions; unknown shipping/pickup coordinates remain unknown in Both | Isolated model cases for NY-only shipping to CA and unknown pickup. |
| S4/S5, SEC4, D1/D4 | Composite immutable unit/source/variant/branch/condition in detail URLs and saved lookup; readable permitted pointer metadata; saved loading/failure/unknown/later-complete removal states; expired-price labeling; server epoch + monotonic elapsed, immediate resume and 304 expiry | Browser fixtures and clock model cases; no native iPhone evidence. |
| D2, SEC3 | Authoritative monotonic publication sequence; same-sequence mutation/older snapshots rejected; durable SQL publication requires active lease and next sequence | Actual in-memory SQLite concurrency and stale-writer cases plus client/model cases. Native Sites D1 binding/four empty tables now verified; no real source data. |
| D3, SEC5 | Atomic per-identity saved entries, independent of Web Locks; legacy-removal tombstones; cross-tab clear handling and storage-area check | Isolated interleaved-entry test; two-tab/no-Web-Locks and clear-event browser regressions pass. No prices/images/full catalogs stored. |
| U1/U2/U3/U5 | Field-adjacent errors with invalid/describedby + focused scroll; surviving responsive focus targets; clean draft derives from latest filters, explicit dirty cross-tab conflict; separate Location cancellation | Thirteen browser audit regressions and ten shopper journeys pass; this separate batch adds twenty-five linked location-error checks. |
| U4/U6/U7 | Original 192/512/180 app icons, manifest/favicons; Saved count, h2 hierarchy, original readable unit identifiers | PNG dimensions and browser behavior verified; native installation and VoiceOver NOT RUN. |
| D6, S6/S7 | Populated source coverage; BuyDig estimated-reference qualification plus reference evidence/time; status introduction updated | Source admission and actual current inventory still unverified. |
| SEC1 | Next/React decoder updated to reviewed patched releases, compatible dependency resolution and targeted transitive updates | Latest npm audit is not clean: 0 critical, 8 high, 0 moderate/low. All remaining roots are unpatched development-only braces; production-declaration audit is zero known advisories. |

Current protocol is version 2. Existing test-only records remain outside runtime imports, source adapters, migrations and deployment payloads. Generated migrations contain schema only. Neither passing tests nor an empty public app constitutes first complete. Parent retains independent audit and source admission ownership.

All four independent retests of `6e39453904759920cd9f36a65f18b5b5915644e1` finished. The timing/denial batch was published separately as `654896682d0f169512618cd3b180db03ceaef73e`. The following coherent revision is ready for targeted parent retests; local checks do not grant acceptance or source admission.

| Remaining finding | Change | Verification |
|---|---|---|
| UX draft conflict and focus | Preserve the draft base through Search until an explicit choice; restore focus to a surviving control | Compiled two-tab browser passes |
| UX Saved image name; data unknown stock | Matching visible View details labels in EN/RU; retailer-check copy beside fresh unknown-stock prices | Browser checks and outer Axe pass |
| Security legacy tombstone overflow | Remove unnecessary keys, compact obsolete tombstones under the guard, decode preferences independently | 5,000-tombstone model/browser checks preserve the remaining save and Russian preferences |
| Data concurrent last Saved slot | Authoritative browser-local capacity claims inside serialized IndexedDB read/write transactions; visible in-memory fallback on coordination/storage failure | Twenty repeated two-tab races preserve 99 prior saves, admit one and release the slot; reload passes |
| Data duplicate unit aliases | Reject repeated source/unit/variant/condition/branch tuples within and across snapshots; canonical SHA-256 helper for future adapters | Model cases cover aliases, mutable prices and branch/variant differences |
| Source exact links and permitted images | Exact entry URL base; reviewed public image scopes must equal server policy; default CSP remains img-src none | Four compiled EN/RU checks use unchanged QA HTML and synthetic permitted media; no real retailer media/source admitted |
| Security braces | Investigated compatible registry versions and official advisory; no published patch | Eight high development advisories remain disclosed; production-declaration audit zero known |

Current model count is 62. Native iPhone/VoiceOver/install, inner-frame Axe and field INP remain NOT RUN. Parent acceptance of the new revision is pending.


## Targeted final retest follow-up

The parent final retest of dd873d9601e53c7e8c359bd75924840586c3a2ec resolved previous data findings and identified D3-R1: clearing localStorage in one tab left IndexedDB capacity at 100. Startup now reads surviving pointers and replaces capacity inside the same read/write guard transaction as saves. The compiled single-tab clear/reload and partial-deletion regressions pass; twenty third-tab startup races against two last-slot writers preserve 99 prior saves, admit exactly one and release its slot.

UX U2 now retains intentional filter focus before CSS can hide the rail, while explicit outside focus/pointer actions clear that intent. MC1 scrolls/focuses the conflict notice when Apply is blocked, keeping both choices above the sheet footer. EN/RU compiled checks and thirteen prior regressions pass. These are local browser results pending parent narrow acceptance.

Parent source acceptance permits a separate one-shot private A4L hosted research grant after primary access/terms review. Production sources stay disabled and publication policies empty. No schedule or retailer credential is created.
