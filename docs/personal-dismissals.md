# Personal listing deletion

Delete dismisses one listing on the current browser/device. It never deletes source evidence, archives inventory, changes availability, removes saved pointers, or changes the site's audience. Saved rows remain available and show Restore when their deal listing is dismissed. Category hiding remains an independent preference.

Undo restores the latest deletion and its prior scroll position. Filters includes Restore deleted listings across retail and resale. Restoration cannot revive an expired or archived source observation, and it does not undo hidden categories. Repeated immediate Delete clicks do not toggle the item back on or dismiss the next card that moves under the pointer.

`lib/dismissals.ts` defines scoped identity keys. Manually reviewed retail and resale observations use source ID and stable record ID, independent of prices, URLs, check dates and archive state. Normalized offers use the physical-unit identity (source, source listing, variant, condition, pickup branch), independent of changing display ID or price. Saved pointers resolve to the same dismissal identity.

`hooks/useDismissedListings.ts` stores one atomic localStorage entry per identity under `open-box-finder:dismissed:v1:` and listens for other-tab changes. It never transmits those entries to an endpoint or includes them in source/build artifacts. Separate entries leave existing preferences and saves untouched. If browser storage is denied or full, the UI reports that changes last for this visit and retains dismissals in memory. Clearing browser storage resets this personal preference.

Future source refreshes must preserve source listing IDs and physical-unit identity for the same item. New or genuinely different units remain distinct. Read-only catalog endpoints and the supported publishing workflow are unchanged.
