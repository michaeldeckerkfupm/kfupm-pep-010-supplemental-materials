# Reading image audit

Completed 1 November 2026, after restoring separate packet-list pages in the preceding commit.

Reviewed all 82 referenced original-page images for the 80 readings in the five assessment packets. Compared their passage text with the source packets using OCR and inspected every image visually, including the two existing continuation-page images. No additional missing passage text or missing continuation pages was found.

Corrected two remaining bitmap defects in Reading Tests 1-Student: Reading 15 had a cut-off page heading above the passage frame; Reading 17 clipped the Blackbeard picture caption at the right edge. Reading 15 retains the existing passage pixels and diagram positions because re-exporting its Word floating images changed their placement. Reading 17 was rendered with bounds covering the complete source passage and caption. New asset paths avoid reuse of cached images. Reading 2's previous complete crop remains intact.

Checked all 142 generated reading-part page views in the 48 Reading Explorer units. Three lines exceeded the SVG canvas when reference words were bold: Book 2 Unit 7B Part 3, Book 3 Unit 4B Part 1, and Book 3 Unit 11A Part 2. Line wrapping now measures the styled text, including bold words and superscript markers, before rendering. The same measurement also wraps long unbroken strings inside the page.

Only passage-image assets, image metadata and display code change in this audit. Test IDs, collection IDs, question order, answer keys, question options, revisions, saved-attempt namespaces and deadlines remain unchanged. Navigation and progress preservation were checked separately for the first commit. Source-page headings, picture captions, printed line numbers, complete final lines and overlay display were included in the visual review.

Run `node check-reading-image-bounds.cjs` with Playwright and Chromium at `/tmp/reading-chromium` to repeat the SVG boundary check. Run `node check-explorer-superscripts.cjs` to verify raised gloss markers in both views. The targeted bitmap corrections can be reproduced with `python audit_reading_image_crops.py SOURCE_PDF`, using the PDF rendered from the supplied Reading Tests 5-Student Word file.
