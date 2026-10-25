# One-photo live cost demo

Test date: October 25, 2026. Input: `docs/demo-photos/01-downspout.jpg`, the EPA educational photograph credited to Terry Brennan. One image, deliberate mode, no listing/report text, no diagnosis hints, no saved model response.

## Original live deployment

Gemma 4 returned “A gap is visible in the downspout connection.” The browser displayed 35.8 seconds and 4,131 total tokens. The result retained its photo reference.

Keeping that observation exposed only a French-drain option in the existing catalog. That was not an appropriate scope for this observation. No price was claimed from that option.

## Catalog correction

Added a general localized downspout reconnection and elbow replacement scope. It uses MT Construction LLC's published $75–$150 range for the Woodbridge area of Northern Virginia, checked October 25, 2026:

https://mtconstructionllc.com/services/gutter-repairs/

This is one contractor's planning range, not a statewide average or a quote for this photograph. A contractor must confirm scope, accessibility and additional damage. Multiple sections, fascia, buried drains and foundation work are excluded. The app requires explicit scenario confirmation and does not apply this local price to DC or Maryland.

The model and recognition prompt were not changed. The correction adds sourced pricing for the component after the buyer reviews the observation. All 132 unit tests and lint passed.

## Reproduction

1. Upload the single downspout photograph and leave listing/report text blank.
2. Use deliberate mode and select Analyze this home.
3. Review the returned observation against the photo, then Keep observation.
4. Set Cost geography to Northern Virginia.
5. Select Localized downspout reconnection and elbow replacement, quantity 1.
6. Confirm the conditional repair scenario.
7. Check the displayed range and source link. The range is for that selected scope only; it is not a whole-home estimate. Household affordability remains unknown until budget inputs are supplied.

## Corrected public deployment

Stable public link: https://truecost-home-demo.vercel.app

The corrected deployment completed a new live photo-only browser run using Gemma 4, deliberate mode. It returned “A visible gap is present in the downspout connection.” The displayed elapsed time was 32.7 seconds with 4,021 total tokens. No listing/report hints were supplied.

The hosted cost endpoint independently returned HTTP 200 with catalog version `2026-10-25-v2`, `complete: true`, and a selected-scope total of 7,500–15,000 cents for the confirmed localized downspout repair. This total describes one selected repair, not all work on the home.

The browser flow was then completed: Keep observation, select localized downspout reconnection and elbow replacement, quantity 1, and check the conditional-scenario confirmation. The live UI displayed **$75–$150** with the contractor source link and exclusions. No budget inputs were supplied, so monthly ownership and household affordability correctly remained unknown. This verifies one photo-to-selected-repair-cost flow; it does not establish general detection accuracy or a whole-home total.
