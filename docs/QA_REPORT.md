# v0.1.1 QA Report

## 정적 점검
- JavaScript 구문 검사: 수행
- Web 서버에서 HTML/CSS/JS 자원 로딩: 수행 예정
- PC Chromium 렌더/기본 인터랙션 검사: 수행 예정
- 스마트폰 실제 카메라/권한: **미검증**
- 얼굴 추적 CDN/모델 실기기 동작: **미검증**

## 수동 기기 테스트 시나리오
1. Android Chrome에서 GitHub Pages 접속 → 카메라 시작 → 권한 허용
2. 얼굴 1명 정면 배치 → 상태가 ‘얼굴 인식 중’으로 바뀌는지
3. 피부 0/100, 얼굴형 0/100, 메이크업 0/100 각각 차이 확인
4. 비교 버튼 → 좌우 드래그 → 다시 비교 종료
5. 전후면 카메라 전환 및 5분 이상 실행
6. 사진 PNG 저장 → 갤러리 저장/파일 확인
7. 사진 가져오기 → Face Landmarker 작동 여부 확인
8. 프리셋 변경 후 재접속 → 저장된 상태 복원 확인
9. iPhone Safari에서도 같은 테스트
10. PC Chrome/Edge에서 USB 웹캠 및 파일 선택 테스트

## 주의
브라우저의 데스크톱 에뮬레이션은 실제 스마트폰 카메라, GPU, 카메라 권한 동작을 대체하지 못합니다.

## 이번 패키지에서 실제 수행한 확인
- Node.js `node --check main.v0.1.2.js`: PASS
- HTML DOM 중복 ID 검사: PASS
- 필수 리소스 존재 확인: PASS
- Playwright Chromium 로컬 페이지 접근: **환경 보안 정책에서 차단됨** (`ERR_BLOCKED_BY_ADMINISTRATOR`). 화면 렌더·실제 WebGL 셰이더 컴파일 검증 불가.
- 따라서 브라우저 구동과 실제 모바일 GPU 품질은 **PASS라고 주장하지 않음**.

## v0.1.1
- PASS: JavaScript syntax validation (`node --check`).
- NEEDS DEVICE QA: Galaxy/Android Chrome 사진 전후 비교에서 우측 영상 가로 늘어짐이 사라졌는지 확인.


## v0.1.2
- PASS: `node --check main.v0.1.2.js`
- PASS: `python tests_geometry.py` (눈 영향범위 외 UV 불변, 비율 4:5/1:1/16:9, 캐시 갱신 경로, 비교 캔버스 실객체 참조)
- PASS: 1122×1402 테스트 사진과 사용자의 2026-11-04 스크린샷 정합: 왼쪽 원본 영역 상단 비교 기준 상관계수 > 0.99, 우측 영역 SIFT 특징점은 구 셰이더의 약 1.56배 X 확대에 가까움
- BLOCKED: Chromium/Playwright 로컬 브라우저 접근이 환경 보안 설정 `ERR_BLOCKED_BY_ADMINISTRATOR`로 차단되어 WebGL 실행 검증은 수행하지 못함.
- NEEDS DEVICE QA: Android Chrome/Samsung Internet에서 버전 0.1.2 표시, 새 JS 로딩, 얼굴 사진 적용 후 비교선 우측 배경/머리카락 확대 사라짐 확인.


## v0.1.3 — 사용성 및 샘플 이미지 QA
- PASS: Node.js `--check main.v0.1.3.js`.
- PASS: `python tests_geometry.py`, `python tests_mobile_layout.py`.
- PASS: Chromium inline HTML/CSS 테스트 390×844, 360×667, 820×390 (가로보기), 1280×800.
- PASS: 모바일 390×844은 프리뷰 top=84px, bottom=411px, 컨트롤 top=438px, bottom=837px, 패널 스크롤 가능, body 넘침 없음.
- PASS: 360×667 모바일은 프리뷰 top=84px, bottom=326px, 컨트롤 top=353px, bottom=660px.
- PASS: Chromium 런타임 인라인 실행으로 내장 샘플 자동 표시(`SAMPLE PHOTO`), 비교 모드 활성화, 패널 스크롤 시 프리뷰 좌표 불변 확인.
- PASS: 생성 사진 WebP의 Git blob SHA `30e063c5c138d31c534a00a3febc3bcc84b03d84`가 저장소 업로드본과 일치.
- BLOCKED: HTTP 네비게이션 Playwright는 로컬 보안 정책 `ERR_BLOCKED_BY_ADMINISTRATOR`.
- NEEDS DEVICE QA: WebGL2 GPU 셰이더, MediaPipe Face Landmarker, Android/iOS 실제 카메라와 프리셋 보정 결과.


## v0.1.4 regression — 2026-11-04
- PASS: JavaScript Node syntax check
- PASS: 3 viewport screenshot UI tests using Chromium with deterministic local mock face landmarks; no page errors
- PASS: bundled sample preview, mask debug toggle, slider interaction, stationary image metric label, persistent preview while scrolling
- PASS: static geometry/face mask source assertions, 478-point indices range and HTML links
- LIMIT: headless Chromium on the runner exposes neither WebGL1 nor WebGL2; therefore only Canvas 2D fallback was exercised in browser. Do not present this as GPU shader QA.
- LIMIT: model/CDN loaded on demand; mock face does not verify MediaPipe landmark accuracy or timing on mobile devices.
- FOLLOW-UP: run on Android Chrome and iOS Safari with webgl2 enabled, inspect skin mask around the hairline and moving faces.


## v0.1.6 — 피부 품질 개선 (2026-11-04)
- PASS: node --check main.v0.1.6.js (JavaScript 구문).
- PASS: tests_geometry.py, tests_makeup.py, tests_mobile_layout.py, tests_reference_docs.py, tests_skin_mask.py, tests_skin_quality.py (정적 회귀).
- PASS: 13개 랜드마크 uniform/CPU buffer 크기 일치 및 3개 신규 파라미터 GPU uniforms 연결.
- PASS: 샘플 파일 WebP 확인, 기존 프리셋 복원 시 신규값의 프리셋별 기본값 초기화 코드 확인.
- BLOCKED: Playwright/Chromium이 HTTP localhost 페이지에 접근 시 ERR_BLOCKED_BY_ADMINISTRATOR. 모바일 UI 시각 확인 및 실제 GPU 셰이더 컴파일을 이 환경에서는 검증할 수 없음.
- NEEDS DEVICE QA: Android Chrome/Samsung Internet/iOS Safari에서 샘플·웹캠, 스무딩, 디테일, 눈 밑, 하이라이트, 5~10분 연속 FPS/발열 확인.
- Performance note: 피부 스무딩 GPU 샘플링 횟수가 기존 8방향에서 2반경 16방향으로 증가하므로 모바일 성능 저하 가능.

## v0.2.0 Face Mesh Warp QA — 2026-11-04
- PASS `node --check main.v0.2.0.js`, `node --check mesh-warp.v0.2.0.mjs`
- PASS `node --test tests/mesh-warp.test.mjs`: 4:5, 1:1, 16:9 × 미러 ON/OFF 6개 조합에서 0% 항등, 100% 변형, 배경 보존, 0 fold-over.
- PASS 기존 Python 6개 정적 테스트: 이미지 번들, 비교 UI, 피부/메이크업 셰이더 연결, 모바일 고정 프리뷰, Reference Match 계획 스키마.
- PERFORMANCE (Node CPU, 실제 모바일 아님): 샘플 4,161 정점 변형 갱신 평균 약 2.4ms, 테스트 시스템과 옵션에 따라 달라짐.
- BLOCKED: 로컬 Chromium/Playwright 페이지 접근 `ERR_BLOCKED_BY_ADMINISTRATOR`. WebGL2 셰이더 실제 컴파일 및 기기별 프레임 성능 미검증.
- 다음 수동 QA: 1) v0.2.0 표시 확인 2) 샘플 사진 3) 눈 크기/얼굴 라인 0↔100 4) 배경·머리카락 유지 5) 비교선 드래그 6) 카메라 전후 전환 7) 5분 연속 FPS/발열.

## v0.2.1 — Reference Analysis QA
- PASS: JS 구문 검사(main, metrics, panel), 기존 6개 Python 정적 회귀 스위트.
- PASS: Node 메시 테스트와 새 synthetic reference geometry(해상도 800×1000 vs 1600×2000, 회전 보정, 동일 입력 비교, 잘못된 입력, 경고).
- PASS: 주요 DOM ID, 모듈 임포트 및 파일 크기·형식/0·다인 검사 존재 여부(정적).
- BLOCKED: Playwright Chromium 로컬 HTTP 페이지 접근 `net::ERR_BLOCKED_BY_ADMINISTRATOR`. 모바일 화면 렌더와 MediaPipe 실사용 불가.
- DEVICE QA NEEDED: 내/참고 사진 각각 올리기, 0/2명 오류, 업로드 교체 후 이전 분석 제거, 전면 카메라 현재 프리뷰 캡처, 저장·원본 비교/메이크업, 장시간 GPU FPS.
- INTERPRETATION: 이 분석 수치는 2D 사진의 비율이며 진단·얼굴 인식·수술 결과 예측을 위한 임상 수치가 아님.


## v0.2.3 validation addendum
- Corrected 4-component interleaved mesh UV foldover attenuation/fallback indexing.
- Fully corrected 3-way result is rendered separately while main before/after split is retained.
- No-WebGL2 browsers disable Reference Match controls.
- Local Chromium localhost access: ERR_BLOCKED_BY_ADMINISTRATOR; live model/GPU QA blocked.


## v0.2.3 QA 추가
- 정적 코드 리뷰 기준으로 jawline artifact의 주요 원인이 face boundary 근처의 과도한 reference displacement로 판단됨.
- 수정 후 Reference Match는 외곽선 근처에서 2차 감쇠, 내부 영역 우선, jaw 하단 추가 감쇠를 적용.
- 실기기 라이브 카메라 GPU QA는 여전히 필요.


## v0.2.4 — UV/Jawline/Temporal Stability QA
- PASS: node --test tests/*.test.mjs (16 tests, 0 failures).
- PASS: python tests_*.py 정적 회귀.
- PASS: node --check main.v0.2.4.js, live-safety.v0.2.4.mjs, mesh-warp.v0.2.4.mjs, reference-match.v0.2.4.mjs, reference-panel.v0.2.4.mjs.
- PASS: git blob SHA of source files matched GitHub after commit.
- BLOCKED: Playwright Chromium local HTTP and file URL both reported ERR_BLOCKED_BY_ADMINISTRATOR.
- NOT VERIFIED: on-device WebGL2 compile, MediaPipe tracking/face masks, real silhouette in live mode, GitHub Pages live availability.


## v0.2.5 QA — Adaptive Quality and Long-session Robustness
- PASS: `node --test tests/*.test.mjs` — 22 tests (16 previous mesh/ref/live safety + 6 new scheduler tests).
- PASS: `for file in tests_*.py; do python "$file"; done` — 10 static regression scripts.
- PASS: JS syntax checks for runtime + all 5 current modules, including v0.2.5 performance module.
- PASS: source version/import consistency and duplicated DOM ID checks, reference features preserved.
- BLOCKED: Chromium cannot load localhost (`net::ERR_BLOCKED_BY_ADMINISTRATOR`) in this execution environment; NO browser visual, WebGL GPU or real camera verification.
- NOT MEASURED: 5/10/30-minute live run, thermal/battery consumption, frame-time profile on Android/iOS, reference-match real GPU visual QA.
- REQUIRED MANUAL: app v0.2.5 displayed; sample portrait original-vs-correction jaw has no tears; camera 10 minutes auto mode, turn head/rapid movement, camera flip, photo switch during permission; photo PNG export; manual profile modes; background/resume.
- The FPS figure in UI is the measured displayed frame rate. Profile budgets are target caps, not a guarantee.
