# Independent baseline audit fixes

The four parent-owned reviews concern baseline `713b35608080b2cfdd4529700cd5ebc584ffdba2`. This is a review handoff, not final acceptance or a live-inventory claim.

| Finding | Implemented change | Evidence boundary |
|---|---|---|
| Source S1/S2, SEC2 | Separate original full-body editorial syndication; strict server admission, retailer identity, reviewed product/reference/media scopes, complete HTML safety inspection and acquisition-evidence requirements | All seven sources remain disabled; production publication policy map is empty. No actual feed/display acceptance yet. |
| S3, D5 | Shipping state eligibility and visible restrictions; unknown shipping/pickup coordinates remain unknown in Both | Isolated model cases for NY-only shipping to CA and unknown pickup. |
| S4/S5, SEC4, D1/D4 | Composite immutable unit/source/variant/branch/condition in detail URLs and saved lookup; readable permitted pointer metadata; saved loading/failure/unknown/later-complete removal states; expired-price labeling; server epoch + monotonic elapsed, immediate resume and 304 expiry | Browser fixtures and clock model cases; no native iPhone evidence. |
| D2, SEC3 | Authoritative monotonic publication sequence; same-sequence mutation/older snapshots rejected; durable SQL publication requires active lease and next sequence | Actual in-memory SQLite concurrency and stale-writer cases plus client/model cases. Live D1 not bound yet. |
| D3, SEC5 | Atomic per-identity saved entries, independent of Web Locks; legacy-removal tombstones; cross-tab clear handling and storage-area check | Isolated interleaved-entry test; browser concurrent-tab pass is pending. No prices/images/full catalogs stored. |
| U1/U2/U3/U5 | Field-adjacent errors with invalid/describedby + focused scroll; surviving responsive focus targets; clean draft derives from latest filters, explicit dirty cross-tab conflict; separate Location cancellation | Additional browser audit-regression run pending; existing ten shopper journeys pass. |
| U4/U6/U7 | Original 192/512/180 app icons, manifest/favicons; Saved count, h2 hierarchy, original readable unit identifiers | PNG dimensions and browser behavior verified; native installation and VoiceOver NOT RUN. |
| D6, S6/S7 | Populated source coverage; BuyDig estimated-reference qualification plus reference evidence/time; status introduction updated | Source admission and actual current inventory still unverified. |
| SEC1 | Next/React decoder updated to reviewed patched releases, compatible dependency resolution and targeted transitive updates | Latest npm audit is not clean: 0 critical, 16 high, 14 moderate, 3 low. Remaining direct advisory roots include Babel, braces/brace-expansion, old migration-tool esbuild and fast-uri; further remediation continues. |

Current protocol is version 2. Existing test-only records remain outside runtime imports, source adapters, migrations and deployment payloads. Generated migrations contain schema only. Neither passing tests nor an empty public app constitutes first complete. Parent retains independent audit and source admission ownership.
