# Proposed shopping state contract

Research specification only. No app components, routes, storage implementation or tests have been written. The parent retains UX/accessibility and data audit ownership.

## Filters and money

Retailer selection needs an explicit all-versus-selected interpretation. Within a selected retailer/category set, membership is OR; search, category, fulfillment, location and price dimensions intersect. An empty selected set means no results. A new admitted source must not silently undo a shopper's exclusions. Initial defaults, selecting all and clearing selections are separate actions.

Keep committed filters separate from an editing draft. Apply validates and commits the draft together; Cancel, Escape and dismissal discard it. Desktop visible controls and mobile sheets present the same draft semantics when a breakpoint changes. An invalid price/radius input stays visible with an adjacent explanation; never silently swap reversed bounds, round an entered amount to a different number, or apply only the valid half of a draft. Price bounds are inclusive. Empty bounds are unbounded, while numeric zero is an actual bound.

The local/shipped/both control expresses a union of supported modes when Both is chosen. Local pickup needs a verified source branch inside the user's straight-line radius. Local delivery is a distinct fact; it does not imply nationwide shipping or permission to visit an arbitrary warehouse. Unknown fulfillment remains unknown. A default Sacramento-area origin is a browsing preference, not evidence of nearby stock.

Use exact integer-cent USD values and source-specific comparison eligibility. Compute dollar savings by subtraction and percentage from the unrounded ratio; sort on the actual values with a stable identity tie-breaker. Exclude missing, expired, mismatched, zero, equal or below-current references from savings ranking. Display rounding must never turn a non-free item into a 100%-off claim. A retailer-listed MSRP, historical price, retail reference and current-new price require different visible basis labels, even when they share the same styling.

Changing EN/RU changes labels and formatting, not the underlying dollars, location, filters, source titles, identities or saves. It is not currency conversion. Test decimal-entry conventions deliberately, especially ambiguity between grouping and decimal separators. Translate validation, empty/unavailable states, accessible names and confirmation/status messages in both surfaces. Preserve any licensed syndicated content in its supplied language and form.

## Browser-local persistence

Persist only versioned, validated preferences and source identities, with any minimal saved observation bounded by the admitted source's retention rules. Do not create a shared public saved list or profile. A removed/expired saved item remains identifiable with an honest last-known/unavailable state; old prices and references must not retain current savings badges. Storage denial, quota errors and corrupt/older data need a usable in-memory fallback with clear persistence status.

Avoid one stale whole-list write erasing a different tab's newly saved offer. Independent per-offer storage entries are a possible simple design; same-offer concurrent intent can follow last committed value. Preference fields also need a deliberate update/merge strategy. These are implementation options, not a claim that browser storage supplies transactions.

[MDN storage-event documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) says changes reach other same-origin localStorage contexts, not the initiating document. Update the current view directly and subscribe once for other-context changes. [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) provides same-origin coordination in supported secure contexts if a compound operation needs it; a capability-aware fallback still needs correct behavior. Neither mechanism shares Safari with a separately installed app or different browser profile.

## Navigation and overlays

Use stable offer routes/identities so direct links and reloads have a meaningful result. A removed or unknown identity shows a useful unavailable/not-found view with Back. App Back restores the actual originating Deals/Saved view and scroll when known; a direct incoming detail link gets a reliable Deals fallback. Do not infer an app-owned predecessor from the browser's total history length. Preserve the existing router's history metadata rather than overwriting framework state.

[MDN History API guidance](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API) distinguishes adding versus replacing entries and the initial-entry restoration problem. Choose the router-supported equivalent. Verify Back/Forward through Deals, Saved, detail and filter/location editing; language or live metadata updates should not create unwanted route history.

Allow one logical modal at a time. Its state owns the draft, initiating control, focus restoration and scroll lock. Rapidly opening a second panel or navigating while an async lookup completes must not leave a second backdrop, stale draft, delayed focus jump or locked page. Breakpoint changes replace presentation while preserving that state and a usable focus target. Every view/panel has a visible Back, Close or Cancel as appropriate.

The [native dialog reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) distinguishes showModal() from a non-modal open attribute and documents modal inertness, dismissal and focus behavior. Native semantics can reduce implementation work, but still require meaningful labels, a deliberate initial focus, visible dismissal, event handling and tested restoration. Do not depend on newer light-dismiss/command features without support checks.

## Live changes during shopping

Keep card identity, committed filters, local saves, editing drafts and open detail state stable across accepted catalog revisions. Update actual price/availability facts without silently replacing a physical unit with another unit of the same model. An item becoming unavailable in an open detail stays open with an honest status; it must not cause surprise navigation or imply that the replacement unit was saved.

Announce useful new-result/availability changes once and politely. Preserve keyboard focus and the reading position, including when sorting admits new higher-ranked offers. A failed or older response cannot overwrite a newer catalog/health revision. Metadata-only revalidation does not announce newly listed offers. Resume/reconnect revalidation is required because sleeping browser/app timers do not establish background freshness.

All behavioral, cross-tab, responsive and assistive-technology checks remain NOT RUN until an implemented candidate is exercised.


### Saved capacity after independent retest

Browser-local IndexedDB read/write transactions serialize authoritative minimal identity capacity claims across tabs, including when Web Locks is absent. LocalStorage retains the version-2 pointer entries and preferences. A successful pointer write precedes claiming/releasing capacity; failed coordination/storage gives a visible in-memory fallback. The two stores are not one atomic durable transaction. No prices, photos or full inventory payloads enter this coordination store. Obsolete null tombstones are compacted under the guard; required legacy suppression stays bounded. Preference decoding is independent of Saved decoding.

The scheduling boundary follows the primary [IndexedDB transaction specification](https://www.w3.org/TR/IndexedDB/#transaction-scheduling) and [MDN transaction documentation](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction). Twenty repeated compiled-browser last-slot races and a 5,000-tombstone regression pass. Native Safari and cross-device syncing are not established.
