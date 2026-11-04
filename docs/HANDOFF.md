# maxVFX Beauty Engine — 누적 인수인계

## v0.1.0 / 2026-11-04

### 목표
PC와 모바일 브라우저의 카메라에서 화사한 중국식 뷰티 필터 MVP 검증. GitHub Pages 업로드를 위한 정적 HTML/JS 프로젝트 제공.

### 변경/완료
- 새 UI: 카메라 실시간 화면, 필터 프리셋, 탭/슬라이더, 모바일 대응
- 카메라/이미지 WebGL2 렌더링 + Canvas 2D 기본 폴백
- Face Landmarker 지연 로딩, GPU 우선/CPU 폴백
- 원본/보정 비교, 사진 PNG 저장, 카메라 전환, 설정 저장/가져오기/내보내기
- 신규 GLSL 셰이더의 피부 영역 보정, 화사함, 눈/얼굴 윤곽 워프, 립/블러셔

### 미완료/기술 부채
- 실제 스마트폰 카메라, 특히 iOS Safari 카메라 권한 및 성능 QA 필요
- 단순 얼굴 타원 마스크: 헤어라인/턱 주변 오염 가능
- 얼굴 Warp는 근사 버전: 배경 왜곡/측면 얼굴 및 프레임 경계 처리 보강 필요
- 이미지 색상관리는 sRGB 가정, 디바이스별 카메라 색감 보정 미구현
- 얼굴 탐지 동기 메서드 탑재로 저사양 기기 프레임 드롭 가능 (Worker 검토)
- 사진 저장 시 데이터 자체의 EXIF/원본 메타정보 보존하지 않음
- CDN 실패 시 얼굴 보정 기능 일부 비활성화
- WebGL1 미지원, WebGL2 실패 시 Canvas 단순 밝기/채도 폴백
- 얼굴 모델 재로드/카메라 전환 시 오래된 결과 사용 방지를 위한 개선 필요

### 권장 다음 패치 v0.2.0
1. 사용자 제공 실제 모바일 테스트 스크린샷 및 콘솔 이슈 우선 수정
2. 셰이더 UV 좌표/미러/스냅샷 정확성 QA 자동화
3. 얼굴 추적 워커화 또는 추적 업데이트 스케줄러 최적화
4. 얼굴 마스크 세분화(피부, 입술, 눈, 헤어) 및 자연스러운 경계
5. 피부 원본 디테일 보존 강화, 비네팅 및 편향 색상 개선

### 작업 이어받기
- 진입 파일: `index.html`
- UI 스타일: `styles.css`
- JS 상태/비디오/GL/MediaPipe: `main.js`
- 렌더: `draw()`, 셰이더 소스 `FRAG`
- MediaPipe: `startTracking()`, `updateFace()`
- 프리셋: `PRESETS`, `FIELDS`
- GitHub 저장소 주소는 사용자가 업로드 후 전달 예정. 전달받은 주소를 공식 패치 원본으로 사용.


## v0.1.1 — 모바일 보정 화면 왜곡 수정 (2026-11-04)
- 원인: mapEyes()가 화면 비율로 보정한 거리 벡터를 텍스처 UV 위치 계산에 재사용해 얼굴 및 배경이 늘어남.
- 수정: 거리 계산용 metric 벡터와 원본 UV 변위 d를 분리. 보정 범위 밖에서는 원본 UV 유지.
- 변경 파일: main.js, index.html.
- 확인: JavaScript 구문 검사 통과. 실제 Android 모바일 화면 재검증 필요.


## v0.1.2 — 보정 화면 전역 확대 재발 방지 (2026-11-04)
- 사용자 1122×1402 테스트 이미지의 스크린샷 특징점을 원본 이미지와 대조. 보정 영역의 상단 머리카락 특징점 x 간격은 원본 대비 약 1.56배.
- 이전 셰이더는 두 눈 처리에서 UV 가로좌표에 aspect ratio 약 0.8을 각 1회씩 적용하는 오류. 이 때문에 얼굴 밖 전체가 약 1/(0.8²) = 1.56배 가로 확대됨.
- v0.1.1 소스에는 수정이 존재하지만 모바일 스크린샷은 예전 결과를 보임. 이전 main.js 브라우저 캐시가 남았을 가능성이 높음(실제 캐시 파일 확인 불가).
- src=main.v0.1.2.js로 자산 URL 변경. 이전 파일 캐시를 확실히 회피.
- mapEyes()는 반경 밖/강도 0에서 원본 UV를 그대로 반환하며, 화면 비율은 영향 반경 계산에만 사용.
- 얼굴 슬림 워프는 하안면에만 제한하여 머리카락/배경이 휘는 현상 억제.
- 비교선은 canvas 표시 영역을 기준으로 산정. WebGLRenderingContext를 canvas로 잘못 참조하던 버그 수정.
- QA: Node 구문 검사, 4:5/1:1/16:9 UV 수학 회귀 테스트 통과. Chromium/Playwright 실제 브라우저 접근은 보안 정책(ERR_BLOCKED_BY_ADMINISTRATOR)으로 차단. 모바일 실기기 QA 필요.
- 다음 단계: 모바일에서 v0.1.2 버전 확인 후 동일 이미지로 머리카락/눈 비교. 오류 재현 시 새 스크린샷 기준 조사.


## v0.1.3 — 샘플 테스트 및 동시 보정 UI (2026-11-04)
- 생성된 이전 샘플 인물 사진을 360×450 WebP로 최적화하여 `assets/sample-portrait.webp`에 번들링. Git blob SHA: `30e063c5c138d31c534a00a3febc3bcc84b03d84`.
- `main.v0.1.3.js`: `loadBundledSample()` 자동 실행, 시작 시 비교 모드 ON, 입력 소스 3종 전환 및 미러 상태 반영. Canvas2D fallback 비교 추가.
- `index.html`: 샘플/카메라/사진 버튼, v0.1.3 CSS/JS 경로와 사용 안내 수정.
- `styles.css`: 모바일 100dvh 48:52 2행 구성, 상단 프리뷰 고정 및 하단 overflow-y:auto. grid align-items:stretch, 자식 height:100% 필수. 가로 방향 2열 배치.
- QA: Node 구문, 정적 테스트, Chromium set_content 390×844 / 360×667 / 820×390 / 1280×800 레이아웃 성공. 브라우저 JS 주입에서 SAMPLE PHOTO 시작, 비교 ON, 스크롤 중 프리뷰 고정 확인.
- 제한: 헤드리스 WebGL2 미지원, 미디어파이프 CDN 모델/실기기 카메라 검증 미완료. 네트워크 경유 실제 페이지 접속은 정책 차단.
- 다음: 실제 Android Chrome에서 얼굴 탐지 상태, 프리셋 적용, 가로보기, 카메라 권한 및 키보드/주소창 높이 변경 테스트.
- 공식 저장소: https://github.com/kdc916/Beauty-Engine


## v0.1.4 — 피부 마스크 정확도 및 사진 렌더링 최적화 (2026-11-04)
- GitHub: https://github.com/kdc916/Beauty-Engine
- 주요 코드: `main.v0.1.4.js`; 기존 v0.1.3 실행 파일은 유지하되 index.html에서는 새 캐시 버전으로 연결.
- 얼굴 윤곽 36개, 눈·눈썹·입술 랜드마크로 피부 mask Canvas 생성 (최대변 256px).
- WebGL2 uSkinMask 텍스처에서 참조; 블러 이웃 픽셀에도 피부 가중치를 곱해 경계 번짐 감소.
- 보정 패널 하단 '피부 마스크 확인' 버튼에서 녹색 오버레이 진단 가능(WebGL2 전용).
- 샘플/사진은 파라미터 변경·비교 조작·얼굴 분석 갱신 시에만 재렌더.
- 소스 전환 중 이전 MediaPipe 분석이 늦게 반환되면 sourceGeneration 검사를 통해 결과 폐기.
- 유지: 3가지 프리셋, 샘플 인물, 모바일 고정 프리뷰 및 독립 스크롤, 사진/카메라 전환.
- QA: JS 구문 및 정적 회귀 PASS; Chromium 390×844, 360×667, 1280×800의 Canvas 2D fallback에서 프리뷰 고정·슬라이더·마스크 버튼 기능 PASS.
- 미검증: 실제 GPU WebGL2 셰이더 구동, MediaPipe 모델 실사용, Android Chrome/iOS Safari 실기기.
- 다음 v0.1.5: 헤어라인 마스크 QA, 립/블러셔 메시 정밀화, FPS/GPU 프로파일러.


## v0.1.5 (2026-11-04)
- 별도 makeupMaskCanvas / GPU TEXTURE2: R=입술 실루엣, G=블러셔. INNER_LIPS 내부 삭제로 입 안쪽 및 치아 컬러 오염 방지.
- Face Landmarker 478점 전체에 카메라 동작 적응형 시간 필터 적용(정적 사진은 원본 좌표 유지). 이 위치를 피부/메이크업 마스크와 미형 모두에서 사용.
- 디버그 마스크: 초록 피부, 분홍 입술, 주황 볼.
- UI/UX: 모바일 고정 프리뷰, 샘플 인물, 비교 UI 유지.
- 남은 작업: Android/iOS Safari GPU 실기기 확인, 측면 얼굴/입을 크게 벌린 표정 QA, GPU 프로파일링.


## 2026-11-04 — 로드맵 v1.1 개정 (앱 v0.1.5 유지)
- 사용자 요청: 내 얼굴 사진 + 원하는 인물 참고 사진 분석 → 부분적인 얼굴 스타일 매칭; 이후 상담용 가상 시각화.
- 새 계획: v0.2.0 Mesh Warp 코어, v0.2.1 2장 분석, v0.2.2 Reference Match/3면 비교, v0.2.3 QA, v0.3.1 상담용 시각화, v0.3.2 3D 근사 연구.
- 신규 문서: docs/ROADMAP.md, docs/REFERENCE_MATCH_DESIGN.md, docs/QA_REFERENCE_MATCH.md, schemas/reference-match-config.schema.json, examples/reference-match-preset.json, tests_reference_docs.py.
- 프리셋에는 이미지/랜드마크/신원 정보 저장 금지. 상담 결과는 '실제 수술 결과를 예측하거나 보장하지 않습니다' 고지.
- **실행 코드(index.html, main.v0.1.5.js, styles.css) 변경 없음.** Reference Match 및 Surgery Preview는 아직 미구현.
- 검증: JSON/문서 구조 테스트, GitHub 파일 반영 확인. 실제 얼굴 매칭/상담 시뮬레이션 QA는 향후 수행.
- 다음 실제 앱 패치: v0.1.6 피부결·눈 밑·하이라이트 보정 안정화 후 v0.2.0 메시 Warp 작업.
