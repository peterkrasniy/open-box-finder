# Shopping patterns and verification plan

This document is design/verification research only; no application code is present.

## Shopping patterns to adapt originally

[Best Buy's official App Store listing](https://apps.apple.com/us/app/best-buy-tech-deals-savings/id314855255) emphasizes store-level browsing and pickup, alongside product details. The useful pattern for this app is a persistent location context paired with visible fulfillment on each genuinely supported offer. Never let location selection appear to verify stock. Keep a visible search input throughout filtered browsing. A detail view should preserve the query/filter state and restore list position when closed or after the browser resumes.

[Slickdeals' official App Store listing](https://apps.apple.com/us/app/slickdeals-deals-discounts/id584632814) provides a deal-discovery reference. Adapt a low-friction browse/save/revisit journey, with a simple Saved destination and clear distinction between a deal announcement and a current stock claim. Reproduce neither the app artwork nor its branded UI.

[Framework's official marketplace](https://frame.work/marketplace) presents outlet types separately, including factory seconds and refurbished. Adapt explicit condition labels so open-box, refurbished, used, and scratch-and-dent do not silently become interchangeable. Do not borrow Framework's page counts as inventory: the research extraction reported zero placeholders.

[Vari's official open-box catalog](https://www.vari.com/deals/open-box-office-furniture/) explains the new-price comparison basis beside offers and distinguishes sold-out products. Adapt the transparency of that comparison copy; a crossed-out number without its basis is insufficient.

Use a calm original interface with large readable price typography, restrained soft surfaces, a small retailer mark where licensed, clear condition and fulfillment text, and a reachable save control with an accessible name and pressed state. Avoid large decorative hero content that delays seeing deals on a phone. For licensed unmodified syndication, preserve the full original feed display; the normal offer card design is only for sources whose license permits normalization.

## Separate desktop and mobile compositions

Peter's explicit addition relayed by the parent at 07:14 UTC requires two intentionally designed surfaces. Shared components, filtering semantics, translations and saved state are appropriate; a single composition with scaled dimensions is insufficient. These are research decisions awaiting the parent's UX audit and the post-08:38 design stage, not an implemented interface.

The independent UX auditor subsequently supplied documentary/visual observations of Best Buy and Back Market desktop filters/grids, developer-published iPhone screens, Slickdeals mobile navigation, and [Baymard's responsive-upscaling research](https://baymard.com/research-articles/responsive-upscaling). These are parent-owned audit evidence, not local native-app interaction passes. Its proposed mobile widths are 320/390/430, desktop 1280/1440 and intermediate 768 pixels. The final design may vary while delivering equally purposeful surface-specific workflows.

| Journey | Desktop decision | Mobile decision | Verification |
| --- | --- | --- | --- |
| Browse and refine | Persistent filter sidebar, broad search field, inline result/sort toolbar; use available width for comparison-readable cards. | Search directly below the compact top bar; reachable Filters/Sort controls and applied-filter chips; full-height filter sheet with a reachable Apply action. | Independently test pointer and keyboard flows versus touch/keyboard/safe-area flows. |
| Inspect an offer | Context-preserving detail panel or dedicated detail region with large photo and adjacent price/basis/fulfillment; visible Close/Back. | Dedicated full-height detail sheet/screen with scrollable content and an unobscured action area; explicit Close/Back. | Close restores the originating result and scroll; deep links and Back/Forward work. |
| Saves | Top navigation destination and compact count, keyboard accessible. | Reachable bottom destination with count, leaving content and actions above the safe area. | Saves, search, location and selections survive breakpoint changes without duplicates. |
| Location and price | Labelled controls in the sidebar, visible validation adjacent to the range. | Deliberate sheet steps with labelled editable origin/radius, numeric keyboard and inline range errors. | Narrow-screen keyboard does not hide errors, Apply, Cancel or focused fields. |
| Updating catalog | Stable grid identities and restrained status notice; no focused row disappearing without a meaningful unavailable state. | Stable scroll position and readable update status; no automatic sheet dismissal, jump or focus theft. | Test refresh while an offer is open/saved, rapid taps and orientation changes. |

Avoid duplicated hidden controls with duplicate IDs or focusable off-screen copies. Crossing a breakpoint must replace the presentation of the same logical overlay, preserving its draft state and leaving a usable focused control. Mobile filter drafts should Apply or Cancel deliberately; the desktop presentation must preserve these semantics when crossing surfaces. Both languages must cover both compositions, including accessible names and error states.

## Location research

[Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) support a no-key directions link with api=1 and an explicit destination. Construct the destination from verified store coordinates/address, encode it safely, and test that it never resolves to the search origin or a generic retailer search.

[Nominatim's current usage policy](https://operations.osmfoundation.org/policies/nominatim/) requires application-wide rate limits, application identification, attribution, caching, and forbids autocomplete/systematic querying. It also restricts automatically generated generic lookup services. Do not adopt the public instance casually as a universal free geocoder. Prefer a deliberate approved provider choice, or transparent location presets/coordinates until a permitted lookup path is established. Do not send personal addresses to third parties automatically.

[Census Gazetteer files](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html) provide representative coordinates for named places and ZIP Code Tabulation Areas. The [record layout](https://www.census.gov/programs-surveys/geography/technical-documentation/records-layout/gaz-record-layouts.html) identifies internal-point latitude/longitude. An attributed bundled lookup is a feasible free alternative: the [Census open-data policy](https://www.census.gov/about/policies/open-gov.html) permits public use/reuse, with [citation guidance](https://www.census.gov/about/policies/citation.html). Record the actual downloaded vintage/file/access date before using it. No dataset has yet been downloaded or integrated.

Treat these points as approximate area origins, not exact user addresses. [Census ZCTA guidance](https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html) says not every valid postal ZIP has a ZCTA. Preserve leading zeros, disambiguate same city names with state, and explain unsupported ZIPs without silently moving the origin. This app's radius means straight-line miles from the stated origin, not driving distance or a guarantee that every address in that area falls inside it. Default Rocklin/Sacramento labels must match the chosen origin.

The [Census geocoding API](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html) requires street-address input for address lookup, rather than a city/ZIP-only lookup. Its documentation notes no CORS support; do not execute external JSONP as a workaround. Optional [browser geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) requires a secure context and permission: offer it only on deliberate user action, handle denial/timeouts, keep coordinates browser-local, and do not issue a permission prompt on first visit. Research does not claim that geolocation or city lookup is implemented.

## Accessible overlays and announcements

The [WAI modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) supports contained keyboard focus, meaningful initial focus, Escape/visible Close and logical focus restoration. Choose initial focus so long offer details start with context rather than scrolling immediately to the last action. Use real semantic fields/buttons and one logical overlay. Background controls must be inert while a modal is open.

[WCAG 2.2 target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) describes 24 CSS pixels or applicable spacing/exception rules at AA; a 44-pixel design target is a practical choice for principal phone controls, not a claim that AA requires every target to be 44 pixels. [Status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) informs a restrained polite update notice: announce useful result/update/error status without repeatedly reading every offer or stealing focus.

## PWA and storage research

[MDN installability guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) requires a manifest, HTTPS, and browser-specific manifest members such as name, 192/512 icons, start_url and display. A service worker is not a universal installation requirement. Add the requested original icon, a separate maskable-safe treatment, and apple-touch-icon. Never cache old prices as apparently current inventory to manufacture an offline experience.

[MDN localStorage guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) documents SecurityError when persistence is blocked. Wrap reads and writes, validate/migrate stored data, and use an explicit in-memory fallback if storage is unavailable. Store no private profiles or credentials.

[WebKit Safari 17.2 guidance](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/) describes Add to Home Screen copying cookies, with other storage remaining separate. [Safari 26 guidance](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) describes the user-controlled Open as Web App option and default web-app behavior for Home Screen additions. Product copy should say saves/preferences remain in this browser/app, not imply automatic migration or shared Safari/installed-app state. When native iPhone access exists, test save-before-install, installed app launch, independent save changes and reopen in both contexts. Keep these native checks NOT RUN when only browser emulation is available. A missing service worker alone is not an iPhone installation blocker; manifest and icon assets still require meaningful verification.

## Meaningful verification after implementation

| Area | Required evidence |
| --- | --- |
| Source admission | Licensed/authenticated path, actual nonempty response when available, timestamp, item identity, and documented availability interpretation; no production fixtures. |
| Freshness | Actual observed source changes traced through acquisition, persistence, public generation and an already-open client without reload; measured latency. Isolated synthetic race/removal tests labelled separately; hidden/online resume, no overlap, backoff and out-of-order protection. |
| Price reliability | Integer-cent parsing; valid currency; exact comparison basis; no badge/ranking for comparison <= current; no unsupported original/new price; stable rankings and rounding. |
| Real filters | Retailer multi-select combinations; category/search; fulfillment unknown; location/radius boundaries; min/max equal and reversed; zero results; filter reset; persistence after language toggle/revisit. |
| Save journey | Browse > Save > Detail > Close > Saved > Unsave > Browse; correct counts, preserved query/scroll, removed/stale item state, blocked storage and corrupt storage fallback. |
| Navigation | Back/Close on every surface; Escape; focus return; single modal; outside click behavior; repeated taps; browser back; no overlapping trapped layers. |
| Pickup | Exact verified store destination; true miles postfilter; shipped items cannot become local; no ordinary SKU/open-box stock inference. |
| Accessibility | Semantic controls and headings; accessible icon labels; pressed/selected states; keyboard/focus; live status without stealing focus; touch targets; contrast; zoom; reduced motion. |
| Responsive design | iPhone narrow/large widths, safe areas, portrait/landscape; tablet/desktop; Russian labels; long source/product names; 200% zoom; no clipped actions or horizontal overflow. |
| PWA | Valid manifest; actual PNG dimensions; apple-touch-icon response; same-origin scope/start URL; standalone metadata; installation limits honestly reported. |
| Security | Public GET/HEAD only; no public admin/writer; fixed upstream allowlist; reject invalid methods/paths/URLs; bounded fetch/time/body; inert licensed HTML; no secrets in build/source, logs, errors or browser response. |
| Performance | Production bundle/asset sizes; request count; responsive loading; no unnecessary persistent polling while hidden; bounded cache and timeout; image dimensions/lazy loading where licensed. |
| Durable source | Public canonical commit matches final source; Sites pushed source state/commit matches archive and saved version; docs explain routine updates; clean repository status. |
| Audit interval | First complete UTC timestamp and commit; >= one hour of actual later audit/improvement work with later commits and test evidence; parent findings reconciled. |

Use synthetic data only in clearly separated test fixtures, never as a production inventory fallback. Prefer testing observable behavior and important invariants over tests that mirror implementation details.

Savings fixtures agreed with the accountability reviewer: A current $80 / current-new $100 yields $20 and 20%; B $150 / current-new $300 yields $150 and 50%; C $90 / exact-variant sourced MSRP $300 yields $210 and 70%. Current-new-only order is B,A and excludes C; a declared advertised-reference order is C,B,A with visible actual bases. To distinguish percent from dollar ranking, use $50/$100 (50%, $50) against $300/$500 (40%, $200). Include missing, stale, unmatched, zero, equal and below-current comparison cases. These are test specifications, not executed tests or production records.
