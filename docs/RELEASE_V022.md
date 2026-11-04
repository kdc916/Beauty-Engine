# maxVFX Beauty Engine v0.2.2 Release / QA

- Version: 0.2.2 (2026-11-04)
- Runtime: index.html → main.v0.2.2.js
- Modules: mesh-warp.v0.2.2.mjs, reference-match.v0.2.2.mjs, reference-panel.v0.2.2.mjs
- Retained metrics module: reference-metrics.v0.2.1.mjs
- GitHub: https://github.com/kdc916/Beauty-Engine
- Pages target: https://kdc916.github.io/Beauty-Engine/?v=0.2.2

## Implemented
- Two independently analyzed source/reference photographs and normalized 2D feature transfer.
- 0–100 overall and per-region intensity (eyes/nose/lips/jaw/brow), enable toggle, three-image comparison.
- Mesh interpolation with bounded UV displacement, face boundary feather, and foldover fallback.
- Sync selected own photo into the live preview; external photo/sample/camera switches invalidate the match.
- 3-view result shows fully corrected image independently of the main before/after split.
- Keeps pinned mobile preview and separate scrolling controls.
- No references/images/face landmarks stored in localStorage or exported JSON.

## Test status
- PASS: JavaScript syntax check of runtime and three modules.
- PASS: Node math regression and existing mesh/metrics tests; Python source regression checks.
- PASS: local release files hashed to matching GitHub blob SHAs.
- BLOCKED: local Playwright Chromium could not navigate to localhost (ERR_BLOCKED_BY_ADMINISTRATOR).
- NOT VERIFIED: Android/iOS actual WebGL2/MediaPipe rendering, frame rate/thermal, GitHub Pages live deployment.

## Important limitation
Reference Match is an experimental, 2D visual style transformation. It cannot estimate an actual surgical outcome or diagnose medical conditions. No 3D medical predictor is included.
