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


## v0.2.6 — Adaptive Light + My Look Library + Live Occlusion Recovery
- **환경 라이트 1차(BETA):** 저해상도 24×24 영상 샘플에서 평균 밝기/대략적 색온도 및 좌우 밝기 차이를 추정합니다. 280ms 샘플·EMA 평활화, 피부 마스크 내부에만 매우 약한 밝기/색상 보정을 반영합니다. 실시간 조명 재현의 연구 단계로, 3D 법선·그림자·반사·실제 조도 측정이나 재조명 SDK는 아닙니다.
- **My Look Library:** 보정 12개 파라미터, 자동 조명 토글/강도, Reference Match 강도 설정을 이름으로 로컬에 최대 16개 저장/불러오기/삭제합니다. JSON 파일로 내보내기 및 모바일 Web Share API로 공유하며, 미지원 시 JSON 다운로드합니다.
- **보정된 얼굴 이미지 저장/공유:** PNG 스냅샷(원본 비교선이 켜져도 보정 영역만 출력)을 명시적인 사용자 조작으로 저장·공유합니다.
- **개인정보 보호:** 룩 JSON은 이미지·랜드마크·얼굴 임베딩·인물 식별 정보가 없으며, 다른 기기에서 동일한 Reference Match를 재현하려면 참고 사진을 별도로 다시 등록해야 합니다. PNG에는 선택한 사용자의 실제 얼굴 이미지가 포함됩니다.
- **가림/회전 안전 처리:** 급격한 방향/가림 의심 좌표 및 좌표 튐을 감지하고 약 130ms의 일시 유지 후 안전하게 원본으로 복귀합니다. 재인식은 연속으로 안정된 추적 결과를 요구합니다. 완전 가림 후의 위치를 정확히 예측하거나 무제한 유지하지 않습니다.
- 기존 v0.2.5 성능 자동 조절·얼굴 메시 보호·모바일 고정 프리뷰·샘플 인물·2D Reference Match 유지.

### 현재 제한 및 다음 목표
1. 진짜 **조명 추적**: 3D 얼굴 형상/법선 추정, 환경 조명 SH/카메라 노출·화이트밸런스, 측면/강한 역광 대응, 기기별 색 관리.
2. **지속적인 얼굴 변형**: 회전/부분 가림에 견디는 3D Face Model + optical flow + face-identity reacquisition (현재는 짧은 유예/안전 정지).
3. **게임 캐릭터처럼 커스터마이징**: 코·입·눈·턱·볼·피부/메이크업·LUT·조명의 파라미터 라이브러리와 얼굴별 재타기팅.
4. **외형 보존용 개인 얼굴 프로필**: 사진/기하 정보를 개인 로컬 저장하려면 별도 암호화와 사용자 동의/삭제/공유 권한 관리 설계 필요. 현재 JSON은 설정 프리셋이며 개인 얼굴 형상 자체를 저장하지 않습니다.
5. **실기기 QA**: Android Chrome/Samsung Internet, iOS Safari, 저조도/역광/고개 45° 회전/눈과 입 가림/얼굴 완전 가림 및 프리셋 공유·모바일 파일 저장.

### QA
- Node.js 동적 테스트 35개 통과(기존 Warp·Reference·성능 + 조명 통계·공유 룩·가림 유예).
- Python 정적 회귀 11개 통과.
- JS syntax/HTML 리소스 참조/ZIP 테스트는 아래 QA_RUN_V026.txt 참조.
- **실제 카메라 GPU·MediaPipe 실기기 기능은 본 환경에서 검증하지 못했습니다. 성능/FPS/발열 및 모든 상황 무결성은 보장하지 않습니다.**


## v0.2.7 — 3D pose-driven lighting foundation
- PASS: 44/44 Node dynamic tests, including 9 pose-matrix/fallback/EMA/jump/missing/pose-look cases.
- PASS: 12/12 Python static regressions; HTML unique IDs, module entry path, shaders/uniform references, privacy-safe pose tracking.
- PASS: JS syntax checks of active modules and automated CI source references.
- BLOCKED: actual browser rendering: Chromium navigation to localhost AND file blocked by ERR_BLOCKED_BY_ADMINISTRATOR.
- NOT VERIFIED: FaceLandmarker matrix in Android/iOS real devices; portrait photos across yaw/roll, GPU shader output, 10-min thermal/fps and lamp movement.
- IMPORTANT: light proxy is a rough face-oriented 2D shading model, NOT physically calibrated 3D lighting.


## v0.2.8 — 부분 가림/포즈/광원 안정화
- Node 테스트: `node --test tests/*.test.mjs`, 새 occlusion-guard/live-transition/lighting-stability 시나리오 포함.
- Python 검사: `for file in tests_*.py; do python "$file"; done`, v0.2.8 엔트리 검증.
- 확인 대상: 한 점 튐 시 수리, 다수 이상점 차단, 240ms 초과 가림 재구성 금지, 310ms 초과 얼굴 상태 폐기, 30/60fps의 시간 기반 감쇠 동등성, 조명 추정의 프레임당 변화율 제한.
- 실기기 카메라/GPU 출력 및 실제 손/머리카락 탐지는 미검증. 자동 QA만으로 라이브 턱선이 절대 깨지지 않는다고 보장할 수 없음.

## v0.2.9 — Semantic Occlusion / Profile Stability QA (2026-11-04)
- PASS: Node 72/72 동적 테스트 (기존 Face Mesh/Reference Match/Live Safe/Lighting/Look + 신규 6-class mask, resize, 데이터 폐기, 가짜 MediaPipe inference, 오류 fallback).
- PASS: Python 14/14 정적 회귀 테스트 (기존 프리셋/모바일/마스크 + 신규 Semantic Occlusion 연동).
- PASS: 13개 현재 JS/MJS 파일 구문 검사, 모든 지역 import 경로 확인, HTML UI ID 78개 중복 없음.
- PASS: 파일/자산 경로 및 모바일 상단 프리뷰·하단 보정 패널 독립 스크롤 유지 확인.
- BLOCKED: Chromium에서 file:// 로컬 페이지가 ERR_BLOCKED_BY_ADMINISTRATOR로 차단돼 실제 WebGL2/MediaPipe 시각 동작 확인 불가.
- NOT VERIFIED: 실제 Android/iPhone 카메라, 최초 model/WASM 다운로드, 턱선/머리카락/손 가림 마스크, 전면 미러 정렬, 10분 FPS/발열, 인물별 조명 정확도.
- Known risk: SelfieMulticlass 단일 픽셀 라벨은 손과 피부를 완벽하게 구분하지 못할 수 있음; CPU segmentForVideo 동기 호출로 프레임 드롭 가능.
- Policy: 기본 OFF, 사용자 명시 ON에만 모델 다운로드, 실패/잘못된 결과/입력 소스 전환 시 기존 안전 필터 폴백. 얼굴/마스크/사진은 서버·프리셋에 저장하지 않음.
- GitHub: 이번 릴리스에서는 저장소 변경 및 배포하지 않음.


## v0.3.0 (2026-11-04) — 자동 QA와 미검증 구분
- PASS: Node 동적 테스트 86개(이전 72개 + 새 14개); 프리셋 호환, 조명 필드 경계, temporal mask 보호/해제·모션·해상도·타임아웃 안전 테스트.
- PASS: Python 소스 통합 검사 15개, HTML ID 중복 79개 고유, 모듈 상대경로 검사, JS 구문 검사.
- PASS: ZIP 구조/무결성 및 루트 엔트리 확인.
- BLOCKED: headless Chromium localhost 접근 정책 `net::ERR_BLOCKED_BY_ADMINISTRATOR`.
- NOT TESTED: Android/iOS Live Camera/WebGL2 실제 텍스처 좌표, MediaPipe 모델 CDN/처리 시간, 10분 발열/FPS, 머리카락/손/측면 얼굴 비주얼 QA.
- LIMITATION: 얼굴 표면 라이트는 화면광+포즈에서 추정한 저강도 곡면 근사(physics / 3D face reconstruction 아님).


## v0.3.1 — 포즈 연속성·마스크 정렬·GPU 메시 업로드 최적화 (2026-11-04)
- **Pose Continuity**: 3개 이상 안정 프레임 확인 후 얼굴 변형을 서서히 복구. 급격한 회전·포즈 추정 누락 때 즉각 신뢰도 감쇠. 2D fallback은 낮은 확신도로 제한.
- **조명 신뢰도**: 포즈 신뢰도 감소 시 3D 근사 조명 신뢰도도 함께 감쇠. 실제 3D 복원·광원 위치 추적은 아님.
- **Matte Alignment**: 코뿐 아니라 양쪽 눈 중심·너비·기울기 확인. 옛 마스크가 회전한 얼굴의 잘못된 위치에 붙는 상황 억제.
- **GPU/CPU**: 메시 변형 강도가 0이고 이미 항등 UV가 업로드된 상태면 불필요한 4,161-정점 재계산/버퍼 업로드 생략. 변형 필요 시 즉시 갱신.
- **보안/개인정보**: 얼굴 데이터·사진 추가 저장 및 네트워크 전송 기능 없음. 프리셋 구조 및 사진 공유 기존 방식 유지.
- **중요**: 실제 모바일 GPU 장시간 출력·조명 화질·측면 가림·턱선 품질은 실기기 QA 필요. 자동 테스트는 이 효과를 입증하지 못함.


## v0.3.1 validated results
- Node 98 tests PASS; Python 16 files PASS; JS/MJS syntax 120 PASS.
- HTML IDs 79 unique, import dependencies 41 resolved.
- Actual mobile/WebGL2 QA blocked by Chromium environment policy.
