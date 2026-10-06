# Canvas Quiz Compiler 2.0

A Manifest V3 Chrome extension for recording Canvas quiz questions and selected answers for personal offline review.

## What changed

- Dark-first Side Panel dashboard instead of a cramped popup.
- Shadow DOM page controls so Canvas styles cannot bleed into the extension UI.
- Safer text rendering in the dashboard and stable per-session question IDs.
- Storage-backed recording state suitable for an ephemeral MV3 service worker.
- Search, question counts, review view, text export, JSON archive export, and deletion.
- Debounced page observation and support for radio, checkbox, and short-answer inputs.
- Repeated quiz attempts are labeled automatically; changed answers are retained with the previous answer for comparison.
- Multi-select checkbox answers are captured together instead of only saving the first selection.
- Recording stops when Canvas exposes a completed/submitted quiz state.

## Load locally

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this `extension` directory.

The extension currently targets Canvas-hosted Instructure domains. Custom Canvas domains can be added later through an explicit host-permission setting if needed.
