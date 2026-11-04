## v0.1.5 (2026-11-04)
- Lip contour / inner-mouth exclusion / feathered cheek masks via GPU makeup texture.
- Motion-aware smoothing of face landmarks and masks.
- Three-color QA overlay for skin/lips/cheeks.
- Preserved mobile pinned-preview layout and sample portrait.

## v0.1.4 — 2026-11-04
- Real face-oval skin mask using MediaPipe landmarks (36 contour points)
- Eyes, brows, lips excluded from smoothing and glow region
- Skin-mask-weighted edge-aware blur to avoid bleeding across feature boundaries
- On-demand still-image rendering (camera continues real-time)
- Face tracking source-generation guard, QA skin overlay toggle
- Preserves sample portrait and fixed mobile preview
- WebGL2 GPU runtime and real MediaPipe detection still require device validation

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


## v0.1.3 (2026-11-04)
- Added generated portrait as bundled sample WebP; automatic startup and split-view comparison.
- Updated mobile viewport to persistent preview + separately scrolling controls (100dvh, stretch and 100% height).
- Source selector: Sample / Camera / Photo. Landscape layout remains split horizontally.
- Canvas2D fallback now composites the original left half during comparison.
- Added browser layout/runtime verification and mobile layout regression tests.
