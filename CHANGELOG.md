## v0.2.0 (2026-11-04)
- Replaced image-wide single-quad eye/jaw shader deformation with 56×72 triangular inverse-UV mesh.
- Clipped deformation to MediaPipe 36-point face outline and feathered the outer face boundary.
- Added mesh foldover detection and attenuation fallback, with 0%-strength identity guarantees.
- Preserved all v0.1.6 beauty, makeup, photo preview, mobile fixed-stage behavior.
- Added automated Node tests for 4:5, square and landscape images in mirrored and unmirrored modes.
- Real mobile GPU/MediaPipe rendering remains unverified in this execution environment.
- Reference Match / consultation mode still planned, not implemented.

## v0.1.6 (2026-11-04)
- Added two-radius skin smoothing and micro-detail reconstruction.
- Added local under-eye fill based on Face Landmarker positions 145 and 374.
- Added highlight roll-off protection limited to skin mask.
- Added new independent sliders to the existing mobile scrollable control panel.
- Migrated older saved presets to appropriate per-preset defaults.
- Preserved sample photo, fixed preview, face warp and makeup.
- Static tests PASS; real WebGL2/mobile runtime validation pending (local browser blocked by policy).

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


## 2026-11-04: Roadmap v1.1 (documentation only)
- Planned v0.2.1–v0.2.3 Reference Match and v0.3.1–v0.3.2 consultation visualization.
- Added design, QA plan, reference-match JSON settings schema and smoke tests.
- Runtime stays at v0.1.5. No surgery outcome prediction feature or clinical claims.
