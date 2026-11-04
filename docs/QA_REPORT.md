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
