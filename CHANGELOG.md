# CHANGELOG — v0.9.0 통합 릴리스

## 2026-11-04 · v0.9.0

- v0.3.1 이후 예정된 고급 커스터마이징 기능을 분리 출시 없이 통합 베타로 패키징.
- `face-sculpt.v0.9.0.mjs` (pure inverse UV, 6-region bounded warps) 추가. 외곽 감쇠/품질 제한/라이브 턱·볼 비활성.
- 사진용 미형 상세 6개 슬라이더 + 라이브 옵트인 BETA + 안전 신뢰도 적용.
- 셰이더에 `uStudioLight` 가상 보조광 추가 및 UI 4개 조명 프리셋.
- `look-presets.v0.9.0.mjs`: 세부 얼굴 파라미터·스튜디오 라이트·라이브 모드 설정 저장. 이전 JSON 읽기 호환.
- `look-links.v0.9.0.mjs`: UTF-8 base64url 해시 기반 설정 링크 공유/불러오기. 길이/형식 검증 및 사진/랜드마크 배제.
- 전후 비교 PNG 내보내기, LIVE QA 요약 정보 패널.
- 변경된 모듈: 최신 v0.9.0 엔트리/imports, CSS 캐시 갱신, GitHub Actions 최신 파일 검사, 단위·통합 회귀 테스트.
- **제외·미검증:** 완전 3D 얼굴/측면·완전 가림 추적/물리 광원 복원/모바일 실기기 성능.

---

# v0.3.1 — Live Pose Continuity & GPU Safety

## v0.3.1 — 포즈 연속성·마스크 정렬·GPU 메시 업로드 최적화 (2026-11-04)
- **Pose Continuity**: 3개 이상 안정 프레임 확인 후 얼굴 변형을 서서히 복구. 급격한 회전·포즈 추정 누락 때 즉각 신뢰도 감쇠. 2D fallback은 낮은 확신도로 제한.
- **조명 신뢰도**: 포즈 신뢰도 감소 시 3D 근사 조명 신뢰도도 함께 감쇠. 실제 3D 복원·광원 위치 추적은 아님.
- **Matte Alignment**: 코뿐 아니라 양쪽 눈 중심·너비·기울기 확인. 옛 마스크가 회전한 얼굴의 잘못된 위치에 붙는 상황 억제.
- **GPU/CPU**: 메시 변형 강도가 0이고 이미 항등 UV가 업로드된 상태면 불필요한 4,161-정점 재계산/버퍼 업로드 생략. 변형 필요 시 즉시 갱신.
- **보안/개인정보**: 얼굴 데이터·사진 추가 저장 및 네트워크 전송 기능 없음. 프리셋 구조 및 사진 공유 기존 방식 유지.
- **중요**: 실제 모바일 GPU 장시간 출력·조명 화질·측면 가림·턱선 품질은 실기기 QA 필요. 자동 테스트는 이 효과를 입증하지 못함.

## v0.3.0 (2026-11-04)
- Added optional pose-guided ellipsoidal face relighting BETA, confined to face-skin and exposure-safe range.
- Added a directional lighting field with confidence and temporal rate limits, and a toggle saved in My Look presets.
- Added temporal semantic-occlusion matte: fast protection, slower release, 1px occluder edge guard, reset on tracking displacement/size/source changes.
- Added render-time semantic matte alignment validation to prevent applying a stale mask after head movement.
- Maintained legacy v0.2.9 Live Safe, Face Mesh, Photo/Reference Match, PNG and JSON exports, mobile preview behavior.
- Real mobile WebGL2/MediaPipe output and measured performance remain unverified.

## v0.2.9 — 2026-11-04
- Added opt-in MediaPipe SelfieMulticlass pixel segmentation for background, hair, body skin, face skin, clothing, and accessories.
- Added conservative preservation matte sampled at unwarped image coordinates (WebGL2 TEXTURE3) to avoid pulling occluding pixels with the face mesh.
- Added independent semantic segmentation worker-like controller (synchronous inference currently; rate-limited to reduce UI-thread load), model lazy loading, CPU delegate, stale mask / invalid face quality fallback, error handling and input generation cancellation.
- Added on/off and explicit status panel, GPU context restoration support, versioned modules, and deterministic mock inference + pixel mask tests.
- Kept existing live pose, exposure smoothing, reference match, look library, mobile pinned preview and original-image fallback. No repository upload performed.
- Caveat: class labels approximate hand/hair occlusion; true hand segmentation and actual mobile GPU acceptance remain unverified.

## v0.2.8 (2026-11-04)
- Added median-consensus landmark anomaly guard with bounded isolated-point repair and multiple-region fail-close behavior.
- Added time-based quality envelope for live eyes/skin/makeup/pose-light intensity; stale face retained no longer than 310ms.
- Added yaw/pitch pose attenuation in 2D fallback as well as matrix-based tracking.
- Added per-frame change limiting to scene brightness/warmth/directional light estimate to reduce exposure flicker.
- Preserved previous local Look presets, fixed preview, reference matching, shaders, adaptive performance and original fallback.
- All changes distributed as full ZIP; **GitHub not changed by this release**. Mobile WebGL2 and physical occlusion classification remain unverified/not implemented.

## v0.2.7 — 2026-11-04
- MediaPipe optional facial transformation matrix for rough yaw/pitch/roll (with 2D landmark fallback and validated matrix basis).
- New face-pose.v0.2.7.mjs: orientation validation, smoothing, sudden-jump rejection, stale-state clearing, confidence falloff on large turns.
- GPU WebGL2 fragment shader: conservatively bounded face-mask-only pose-aware lighting proxy, coupled to scene ambient direction. This is NOT calibrated 3D relighting.
- Mobile face-pose status and per-look `poseAware` ON/OFF; existing saved JSON look schema remains backward compatible.
- MediaPipe GPU/CPU and matrix-on/off fallbacks to avoid losing existing 2D face tracking on unsupported devices.
- Existing occlusion, chin UV safety, Reference Match, pinned preview, adaptive performance and sharing maintained.
- 44 Node tests + 12 Python static regressions passed. Real mobile/WebGL2 execution remains unverified: Chromium blocked by security policy.
- No GitHub mutations. Full root-layout ZIP for manual upload.

## v0.2.6 (2026-11-04)
- Added 2D scene-adaptive ambient brightness/warmth/left-right illumination proxy for skin.
- Added named My Look settings store, import/export/share, and explicit corrected PNG sharing.
- Added short occlusion hold (<130ms) with conservative original fallback; no full occlusion tracking guarantee.
- Updated GitHub Actions and source tests; no repo commit made.

## v0.2.5 (2026-11-04) — Adaptive Live Performance / Stability
- Added adaptive live profile controller with user-selectable Auto, Quality, Balanced, Performance and Battery options.
- Added frame pacing, performance-based camera resolution selection and tier-aware face/mask intervals; adaptation includes hysteresis and a cooldown.
- Replaced repeated same-size video, skin and makeup texture reallocation with sub-image updates; still photos avoid redundant GPU uploads.
- Prevented stale getUserMedia permissions from activating a camera after a photo/sample switch.
- Made WebGL context loss use the Canvas fallback and context restoration reinitialize GPU resources (including photo masks).
- Reset temporal face safety state on tab background/resume, preserving the Live Safe jawline fallback from v0.2.4.
- Added deterministic performance controller tests and runtime/asset regression checks; no GitHub commit is performed by ChatGPT for this release.
- Limitations: Android/iOS hardware metrics and GPU pixel output were NOT verified in this environment.

## v0.2.4 (2026-11-04) — Live Safe / Jawline Artifact Guard
- Fixed the default face-slim geometry near chin/silhouette, regardless of reference-matching state.
- Live camera mode now disables jaw mesh warp by default and caps the eye warp; makeup, color and skin continue.
- Added motion-aware face landmark filtering; missing/invalid/abruptly changing landmarks trigger identity fallback.
- Added mesh UV stretch ratio check alongside triangle foldover check; gradual attenuation and identity fallback.
- Added reusable mesh UV work buffers, reducing per-update allocations.
- Integrated previously ZIP-only v0.2.3 Reference Match boundary attenuation into GitHub runtime.
- Added Live Safe badge, cache-busted CSS/JS, automated geometry/temporal regression.
- Actual device GPU / browser visual QA remains pending.

## v0.2.3 (2026-11-04)
- Fixed jawline tearing / broken contour artifacts on the corrected side by introducing contour-safe attenuation.
- Increased face-boundary feathering, added interior safety falloff, reduced default global/jaw strengths and reduced max displacement limit.
- Slightly softened reference delta composition to prioritize live stability.

## v0.2.3 (2026-11-04)
- Reference Match: 5-region bounded inverse mesh warp driven by two independently measured faces.
- Per-feature sliders, enable toggle, source/reference/result triptych.
- Preview sync for selected own photo; stale analysis invalidated on source switches.
- Original background protection and fold-over attenuation preserved.
- Not a surgery result predictor. Mobile WebGL2 real-device QA still required.

## v0.2.1 (2026-11-04)
- Added separate own/reference photo selection, captured preview input, thumbnail and per-slot clear controls.
- New on-device still-photo FaceLandmarker IMAGE task, isolated from LIVE beauty tracker. Requires exactly one face, rejects zero/multiple faces.
- New pixel-aspect-correct 2D metrics: eye width/opening, eyebrow height, nose width, lip width/height, jaw width/chin length normalized by eye separation and corrected for roll.
- Added orientation/expression/size warnings, cancellation generation IDs and serialized analysis.
- No automatic facial transformation or clinical surgery outcome claims.
- Preserved v0.2.0 mesh warp/skin/makeup and pinned mobile preview.
- Static and synthetic geometry tests pass; mobile browser / WebGL2 / external model fetch unverified in this environment (ERR_BLOCKED_BY_ADMINISTRATOR).

## v0.1.6 (2026-11-04)
- Added two-radius skin smoothing and micro-detail reconstruction.
- Added local under-eye fill based on Face Landmarker positions 145 and 374.
- Added highlight roll-off protection limited to skin mask.
- Added new independent sliders to the existing mobile scrollable control panel.
- Migrated older saved presets to appropriate per-preset defaults.
- Preserved sample photo, fixed preview, face warp and makeup.
- Static tests PASS; real WebGL2/mobile runtime validation pending (local browser blocked by policy).

## Planning update 2026-11-04 (runtime stays at v0.1.5)
- Added formal Reference Match roadmap milestones in v0.2.0–v0.2.3.
- Added consultation visualization research/workflow scope for v0.3.1–v0.3.2 and v0.5.
- Added design spec, privacy/guidance boundaries, QA plan, preset JSON schema/example, stdlib sanity test.
- No runtime feature changes; surgery outcome prediction is **not implemented**.

## v0.1.5 (2026-11-04)
- Lip contour / inner-mouth exclusion / feathered cheek masks via GPU makeup texture.
- Motion-aware smoothing of face landmarks and masks.
- Three-color QA overlay for skin/lips/cheeks.
- Preserved mobile pinned-preview layout and sample portrait.

## v0.1.4 — 2026-11-04
- 얼굴 외곽 랜드마크 기반 피부 전용 마스크; 눈·눈썹·입술 제외
- GPU 스무딩에서 마스크 외부 텍스처 픽셀 혼입 억제
- 피부 영역 디버그 오버레이 (WebGL2)
- 사진/샘플 정적 렌더 업데이트 최적화, 소스 전환 시 오래된 추적값 폐기
- 모바일 상단 고정 프리뷰와 샘플 자동 테스트 유지
- 모바일/데스크톱 Chromium Canvas 폴백 UI 테스트 통과, 실제 WebGL2 및 MediaPipe 모델 QA 필요

# Changelog

## v0.1.1 (2026-11-04)
- Fix eye reshape UV corruption on non-square source images.
- Preserve original texture UV independent of distance-aspect correction.
- Bump UI version and document mobile QA needs.


## v0.1.2 (2026-11-04) — Photo split preview global scale fix
- Force a fresh runtime by serving a new asset path `main.v0.1.2.js` (mobile browser can cache old `main.js`).
- Rewrite `mapEyes()` to return the identity UV outside the local eye radius. Aspect ratio is used only to measure distance, never to offset UV positions.
- Bound jawline warp to the lower face with a smoothly decaying cheek mask; the background remains fixed.
- Fix comparison slider: it was treating the WebGL context object as if it were the canvas and miscomputed object-fit bounds on non-4:5 sources.
- Added regression checks for untouched background pixels, original/before split, and image-coordinate alignment.

## v0.1.3 (2026-11-04)
- 내장 생성 인물 샘플 `assets/sample-portrait.webp` (360×450) 추가, 앱 진입 시 자동 로드 및 비교 모드 활성화.
- 화면 상단의 프리뷰 고정, 하단 스크롤 조절 패널 도입; 모바일 390×844 / 360×667 및 가로 모드 배치 점검.
- 샘플 / 카메라 / 사진 3종 소스 전환 버튼 상단 배치.
- `height:100%` 및 `align-items:stretch` 보강으로 실제 브라우저의 프리뷰 2px 붕괴 버그 수정.
- CSS/JS 캐시 무효화를 위해 v0.1.3 자산 경로 갱신.
- WebGL2를 사용할 수 없는 경우 Canvas2D 비교 원본/보정 합성을 지원.
- QA: Node 구문, 정적 검사, Chromium `set_content` UI/스크롤/초기 샘플 흐름 통과. 실제 GitHub Pages GPU·카메라 QA 별도 필요.
