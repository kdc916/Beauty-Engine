# v0.1.0 QA Report

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


## v0.1.2 — 전역 가로 확대 회귀
- PASS: JavaScript `node --check main.v0.1.2.js`
- PASS: old-UV double aspect-scale 분석. 4:5 사진의 두 단계 샘플링이 0.8²를 만들어 화면을 약 1.56배 가로 확대.
- PASS: 새 warp 반경 밖의 샘플 좌표 불변성 / 4:5, 1:1, 16:9 수학 회귀 검사.
- BLOCKED: Playwright의 로컬 WebGL 브라우저 실행은 ERR_BLOCKED_BY_ADMINISTRATOR 정책 차단으로 검증 불가.
- NEEDS DEVICE QA: 실제 모바일에서 v0.1.2가 표시되는지 및 동일 사진의 전후 보정 비교선 정렬 확인.


## v0.1.3 — 샘플과 화면 분할
- PASS: `node --check main.v0.1.3.js`, `python tests_geometry.py`, `python tests_mobile_layout.py`.
- PASS: Chromium `page.set_content` CSS 레이아웃 390×844, 360×667, 820×390, 1280×800. 390×844에서는 프리뷰 top=84px/bottom=411px, 컨트롤 top=438px/bottom=837px, 컨트롤 독립 스크롤, 페이지 전체 넘침 없음.
- PASS: Chromium inline JS에서 샘플 자동 로딩, compare=true, 컨트롤 스크롤 중 프리뷰 위치 유지. WebGL2 미지원으로 Canvas2D fallback 실행.
- PASS: 저장소 내장 이미지 WebP blob SHA `30e063c5c138d31c534a00a3febc3bcc84b03d84`.
- BLOCKED: 외부/localhost 실제 페이지 네비게이션은 이 환경에서 ERR_BLOCKED_BY_ADMINISTRATOR.
- NEEDS DEVICE QA: Android/iOS의 WebGL2 뷰티 셰이더, MediaPipe 다운로드·얼굴 탐지, 카메라 입력 및 장시간 성능.


## v0.1.4 QA (2026-11-04)
- PASS: `node --check main.v0.1.4.js`
- PASS: `python tests_geometry.py`, `python tests_mobile_layout.py`, `python tests_skin_mask.py`
- PASS: Chromium Playwright UI smoke tests at 390x844, 360x667, 1280x800, deterministic face mock; zero JS page errors
- PASS: Sample portrait auto-load, comparison split, slider update, independent mobile control scroll, mask QA button toggle
- LIMIT: Runner exposes neither WebGL1 nor WebGL2; only Canvas2D fallback path was exercised, not GPU shader compilation or masking.
- LIMIT: Live MediaPipe CDN/model load & actual mobile camera performance remain unverified.
- NEXT: Verify face mask with real Android Chrome and iOS Safari, including face turning and hairline.


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


## v0.2.1 Reference Analysis QA
- PASS: 2D 얼굴 좌표 수학 테스트(해상도/회전/입력 오류/동일 얼굴/경고), Python 정적 회귀와 Mesh Warp 테스트.
- BLOCKED: Chromium localhost 브라우저 접근 ERR_BLOCKED_BY_ADMINISTRATOR로 실제 브라우저·GPU 확인 불가.
- 실기기 TODO: Android/iOS 파일 업로드·촬영·face detector/CDN·0인/다인/교체·메모리 10분.


## v0.2.2 — Reference Match QA
- PASS: Node 신규 Reference Match 순수 수학 검증(비활성/0% 항등, 동일 얼굴 원본, 5부위 국소 변화, 배경 보호, IPD 최대 변위, 독립 부위, 4:5/1:1/16:9/미러 foldover, 잘못된 얼굴 입력).
- PASS: 기존 Mesh Warp 및 Reference Metrics Node 테스트, Python 정적 회귀 검사.
- FIX: GPU mesh foldover fallback에서 source UV가 정점 위치를 덮어쓰던 기존 인덱싱 오류 수정.
- PASS: JS 구문 검사 및 새 UI/모듈 참조/버전 확인.
- BLOCKED: Chromium localhost 접근이 ERR_BLOCKED_BY_ADMINISTRATOR로 차단되어 실제 GPU 셰이더·MediaPipe·모바일 UI 시각 QA 미실시.
- DEVICE QA: Android Chrome, Samsung Internet, iOS Safari에서 두 이미지 독립 얼굴 분석 후 부위별 매칭, 원본 비교선, 3면 보기, 사진 교체·삭제, 5분 이상 카메라, 모델 실패 메시지 확인.
- 의료 한계: 결과는 2D 이미지 시각화이며 실제 성형 결과를 예측하거나 보장하지 않음.
