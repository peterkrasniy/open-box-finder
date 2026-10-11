# Bounded individual product review

Reviewed October 11, 2026; review window 19:28 UTC to October 12, 19:28 UTC. These are manually observed public-page facts, not current stock or individual open-box unit inventory.

| Model | Observed US page price | Primary product page |
| --- | ---: | --- |
| ACCENTUM Plus | $99.95 | https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/accentum-plus-refurbished |
| HD 600 | $279.95 | https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/hd-600-refurbished |
| RS 120-W | $129.95 | https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/rs-120-w-refurbished |
| AMBEO Soundbar Plus | $999.95 | https://us.sennheiser-hearing.com/collections/refurbished-by-sennheiser/products/ambeo-soundbar-plus-refurbished |

All four product pages explicitly labeled the items certified refurbished and presented these prices. The page's current default presentation is the observation; variant-specific price/stock is not independently proved. No stock claim follows from the absence of “coming soon” or “sold out.” User-selected local/shipped filtering therefore cannot treat these as confirmed local or shipped inventory. No exact pickup store is known, so no Navigate button is generated.

The reviewed US consumer-sales terms: https://us.sennheiser-hearing.com/policies/terms-of-service. No copying/automated-access clause was found in the returned sales terms. The small original model/price/condition notes use no marketing prose or media. This interpretation supports bounded factual curation; it does not assert a general license, launch an automated adapter or clear photos/logos. The larger crossed-out retailer prices have no proven former-refurbished-price or current MSRP meaning and are displayed only as “Retailer comparison price,” with the basis explicitly unspecified. The 2024 ACCENTUM Plus launch release specified $229.95 MSRP, which also differs from today’s $249.95 page comparison amount; the latter is not relabeled MSRP.

Refresh by reviewing the exact primary pages and current relevant terms, correcting facts, and updating `reviewedAt` and `reviewUntil` in `lib/manual-products.ts`. Use a maximum 24-hour window, run tests/typecheck/lint/build and the Sites source workflow, synchronize the exact commit to canonical GitHub, and publish to the existing owner-private Site. Do not extend a review timestamp without reviewing the pages. Removing a record must not remove its saved identity/link from visitors' devices. Do not put visitor profiles, credentials, paid enrollment or copied inventory payloads in the public repository.

This fulfills a limited individual-product display milestone. Real-time stock, automatic refreshing source offers, verified shipping/pickup and supported savings comparisons remain incomplete.

## New-condition model comparison, reviewed 19:28 UTC

| Model | Observed new-model price | Primary new-condition page | UI behavior |
| --- | ---: | --- | --- |
| ACCENTUM Plus | $129.95 USD | https://us.sennheiser-hearing.com/products/accentum-plus | Plain separate new-model price |
| HD 600 | $349.95 USD | https://us.sennheiser-hearing.com/products/hd-600 | Plain separate new-model price |
| RS 120-W | $129.95 USD | https://us.sennheiser-hearing.com/products/rs-120-w | Equal price, plain text; no discount claim |
| AMBEO Soundbar Plus | $1,199.95 USD | https://us.sennheiser-hearing.com/products/ambeo-soundbar-plus | Plain separate new-model price |

These are the observed US page prices for the same named model in new condition. Variant-specific stock/pricing is not independently established; the UI says variant prices may differ. No percentage/dollar saving is inferred for an exact refurbished unit, and no price is described as its previous selling price. Both reference and refurbished observations expire together. Saved pointers contain neither price nor media.

## Visual route and restriction

The US site’s separate legal notice explicitly restricts reuse of pictures and other protected content: https://us.sennheiser-hearing.com/pages/legal-notice. The shop sales terms alone were insufficient to clear images. The public manufacturer press share linked at https://newsroom.sennheiser.com/layover-lifesaver-the-all-new-accentum-plus-434til returned no usable material/usage terms to this executor. It was not treated as blanket permission. Wikimedia Commons offered only an older-finish HD 600 photograph in the reviewed category; no alternative-model picture was substituted.

YouTube officially supports embedding and privacy-enhanced mode: https://support.google.com/youtube/answer/171780?hl=en. The implementation uses its full supported player, retaining controls and identity. It does not extract thumbnails or frames, bypass restrictions, disable ads or download video. The user explicitly allowed an embedded visual window. Product-model videos: ACCENTUM Plus, Sennheiser, https://www.youtube.com/watch?v=JM0QIRfkOfs; RS 120-W, Sennheiser, https://www.youtube.com/watch?v=-0MJWoXRjkc; AMBEO Soundbar Plus, Sennheiser, https://www.youtube.com/watch?v=IZbFYQOjngI; HD 600, independent askdrtk review, https://www.youtube.com/watch?v=9gcuORhXRuI. The RS 120-W retailer page also exposes a YouTube embed for that model. The chosen videos’ uploader and exact model were identified from supported YouTube retrieval. Current embedding availability, poster load and playback could not be verified: web oEmbed requests were throttled, while the executor’s browser proxy returned ERR_TUNNEL_CONNECTION_FAILED. No proxy/security changes were made. An external watch link remains available when a player cannot run.

The supplied screenshot files were read through Library, which provided captions/OCR identifying the app’s ACCENTUM Plus card and the retailer’s black ACCENTUM Plus page. Pixel materialization failed through the official helper; it is not represented as visual pixel inspection. No user screenshot or private profile is committed or republished.

## Version 14 visible posters and retailer references

The parent’s signed-in Windows Chrome QA verified all four v13 model embeds loaded and played, with matching identities, correct independent HD 600 attribution, two desktop columns, one 390×844 mobile column, EN/RU and no console errors. V14 retains exactly those verified video sources and renders the supported player immediately as each card enters or approaches the viewport, without an expansion button. A 160px IntersectionObserver margin and native lazy loading defer offscreen external requests; frame dimensions stay reserved, with no autoplay. No thumbnails, frames or retailer photographs are downloaded/reposted. Actual v14 hosted poster visibility/readback remains a parent verification step after deployment.

The original observed crossed-out amounts now display as “Retailer comparison price” / “Цена сравнения магазина”: ACCENTUM Plus $249.95, HD 600 $499.95, RS 120-W $159.95, AMBEO Soundbar Plus $1,799.95 USD. Each comparison links to that exact refurbished page and shares the existing October 11, 19:28 UTC observation time and October 12, 19:28 UTC deadline. No review window is extended by this UI update. Their basis is explicitly unspecified; no former refurbished selling price, MSRP or saving rank is inferred. New-model observations are separate, plain text rows, including RS 120-W’s equal price. Original factual amounts are not treated as categorically unavailable to state.


## V15 mobile iframe sizing correction

The parent’s real hosted v14 QA found document scrollWidth 412px at a 390px viewport: the one-column grid retained its content-based minimum from the aspect-ratio/min-height player. This executor reproduced 408px at 320px and 412px at 390px with real, unmocked iframe elements. The earlier v14 browser script checked overflow after navigating to Saved and expiring the price cards, so that assertion did not cover the active listing grid. V15 changes the mobile grid track to minmax(0,1fr), adds min-width:0 and max-width:100% to cards/player containers/iframes, and permits long card text to wrap. It does not hide page overflow or alter comparison prices, saved data, source ingestion or audience.

The parent verified v14 posters and no autoplay. ACCENTUM Plus and HD 600 depict recognizable headphones; RS 120-W is text-only and AMBEO Plus shows the presenter without the soundbar. No alternative recognizable poster could be verified in this executor; those image limitations are retained explicitly, and the same playable model-specific sources remain. Unmocked iframe geometry tests cover each active card in EN/RU at 320/390/1280; external YouTube requests remain proxy-blocked, so actual hosted player imagery/playback requires parent readback.
