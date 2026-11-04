# maxVFX Beauty Engine Change Log

## v0.1.2 — 2026-11-04
- Fixed global horizontal magnification: old eye-warp code accidentally scaled texture UVs by image aspect ratio twice even outside the eye radius.
- Changed the runtime asset path to `main.v0.1.2.js` so stale mobile caches cannot continue running an older `main.js`.
- Restricted face slimming displacement to the lower face, reducing hair/background distortion.
- Corrected comparison drag coordinates for contained, letterboxed images.
- Added `tests_geometry.py` and updated README/QA/HANDOFF documentation.
- JavaScript syntax / UV regression tests pass; Android browser/GPU validation remains outstanding.

## v0.1.1 — 2026-11-04
- First eye-warp UV coordinate hotfix. Mobile still showed global magnification, likely from a stale JS asset.

## v0.1.0 — 2026-11-04
- Initial WebGL2/MediaPipe realtime beauty web MVP.
