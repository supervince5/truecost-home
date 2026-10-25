# Seven-view local demo

The interface accepts seven photos of the same home. It sends them to Gemma one at a time with visible progress, a cancel button, and the existing per-request time limit. Listing and report text accompany the first view only. Results combine independent observations and preserve the original photo references. They do not establish shared causes, identify repeated physical defects automatically, or appraise market value.

## Reference property

[348 Thompson Hollow Rd, Bentonville, VA 22610](https://www.redfin.com/VA/Bentonville/348-Thompson-Hollow-Rd-22610/home/68818302). The seven selected views are exterior/yard, deck, rear exterior/tank, kitchen, living room/stove, bathroom, and bedroom. Source URLs and checksums are in [the manifest](SEVEN_VIEW_SOURCES.json). These are evaluation examples from one property, not seven independently inspected conditions. Listing availability, price and measurements can change and are not inputs to the photo-only test.

The listing photographs retain their rights and visible Bright MLS watermarks. They are provided as local evaluation inputs and are not copied into the public code repository. The app accepts user-provided files; it does not scrape listing websites.

## Run it

1. Open the local app and choose Explore a home.
2. Select the seven JPG files together. The previews preserve their order.
3. Leave listing, report and budget fields blank for the photo-only check.
4. Choose deliberate review and Analyze this home. Multiple photos may take several minutes.
5. Check each finding against its attached original photo. Exclude unsupported or repeated observations.
6. Confirm only an appropriate repair scope. A shared repair is priced once. Unknown costs remain unknown.

On failure, the review stops and names the failed view. It does not certify the remaining photos clear or present an incomplete review as complete. Cancel aborts the active browser request and prevents subsequent requests. Provider work already started may still be billed.

## Verification

Automated checks cover seven single-image requests, text sent once, unique source and finding IDs, cancellation before and during the queue, failure stopping later calls, mixed-version rejection, and unavailable usage remaining unknown. These are software checks, not vision accuracy scores. No model training or alternative model is used.

### Live browser run, October 25, 2026

All seven images completed through the UI in deliberate mode using `gemma-4-26b-a4b-it`. The displayed elapsed time was 334.8 seconds. Token usage was unavailable and displayed as unknown. No listing text, inspection report, or financial inputs were supplied.

The result contained two observations: exterior siding staining in photo 3, and ceiling staining near the fan in photo 5. Both retained the correct original photo reference. The ceiling observation is ambiguous because the image includes a spinning fan, shadows and uneven illumination; this run does not establish a stain or leak. Other visible features, including weathered deck boards and unfinished bathroom work, were not surfaced. No qualified inspection labels were available, so this is not a measured accuracy score.

The queue and result presentation completed successfully, but this set is **not an approved demonstration of reliable whole-home defect detection**. It is useful for showing seven-photo intake, evidence review and honest unknowns. Exclude unsupported observations before selecting repair scopes. This run did not validate repair estimates, affordability, market value or hidden conditions.

Final software verification: lint, TypeScript, 130 unit tests and the production build passed. The interactive area tabs were checked using pointer and keyboard input. These checks do not resolve the visual-recognition limitations above.
