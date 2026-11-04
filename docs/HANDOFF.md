# maxVFX Beauty Engine — 누적 인수인계

## v0.1.1 / 2026-11-04

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


## v0.1.1 — Android 보정 화면 왜곡 수정 (2026-11-04)
- 원인: `mapEyes()`에서 화면 종횡비로 조정한 거리 벡터를 텍스처 UV 위치에 그대로 재사용해, 보정 영역 외부까지 좌표가 변형됨.
- 수정: 왜곡 계산에는 `metric` 벡터, 텍스처 UV 좌표 복원에는 원래 `d` 벡터를 사용. 눈 확대 강도가 0이면 항상 입력 UV와 동일하게 복귀.
- 영향을 받는 파일: `main.js`, `index.html`, 문서.
- QA: `node --check main.js` 통과. Android 실기기 비교 테스트는 사용자 재확인 필요.
- GitHub: https://github.com/kdc916/Beauty-Engine
- 후속 작업: 화면 비율 및 랜드마크 좌표계 통합 테스트, 모델 추적 안정화.


## v0.1.2 — 보정 화면 전역 확대 재발 방지 (2026-11-04)
- 실제 테스트 스크린샷과 같은 1122x1402 원본을 비교: 원본 좌측은 99% 이상 같은 픽셀 분포, 우측은 얼굴/머리/배경 전체 위치가 달라짐. 단순 CSS stretching 아님.
- 구 v0.1.0 `mapEyes()`가 x UV를 가로세로 비율 0.8로 스케일한 상태에서 두 눈 순차 적용 → 안면 밖에서도 .8²=.64배 샘플링, 외관상 약 1.56배 확대되는 결정적 버그.
- v0.1.1 소스에는 함수 수정이 있었으나 모바일에서 유사 증상이 계속 재현. v0.1.1 HTML만 최신이고 JS는 오래된 캐시일 가능성이 높으며 실제 캐시 상태까지 확인되지는 않음.
- 수정: main.js를 versioned asset `main.v0.1.2.js`로 교체해 URL 변경으로 캐시 강제 갱신. 셰이더는 눈 영향 반경 밖에서 무조건 원래 UV를 반환하도록 변경.
- 얼굴 슬림 워프를 하안면 부분으로 제한하여 머리카락/배경이 당겨지는 현상 억제.
- 비교선 좌표 계산에서 WebGLRenderingContext에 width/height 접근하던 버그 수정. 실제 canvas element와 contain 렌더영역으로 계산.
- 코드/실험: UV 수학 회귀 검사 PASS. Chromium/Playwright 실제 WebGL2 검증은 환경 보안 정책으로 접근 차단. 스마트폰 브라우저 실제 접속 QA 필요.
- 핵심 소스: `main.v0.1.2.js`. 다음 릴리스도 새 런타임 경로 사용하여 캐시 재발 차단.


## v0.1.3 — 샘플 자동 실행 + 실시간 동시 보정 UI (2026-11-04)
### 요구 사항
- 직전에 생성한 인물 테스트 사진을 앱에서 바로 불러오고 카메라/사용자 사진과 전환.
- 모바일에서 보정 슬라이더를 내릴 때 얼굴 프리뷰가 사라지지 않도록 개선.

### 변경
- `assets/sample-portrait.webp`: 생성했던 테스트 인물의 360×450 경량 WebP (6,752 bytes), 외부 호스팅 불필요.
- `main.v0.1.3.js`: 시작 즉시 `loadBundledSample()` → `activate()` / `showCompare(true)` / `startTracking()` 호출; 입력 소스 3종 전환 상태 및 미러/모드 처리. Canvas2D 원본/보정 비교를 실장.
- `index.html`: 상단 샘플/카메라/사진 소스 전환, 버전, 도움말 업데이트.
- `styles.css`: 모바일 `100dvh` 기반 48:52 영역 분리, 상단 프리뷰 유지와 하단 `overflow-y:auto`; 2단 가로보기 및 기존 PC 레이아웃 유지. CSS 자식 요소 stretch/height:100%가 중요.
- `tests_mobile_layout.py`: 화면 구성, 소스/에셋, versioned 자원 정적 회귀.

### 테스트 / 확인
- Node JS 구문: PASS. `tests_geometry.py`, `tests_mobile_layout.py`: PASS.
- Chromium `page.set_content`으로 390×844, 360×667, 820×390, 1280×800 CSS 프리뷰와 패널 배치 확인. 모바일에서 페이지 전체 스크롤 없고 패널만 스크롤됨.
- JS 인라인 주입으로 샘플 자동 시작, 비교 UI 표시, 슬라이더 패널 스크롤 후 프리뷰 위치 유지 확인.
- HEADLESS Chromium에서는 WebGL2 미지원으로 Canvas2D fallback 실행. 모바일 WebGL2 및 MediaPipe 모델 정상 구동은 실제 기기에서 확인 필요.
- Chromium 로컬 HTTP 네비게이션은 정책상 ERR_BLOCKED_BY_ADMINISTRATOR. `page.set_content`로 UI 런타임을 대체 검증했지만 GitHub Pages 엔드투엔드 테스트 완료로 간주하지 않음.

### 다음 작업
1. Android Chrome, Samsung Internet 기종별 실기기 QA; 특히 주소창 확장/축소 때 동적 100dvh 동작.
2. 모델 다운로드/얼굴 추적 성공 후 얼굴형·립·블러셔 영역이 샘플에서 정확히 작동하는지 확인.
3. Canvas2D fallback GPU 모드와 품질 차이 명확히 안내.
4. 멀티샘플, 고해상도 테스트 패널과 기본 피부 보정 품질 개선.

GitHub: https://github.com/kdc916/Beauty-Engine
Pages: https://kdc916.github.io/Beauty-Engine/ (외부 배포 상태는 별도 확인 필요)


## v0.1.4 — 얼굴 피부 마스크 및 정지 프레임 최적화 (2026-11-04)
**GitHub 공식 저장소:** https://github.com/kdc916/Beauty-Engine

### 구현
- JS 엔트리: `main.v0.1.4.js`, HTML: `index.html`, CSS: `styles.css`
- MediaPipe Face Landmarker 478개 정규화 좌표 중 얼굴 외곽선 36개, 양안/눈썹/입술 특징점 기반의 캔버스 마스크를 생성
- 마스크는 256px 최대변에서 작성하여 WebGL2 추가 텍스처(uSkinMask)에 업로드; 데이터는 브라우저 내 처리
- 기존 타원형 피부 마스크 교체. 피부 스무딩 이웃 샘플은 추가 마스크 가중치 적용
- 피부 영역 디버그: 보정 패널 하단 `▦ 피부 마스크 확인` 버튼으로 녹색 오버레이 토글
- 정지 이미지/샘플 프리뷰는 invalidation 때만 draw() 호출; 카메라만 지속 RAF 처리
- 사진 교체/샘플 전환 시 이전 얼굴 추적 결과를 sourceGeneration 토큰으로 무효화
- UI: 고정 프리뷰 + 독립 스크롤과 기본 샘플, 3개 프리셋, 비교 기능 유지

### QA
- `node --check main.v0.1.4.js` PASS
- `python tests_geometry.py` PASS
- `python tests_mobile_layout.py` PASS
- `python tests_skin_mask.py` PASS
- Playwright Chromium 390x844, 360x667, 1280x800: 샘플 자동 진입/마스크 버튼/슬라이더/프리뷰 고정/PAGE ERROR 없음. GPU WebGL2는 테스트 환경에서 비활성화되어 Canvas 2D 폴백으로 검증.
- 남은 항목: 실제 Android Chrome의 WebGL2 shader 컴파일, MediaPipe 실인물 검출과 마스크 시각 QA, 영상 장시간 안정성.

### 다음 패치 v0.1.5 후보
1. Android 실기기 스크린샷 기반 눈썹/헤어라인 마스크 개선 및 피부 텍스처 보존
2. 타원형 블러셔/입술 마스크를 FaceMesh 폴리곤으로 전환
3. 프레임 프로파일러 및 GPU 비용 측정, 저사양 품질 단계
4. 색감 프리셋의 피부 밝기·혈색·화이트밸런스 분리


## v0.1.5 (2026-11-04)
- 별도 makeupMaskCanvas / GPU TEXTURE2: R=입술 실루엣, G=블러셔. INNER_LIPS 내부 삭제로 입 안쪽 및 치아 컬러 오염 방지.
- Face Landmarker 478점 전체에 카메라 동작 적응형 시간 필터 적용(정적 사진은 원본 좌표 유지). 이 위치를 피부/메이크업 마스크와 미형 모두에서 사용.
- 디버그 마스크: 초록 피부, 분홍 입술, 주황 볼.
- UI/UX: 모바일 고정 프리뷰, 샘플 인물, 비교 UI 유지.
- 남은 작업: Android/iOS Safari GPU 실기기 확인, 측면 얼굴/입을 크게 벌린 표정 QA, GPU 프로파일링.

## 2026-11-04 — 로드맵 개정 (앱 버전 v0.1.5 유지)
- 사용자 요청: 사용자 사진 + 참고 인물 사진을 활용한 부위별 닮은꼴/스타일 보정, 추후 상담용 가상 외형 시각화.
- 계획 반영: v0.2.0 국소 Mesh Warp → v0.2.1 이미지 2장 분석 → v0.2.3 Reference Match 및 3면 비교 → v0.2.3 QA; v0.3.1 상담용 가상 외형 시각화 → v0.3.2 3D 근사 연구.
- 신규: `docs/ROADMAP.md`, `docs/REFERENCE_MATCH_DESIGN.md`, `docs/QA_REFERENCE_MATCH.md`, `schemas/reference-match-config.schema.json`, `examples/reference-match-preset.json`, `tests_reference_docs.py`.
- 현재 런타임 불변: `index.html` 및 `main.v0.1.5.js`, `styles.css`, 기존 모바일 프리뷰/샘플과 필터 기능을 수정하지 않음.
- 보안: 본인/참고 얼굴 이미지는 기본적으로 메모리/기기 내 처리; 얼굴 이미지·랜드마크·신원 정보는 프리셋 저장 금지.
- 의료 고지: `상담용 이미지 시뮬레이션 · 실제 수술 결과를 예측하거나 보장하지 않습니다.` 항상 표시/출력. 임상 타당성 미검증.
- QA: 스키마·문서 정합성 자동 검사 통과. Reference Match 실 기능 및 의료 예측 검증 **미구현/미수행**.
- 다음 실제 개발 패치: v0.1.6 피부·눈 밑·하이라이트 품질 개선 후 v0.2.0부터 Mesh Warp 작업.


## v0.1.6 — 피부 보정 품질 및 프리셋 복원 수정 (2026-11-04)
### 신규 기능
- 기존 8방향 단일 스케일 피부 블러를 8방향 × 2반경(1.5px/4.1px) 기반의 피부 마스크 가중 bilateral 스무딩으로 변경. 근거리 고주파 피부결은 가변 강도로 재합성.
- 피부 탭에 detail(피부결 보존), underEye(눈 밑 밝기), highlight(하이라이트 보호) 추가. 프리셋별 기본값 제공.
- 145/374번 아래 눈꺼풀 랜드마크 추가. Shader uPoints 11→13, normalizedPoints Float32Array 22→26, JS 업로드 11→13.
- 눈 밑 밝기는 피부 마스크와 하이라이트 보호 계수를 곱해 눈/입술/배경으로 번지는 현상 억제.
- highlight soft shoulder는 피부 영역에 한정, tone/skin mask 이외 픽셀은 기존 색감 유지.
- 레거시 localStorage 프리셋 복원 시 새 필드에 현재 선택한 프리셋의 기본값 사용하도록 migration.
### 유지
- GitHub Pages의 실제 실행 파일: index.html → main.v0.1.6.js (버전별 새 URL로 캐시 회피).
- 샘플 인물 자동 로딩, 모바일 고정 프리뷰/독립 하단 스크롤, 원본/보정 비교, 얼굴형/눈 Warp, 립·블러셔, 기존 저장 형식.
- Roadmap v1.1의 Reference Match/Consultation 기능은 미구현 상태 유지. 계획 문서만 존재.
### QA/주의
- node --check / 여섯 정적 회귀 검사 통과. WebGL2 GPU 렌더/실기기 품질은 이 환경에서 보안 정책으로 실행 불가.
- 새 2반경 스무딩의 GPU 샘플링 부하는 증가하여 저사양 Android에서 FPS 확인 필수.
- 다음: 실제 기기 피부 품질 확인, 피부 마스크 헤어라인·코 옆/눈 밑 오류 검증, 퍼포먼스 측정 및 Adaptive Quality.


## v0.2.0 — Face Mesh Warp 기반 패치 (2026-11-04)
### 구현
- `mesh-warp.v0.2.0.mjs`: 56×72 셀의 고정 destination 삼각형 mesh (4161 vertices, 8064 triangles), 36점 FACE_OUTLINE polygon, ROI feathering, 눈·하안면 변형, 전역 UV 변환 없음, 반전/종횡비 대응.
- `main.v0.2.0.js`: 독립 모듈 import. vertex shader 입력 aPos/aSourceUv, fragment src=vMeshUv로 변경. 기존 mapEyes와 단일 프래그먼트 전역 Warp 코드를 제거하고 gl.drawElements를 사용.
- `meshDirty`는 프리셋/미형 슬라이더/얼굴 추적/소스 변경/해상도 변경 시만 설정하고, 60fps 프레임마다 CPU 메시를 불필요하게 갱신하지 않음.
- 메시 UV가 뒤집히는 경우 변위 강도를 1/2씩 감소, 최종 실패 시 항등 매핑 처리. 얼굴 외곽에서는 변위 0.
- v0.1.6의 피부결·눈밑·하이라이트·립/볼 메이크업, 샘플 인물, 모바일 고정 프리뷰·사진 저장, JSON 설정은 변경하지 않음.
- 웹 엔트리: index.html → main.v0.2.0.js → mesh-warp.v0.2.0.mjs.
### QA
- JavaScript 구문 / Node 동적 mesh math / Python 정적 회귀 6개 PASS.
- Chromium headless의 localhost 접근이 관리자 정책으로 차단되어 GPU 실제 픽셀/모바일 테스트는 미검증. 미확인 항목을 통과로 표시하지 말 것.
### 미구현/다음 단계
- 본 패치는 v0.2.0의 Face Mesh Warp **기초**만 구현. 코·입술 정교 변형, 참조 인물 업로드/Reference Match, Consultation Visualization 미구현.
- v0.2.1: 본인/참고 이미지 각각 독립 분석, 1인 감지, 포즈/표정 차이 경고. v0.2.2: 부위별 Reference Match/3면 비교.
- 장기간 실행, 여러 얼굴, 극단 각도 및 경계 이음새는 Android/iOS 기기에서 수동 QA 필요.

### 지속 QA
- `.github/workflows/qa.yml`: main 푸시/PR마다 Node 22 JS 구문, Mesh Warp 동적 테스트, Python 3.11 회귀 6개 자동 실행하도록 설정. GitHub Actions 워크플로의 실제 첫 실행 성공 여부는 미확인.

## v0.2.1 — Reference Photo Face Analysis (2026-11-04)
### 완료
- `index.html`: 모바일 고정 프리뷰 아래 독립 스크롤 패널에 참고 얼굴 분석 `<details>` 카드 추가. 내 사진/참고 인물 사진 각각 업로드·삭제, 현재 프리뷰 캡처, 썸네일, 상태 및 8항목 결과.
- `reference-metrics.v0.2.1.mjs`: 픽셀 좌표/IPD/roll 정규화. 눈·눈 뜨임·눈썹·콧방울·입술·턱 비율 비교, 포즈/표정/작은 얼굴 경고. 2D 외형 수치로만 사용.
- `reference-panel.v0.2.1.mjs`: 별도 MediaPipe IMAGE 인스턴스(최대 3얼굴 검출), lazy 로드/CPU, 메모리 전용 사진 처리, 연속 업로드 경쟁 방지 및 ObjectURL 정리. 사진은 localStorage에 기록하지 않음.
- `main.v0.2.1.js`: reference panel 연결, 기존 메쉬 `mesh-warp.v0.2.0.mjs` 유지, Soft Portrait의 saturation 4 → 46 오타 수정.
- `styles.css`: reference 카드·결과표·모바일 UI 추가, 기존 고정 프리뷰 유지.
### 검증 / 한계
- Node 문법, 기존 메쉬 및 새 synthetic 얼굴 비율 테스트, Python 정적 QA 통과. 실제 브라우저 이동은 `ERR_BLOCKED_BY_ADMINISTRATOR`, MediaPipe 외부 모델 및 실제 Android/iOS WebGL2 QA 미완료.
- 동일인 인식, 진짜 성형 결과 예측, 사진 기반 얼굴 자동 Warp 미구현. 사진은 부위별 비율만 분석하며 다음 v0.2.2에서 매칭 변형 예정.
- MediaPipe의 외부 CDN/모델을 다운로드하고 모듈 사용 통계를 전달할 수 있으므로 개인정보 고지 검토가 필요.
### 다음 단계
- v0.2.2: reference metrics → Face Mesh 변형 제한 및 부위별 매칭, 0% 원본 보장, 3면 비교, 모바일 성능·실기기 QA.


## v0.2.2 — Reference Match (2026-11-04)
- v0.2.1 두 사진 IMAGE 분석 결과와 v0.2.0 Face Mesh Warp를 연결해 실제 GPU 국소 변형 지원.
- `reference-match.v0.2.2.mjs`: 양측 IPD·roll 정규화, 눈/코/입술/턱/눈썹 앵커별 이동량 제한, 윤곽 외 항등, 부위별 강도, 최대 변위 제한.
- `mesh-warp.v0.2.2.mjs`: 기존 Eye/Slim inverse UV에 참고 얼굴 부위별 변위를 합성, 기존 삼각형 뒤집힘 검사 및 강도 감쇠 유지.
- `reference-panel.v0.2.2.mjs`: 전체/부위 강도, 매칭 ON/OFF, 3면 비교, 사진 교체 및 분석 결과 초기화. 사진·좌표는 메모리에서만 사용. JSON 프리셋에는 저장하지 않음.
- `main.v0.2.2.js`: '내 사진'을 선택하면 같은 사진을 메인 프리뷰에 표시하고 기존 피부/메이크업 유지. 사진/샘플/카메라 전환 시 기존 매칭 소스 초기화.
- GPU WebGL2 미지원 폴백에서는 참고 얼굴 기하 변형 미지원, 안내 표시. 실제 사진 매칭과 3D 수술 후 예측은 다른 기능임.
- QA: JS 문법·Node 메시/매칭 수학 및 기존 Python 회귀 검사. Android/iOS 실기기 MediaPipe/GPU는 미검증.
- 다음 v0.2.3: 부위별 포즈/표정 QA, 3면 확대 동기화, 좌우/측면 및 GPU 성능 검증.

- 추가 수정: main/reference-panel에서 실시간 추적 준비 전에도 독립 IMAGE 분석 결과의 얼굴 외곽으로 매칭 가능, 단 WebGL2 필요.
- 추가 수정: 3면 보기 결과는 별도 전체 보정 프레임(메인 비교선과 분리).


## v0.2.3 — 턱선 깨짐 수정 및 라이브 안전화 (2026-11-04)
- 사용자 제보: 보정된 오른쪽 턱선이 깨져 보이는 artifact 발생. 라이브 사용 불가 수준.
- 원인 판단: Reference Match 변형이 face oval 경계에 너무 가까이 적용되며, jaw 부위가 외곽선을 직접 당겨 배경과의 경계가 찢어져 보임.
- 수정: reference-match.v0.2.3.mjs에서 외곽 feather 확대, contourSafety(border^2), interiorSafety(중심부 우선), jaw 하단 감쇠, 기본 global/jaw 강도 및 maxDisplacementIPD 축소.
- mesh-warp.v0.2.3.mjs에서 reference delta를 0.92 배로 완화.
- 기대 효과: 턱선/볼 윤곽 보정은 유지하되, 턱 아래/볼 바깥 경계 파손 방지. 라이브 안정성 우선.
- 남은 과제: 실제 Android/iOS 라이브 카메라에서 장시간 테스트, 다양한 헤어스타일/측면 포즈 검증.


## v0.2.4 — LIVE SAFE / 턱선 깨짐 우선 차단 (2026-11-04)
### 문제와 원인
- 사용자 스크린샷: 원본/보정 수직 비교의 오른쪽 턱 옆에 깨진 듯한 패치/경계 불연속이 나타남.
- v0.2.3 ZIP은 GitHub에 커밋되지 않아 Pages는 v0.2.2를 표시하고 있었음.
- 기존 수정은 참고 인물 매칭 윤곽에만 집중. 기본 face slim도 외곽에 가우시안 변위가 걸려 턱/목 경계 찢김을 만들 수 있었음.
### 변경
- mesh-warp.v0.2.4.mjs: 기본 jaw warp를 얼굴 내부 볼 부위로 국한, 경계 feather 4차 감쇠; 얼굴 외곽 누락 시 항등 변형.
- checkWarpStretch: 모든 격자 이웃의 UV edge scaling을 0.80~1.20 범위로 검사. 미달/초과 또는 삼각형 뒤집힘 발생 시 전체 변위를 단계적으로 낮추고 최후 identity fallback.
- mesh.baseUV/mesh.deltaUV TypedArray 재사용으로 매 프레임 새 버퍼 할당 감소.
- live-safety.v0.2.4.mjs: 478-point 랜드마크 유효성, 얼굴 크기, 급격한 모션/크기 변화, EMA 안정화. 정상 2프레임 전에는 얼굴 변형 중지.
- main.v0.2.4.js: 카메라 모드에서 기본 턱 변형 비활성화, 눈 보정 상한 0.18; 정상 추적이 끊기면 피부 마스크/메시를 무효화하고 자동 원본 복구. 사진 모드는 안전한 메시 얼굴형 변형을 계속 지원.
- reference-match.v0.2.4.mjs: v0.2.3 경계 감쇠 통합, 윤곽 보존.
- reference-panel.v0.2.4.mjs: 안전 강도 기본값 35%, 턱 25%, 변위 한도 6% IPD.
- index.html: Live Safe 배지와 버전별 정적 에셋 무효화. 모바일 프리뷰 고정 유지.
### 완료 및 남은 QA
- PASS: Node 16개 테스트(랜드마크 급변·유실, 4:5/1:1/16:9, 좌우 반전, background identity, UV stretch/foldover).
- PASS: 정적 회귀 9개, JS 구문, ZIP 무결성.
- 미검증: Android/Samsung Internet/iOS Safari에서 5~10분 카메라, GPU 실제 렌더, 원본/보정 턱선 비교, 온도와 FPS.
- 프로덕션 수준에서 '절대 깨지지 않음'을 아직 보장할 수 없음; 라이브는 안전 우선으로 일부 형태 변형을 중단.
### 향후 v0.2.5
- 실제 디바이스 동영상 QA 이후 Live Safe 자동 복원 경계/시각적 전환 점진적 개선, 3면 UI, A/B 레퍼런스, 성능 측정.


## v0.2.5 — Adaptive Live Performance & Long-session Guard (2026-11-04)
### 작업 정책
- 사용자 요청에 따라 **이번 버전부터 GitHub에 직접 커밋하지 않는다.** ZIP의 최상위 `index.html`부터 저장소 루트로 사용자가 업로드한다.
- 원본 기준: v0.2.4 전체 패키지. v0.2.5 코드는 별도 신규 엔트리 파일이며 이전 버전 코드는 회귀/롤백용으로 패키지에 보존한다.
### 주요 변경
1. `live-performance.v0.2.5.mjs` (NEW): Auto/Quality/Balanced/Performance/Battery 모드. 자동 모드는 균형(768px·30fps), 지속적인 처리 지연 시 단계적으로 640px/24fps, 512px/20fps로 강등. 3.6초 이상 샘플 구간, 연속 악화 2회/호전 3회, 6.5초 이상 tier 쿨다운. 안정 복귀는 균형 단계까지만 수행.
2. `main.v0.2.5.js` (NEW): 라이브 렌더링 간격/얼굴 감지 주기/피부 마스크 갱신 주기 제한. 추적 처리 비용을 관측하고 성능 프로파일 업데이트.
3. `uploadSourceTexture()` 새 함수: 고정 크기의 HTMLVideoElement는 `texImage2D` 초기 1회 + 이후 `texSubImage2D`. 같은 정지 사진은 렌더 반복 시 재업로드하지 않음.
4. `uploadMaskTexture()` 재작업: 피부/메이크업 Canvas 동일 크기 재업로드에 `texSubImage2D` 사용, 크기 변경에만 `texImage2D`; blank 1px 데이터 재사용.
5. 카메라 권한 승인 지연 중 사진 전환/샘플 전환 시 generation 확인으로 늦은 getUserMedia 결과 폐기. 탭 숨김/복귀 시 시간 필터 리셋 및 라이브 메시 항등 복구.
6. WebGL contextlost 시 Canvas2D 폴백을 표시하고, contextrestored 시 shader/VBO/IBO/텍스처 초기화 및 사진 마스크를 다시 생성.
7. index/styles: 품질 선택 UI를 스크롤 가능 보정 패널 안에 추가. 샘플 인물·기존 상단 고정 프리뷰 유지.
8. `.github/workflows/qa.yml`: 신규 v0.2.5 JS 모듈 및 전체 Node/Python 테스트를 검사하도록 갱신(업로드 후 GitHub Actions 사용).
### 유지/호환
- `live-safety.v0.2.5.mjs`, `mesh-warp.v0.2.5.mjs`, `reference-match.v0.2.5.mjs`, `reference-panel.v0.2.5.mjs`는 v0.2.4의 안전한 동작 로직을 유지하면서 import/버전만 갱신.
- LocalStorage `maxvfx.beauty.v0.1.preferences` 재사용 + `liveQuality` 옵션만 추가해 이전 사용자 프리셋 복원 호환.
- Reference Match/3면/Live Safe 턱선 보호 및 모바일 상단 프리뷰 유지. 실제 성형 수술 결과 예측 모드는 미구현.
### 테스트 결과
- Node 동적 테스트 22개 PASS (기존 16 + 신규 live-performance 6).
- Python 정적 회귀 테스트 10개 PASS.
- 필수 JS/mjs 구문 검사 PASS, HTML id/모듈 import/파일 구조 점검 및 ZIP 무결성 검사.
- Chromium local server 접근 `ERR_BLOCKED_BY_ADMINISTRATOR` → 화면 실측/MediaPipe GPU/Android/iOS/발열/배터리 미검증. 실제 10분 라이브 검증 필요.
### 이어받기 / 다음 단계
- v0.2.5의 자동 설정은 실측값 기반 정책이지만 기기별 FPS 개선/발열 절감 정도를 확인한 것은 아님. 갤럭시/샤오미/아이폰에서 실기기 5–10분 QA 후 경계값 조정.
- 다음 v0.2.6: 실제 기기 성능 로그 수집(개인정보 없는 프레임 지연/계측), 카메라 장시간 품질·발열, 위험 시 원본 복귀 페이드 연출, A/B 레퍼런스 UI를 검토.
