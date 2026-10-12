# Multi-category retailer snapshots, October 12

This release adds twelve bounded individual-product page observations to the four existing audio records. Peter authorized more sources, diverse categories and actual source photos in the owner-private app. The parent relayed independent researchers' current-page/JSON-LD/variant findings at 02:23–02:27 UTC. The app writer independently read accessible primary pages and shipping policies through the web connector. Ordinary executor page/CDN requests returned proxy tunnel 403; no access workaround occurred. Target could not be read through this executor's web connector, so its selected-item evidence is explicitly parent-researcher supplied.

Every record is `manual-observation`, with `availability: unknown` for machine inventory purposes and a separate historical `observedStock: available`. Cards say “Available when checked · confirm current stock,” display the actual check time and expire within 24 hours. This is six retailers with manual snapshots, zero enabled automatic retailer feeds. It does not complete live inventory.

| Source / exact product | Price USD | Condition / checked | Reference and basis | Fulfillment / material limits |
| --- | ---: | --- | --- | --- |
| Newegg HP ProBook 445 G8, 1TS-000D-1TE80 | 279.99 | Refurbished, 02:23 | 399.99 retailer comparison; ambiguous and unranked | Sold/shipped Newegg; shipping fee/state eligibility unverified; 30-day returns |
| Newegg HP ProDesk 405 G8 mini, N82E16883974001 | 269.99 | Refurbished, 02:25 | 349.99 retailer comparison; ambiguous and unranked | Sold/shipped Newegg; shipping fee/state eligibility unverified; 15-day returns |
| Dyson V9 Submarine Extra Nickel | 249.99 | Certified refurbished, 02:27 | 379.99 explicitly retailer “Was” | Free shipping to 50 states; no PO/APO/FPO; six-month warranty, final sale |
| Dyson Outsize cordless vacuum | 239.99 | Certified refurbished, 02:27 | 399.99 explicitly retailer “Was” | Same Dyson limits; dates are not promised |
| DTO RYOBI ZRPCL206K1 drill kit | 41.99 | Factory reconditioned, 02:27 | 69.99 ambiguous retailer comparison; unranked | Ship To Home Available; continental US, excludes AK/HI; fees/tax unknown; battery/charger included |
| DTO RYOBI ZRPBLID01B impact driver | 47.99 | Factory reconditioned, 02:27 | 79.99 ambiguous retailer comparison; unranked | Same shipping limits; tool only, no battery/charger |
| DTO RIDGID ZRR87044 inflator | 41.99 | Factory reconditioned, 02:27 | 69.99 ambiguous retailer comparison; unranked | Same shipping limits; battery/charger separately sold |
| DTO RYOBI ZRFVF51K clamp fan kit | 17.99 | Factory reconditioned, 02:27 | 29.99 ambiguous retailer comparison; unranked | Same shipping limits; home category |
| DTO RYOBI ZRPBLJS01B jig saw | 59.99 | Factory reconditioned, 02:27 | 99.99 ambiguous retailer comparison; unranked | Same shipping limits; tool only; one-year factory warranty |
| Target KitchenAid RKSM55 5.5qt Agave, A-1002949106 | 219.99 | Manufacturer refurbished, 02:27 | 499.99 explicitly retailer regular price | Seller/shipper KitchenAid; 30-day returns; ZIP eligibility/fees unverified |
| Target Ninja CRISPi Blue, A-1012572744 | 120.16 | Manufacturer refurbished, 02:27 | 196.99 explicitly retailer regular price | Seller/shipper Beach Camera; 30-day returns; ZIP eligibility/fees unverified |
| Vitamix Explorian Black, SKU 065542 | 319.95 | Certified reconditioned, 02:27 | Manufacturer “New 479.95” comparison in factual detail; no independent current-new price or savings rank | Free shipping shown; destination eligibility unverified; three-year warranty |

Exact selected page URLs, observed image URLs, retailer links, original bilingual factual descriptions and check timestamps live in `lib/manual-catalog.ts`. Source photos depict the listing's model/variant, not the actual individual item's cosmetic condition. The Target Agave variant corrects an earlier family URL: A-1002949106 is used; A-1002949099 is excluded. The old Sennheiser timestamps and saved identities are preserved.

## Primary fulfillment evidence

- [Dyson ordering/shipping FAQ](https://www.dyson.com/order-status) explicitly limits delivery to US addresses in the 50 states, excludes PO boxes/APO/FPO and warns Alaska/Hawaii delivery dates are not guaranteed. DC is conservatively unverified in the encoded 50-state scope. The reviewed refurbished product pages show free shipping; these machine prices are above the shipping threshold.
- [DTO pickup and shipping](https://www.directtoolsoutlet.com/pages/pickup-shipping) says continental US only, excludes Alaska/Hawaii, APO/FPO and territories. Item pages explicitly say Ship To Home Available. Store pickup requires a selected store and was not verified. The email/signup promotion's free shipping code is not applied or assumed; fees/tax remain explicit.
- Newegg product pages identify the seller and shipper, exact configuration and return period. Another seller's price/free-shipping banner on the desktop page is not attributed to Newegg's selected offer. No destination-specific delivery promise is inferred.

## Exclusions and freshness decisions

The researchers excluded Dyson V8 Origin (product page out of stock), HP EliteBook 840 G8 (backordered), MSI MAG275CQPF (out of stock) and unresolved Breville variants despite category cards. Back Market MacBook Air/Mac mini candidates lacked resolved image evidence and were not selected for this release. Generic hidden out-of-stock/Coming Soon templates on Dyson/Vitamix were distinguished from the researchers' current selected-offer/variant stock data.

TV pages are not admitted from category prices alone. BuyDig's category lists Samsung U8000F as priced/available while its exact product page says Not Available. A Vizio VHD24M-08 page has an In Stock statement but the web result is last-month cached, so it needs a fresh current-page check before publication. No TV is fabricated to fill the category.

## Strongest data connection options

1. **Woot official API:** [developer portal](https://developer.woot.com/) explicitly documents programmatic live deal feeds across Computers, Electronics, Home and Tools plus per-offer detail, condition, sold-out state, prices and photos. It requires an issued `x-api-key`; the published default limits are 1 request/second and 1,000/day. This is the strongest documented diverse inventory path found, but no key was requested and no new access/account was created. Its old example payloads are not real current listings.
2. **Best Buy Buying Options:** existing source review remains a gated approved-key path with limited buying-option coverage; it is not connected and does not block shipping the snapshot expansion.
3. **Official merchant/affiliate feeds:** Newegg's [developer portal](https://developer.newegg.com/) is a seller marketplace integration, not an open consumer inventory feed. A seller API is not used to access unrelated stock. An authorized affiliate feed or retailer-published feed with item availability and image reuse scope would be preferable to reverse engineering private endpoints.
4. **Publisher syndication:** the previously observed official DealNews RSS transport worked, but editorial membership is not item stock/price evidence. Its earlier sample contained no qualifying condition titles. Existing source-specific holds and consumed private probes remain intact; no replay or automatic normalization is enabled.
5. **Merchant Shopify public products:** publicly readable page/JSON-LD data can support bounded manual verification, as DTO's researchers demonstrated. Accessibility alone does not prove completeness, refresh permission or exact fulfillment. The three resized DTO photo requests use [Shopify's documented same-origin CDN behavior](https://shopify.dev/docs/storefronts/themes/best-practices/performance/platform), not a proxy or access bypass. An automatic adapter needs a tested permitted transport and scope; none is enabled by these notes.

## Verification boundary

Unit tests cover snapshot expiry, same-source saves, image/reference payload exclusion from device pointers, manual/automatic separation, explicit-only savings sorting, category/retailer/price selection, US state shipping exclusions and absence of invented pickup. Playwright in the existing portable preview tests each card/link/frame at 320/390/1280 in EN/RU without mocked image content. The executor proxy fails ordinary remote images, so those checks prove responsive layout and the honest failure state, not successful photo pixels. Parent Windows hosted readback is required for new photos and exact link destinations. V17's four original photos already passed the parent's hosted QA.
