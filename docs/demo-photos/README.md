# Tested demo photos — October 25, 2026

Use `01-downspout.jpg` first, then `02-ceiling-staining.jpg` in a separate analysis. Open the local app, clear any loaded example/evidence, choose deliberate photo review, and upload one image. Leave listing and inspection text blank for the photo-only demonstration. Budget fields are optional and never sent to Gemma.

These unmodified images come from the [EPA Mold Image Library](https://www.epa.gov/mold/mold-image-library), which permits educational and presentation use. They are not covered by the project MIT license. Credits: downspout — Terry Brennan; ceiling staining — John Martyny, Ph.D.

| Image | Online source | Actual live result | Duration |
|---|---|---|---|
| 01-downspout.jpg | [EPA original](https://www.epa.gov/sites/production/files/2015-10/big_pic29.jpg) | “A gap is visible between sections of the downspout.” | 20.1 seconds |
| 02-ceiling-staining.jpg | [EPA original](https://www.epa.gov/sites/production/files/2015-10/big_pic17.jpg) | “Visible staining is present on the ceiling surface.” | 39.9 seconds |

Test method: actual running `/api/analyze` endpoint, Gemma 4 26B, deliberate mode, one photo and no captions, answers or textual hints. Pipeline and token metadata, plus the less-useful pipe image run, are retained in `live-test-results.json`. This tests the app API, not the browser file picker. These are selected demo examples, not an accuracy evaluation. Future live responses and timings may vary; no response is cached or substituted.

The downspout does not prove foundation damage. The stain does not prove an active leak. These observations alone do not establish a priced repair scope; only choose a repair scenario if its scope is actually appropriate. Unknown scope remains a professional-quote item.
