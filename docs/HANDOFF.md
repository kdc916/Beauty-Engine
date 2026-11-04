# maxVFX Beauty Engine — 누적 인수인계

## v0.3.0 — 포즈 기반 3D 음영 근사 / Temporal Occlusion Matte (2026-11-04)
### 적용 범위
1. `main.v0.3.0.js`: 신규 GPU uniform `uLightField`/`uRelight3D`, 피부 전용 약한 타원체 음영, 얼굴 회전 신뢰도 연동 및 relight3D 사용자 설정/저장/복구.
2. `face-light-field.v0.3.0.mjs`: 환경 밝기·화면 좌우 방향과 MediaPipe 포즈로 보수적인 광향/강도/신뢰도 예측, 250ms 시간 필터와 순간 변화 제한.
3. `semantic-temporal.v0.3.0.mjs`: 분할 마스크의 가림 보호 진입/해제 속도 분리, 경계 1px 여유, 얼굴 이동·해상도 변경·모드 전환·재초기화 시 이전 마스크 폐기.
4. `semantic-occlusion-runtime.v0.3.0.mjs`: 기존 선택형 모델 추론 결과를 temporal 필터로 처리, 최신 코 좌표 기록 및 비정상 결과의 stale matte 폐기.
5. `main.v0.3.0.js`: 분할 모델과 얼굴 추적 간 코 좌표 차가 0.026(normalized 좌표) 이상일 때 오래된 보호 마스크 합성을 정지.
6. `look-presets.v0.3.0.mjs`: 선택형 `lighting.relight3D` 프리셋 저장·공유. 기존 룩 파일은 기본 OFF로 복원.
7. `index.html`, `styles.css`: 하단 조명 패널 옵션, 고정 모바일 프리뷰 레이아웃 유지.

### QA
- Node 86 동적 테스트 PASS (기존 72 + 신규 14); Python 15개 PASS. JS 구문 및 HTML/모듈 ID 검사 PASS.
- headless Chromium은 `net::ERR_BLOCKED_BY_ADMINISTRATOR`로 localhost 페이지 접근 불가. **GPU 렌더 출력, 실제 조명 색감, Android/iOS 세그멘테이션 품질·FPS·발열은 미검증.**
- 자동 QA는 코드 무결성과 수학 동작만 검증. 사용자 제공 실기기 캡처와 기기별 FPS 측정 필수.

### 알려진 한계
- Face mesh는 2D 변형이며 개인별 3D 얼굴 형상 복원이나 물리광 트래킹이 아님.
- 손이나 머리카락을 별도 물체로 추적하지 않고 의미론적 모델 클래스 기반. 완전한 얼굴 가림을 추적하지 않음.
- **안전상 라이브 턱선 변형은 비활성화된 상태.** 실제 기기 GPU 아티팩트 검증 이후 제한적으로 재검토.
- 새 조명 모드 기본 OFF. 이전 My Look과 레거시 저장 데이터에서 자동으로 켜지지 않음.

### 다음 작업 (v0.3.1)
- 실제 Android/iOS GPU 스크린샷·FPS 프로파일링 기반 셰이더 최적화, Face Mesh 시각 QA, 측면 얼굴 occlusion alignment.
- 필요한 경우 optical flow / pixel motion compensation 검토 및 얼굴 피부 범위 라이트 히스토그램 고도화.

---

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

## v0.2.7 — 얼굴 3D 포즈·조명 연동 기반 (2026-11-04)

### 사용자 요청·제품 목표
- 고개 회전/부분 가림에서도 안정적인 얼굴 보정, 주변 광원에 따른 자연스러운 피부 조명, 게임 캐릭터 같은 룩 커스터마이징, 프리셋 저장·공유.
- 이번 단계는 **3D 얼굴 방향 추정 + 환경 조명 연동 BETA**이며 추후 광원/표면/오클루전 고도화의 기반이다.

### 변경 파일
- 신규 `face-pose.v0.2.7.mjs`: MediaPipe `Matrix{rows:4,columns:4,data[16]}` 행렬 검증 및 yaw/pitch/roll 추정, 대체 2D 랜드마크 추정, EMA 스무딩, 급격한 회전 거부, 포즈 신뢰도 감소, 전원 OFF 시 영(0) uniform.
- `main.v0.2.7.js`: `outputFacialTransformationMatrixes` GPU→CPU+행렬 미지원 폴백, 추적 결과 포즈 상태 업데이트, Live Safe와 결합, 포즈 연동 셰이더 `uFacePose`·`uPoseAwareLight` 연결, 상태 정보 및 사용자 설정 저장/복원.
- `look-presets.v0.2.7.mjs`: `lighting.poseAware` 속성 추가(기존 프리셋 기본 true로 마이그레이션), 사진/랜드마크는 저장하지 않음.
- `index.html`, `styles.css`: 얼굴 방향 상태·포즈 연동 조명 스위치. 기존 모바일 고정 프리뷰 유지.
- `tests/face-pose.test.mjs`, `tests_v027_integration.py`: 매트릭스·폴백·회전·신뢰도·손실 후 리셋·프리셋 JSON 호환성 자동 검증.
- `.github/workflows/qa.yml`: 사용자가 직접 GitHub에 업로드한 뒤 v0.2.7 테스트가 돌도록 수정(이번 작업 중 실제 워크플로는 실행하지 않음).

### 알고리즘 및 보호 장치
1. 1인 Face Landmarker 3D 변환행렬 16개 원소(가능한 기기) 입력.
2. 행렬의 기저 벡터 길이·직교성·정면 성분 검사 후 yaw/pitch/roll 도출. 미지원/이상치면 2D 랜드마크 프록시 사용(낮은 confidence).
3. 프레임 간 유효 시간 필터, 36° 초과 급변 거부, 오래된 상태 즉시 무효화.
4. 조명 보정은 기존 저해상도 카메라 좌우 밝기 추정과 얼굴 방향을 결합해 피부 마스크 내부에서만 **약 ±5% 이내**로 조절하고 밝은 영역을 보호.
5. 회전 시 스무딩/얼굴 효과 신뢰도를 줄이되, 부분 가림을 완전한 3D 복원이라고 주장하지 않음. Live Safe 약 130ms 유지/안전한 원본 복귀는 종전과 동일.
6. 사용자 설정 My Look JSON의 조명 스위치만 저장/공유. 실제 사람 얼굴/이미지, 생체 좌표는 저장되지 않음.

### QA
- Node 동적 테스트: 44 PASS (포즈 9개 추가), Python 정적 회귀: 12 PASS.
- JS 구문/HTML ID/모듈 경로, ZIP 중복/CRC 검증 별도.
- 실제 WebGL2/MediaPipe 앱 렌더링 및 Android/iOS 카메라 QA는 불가(Chromium `ERR_BLOCKED_BY_ADMINISTRATOR`).
- **릴리스 한계:** 실제 3D 광원 추적/렌더링, 완전한 회전/가림 상태 추적, 프리셋만으로 특정 인물 얼굴 형상 재현은 구현되지 않음.

### 다음 개발 v0.2.8 우선순위
1. 실기기 측정 기반 yaw/pitch/roll 좌표축 캘리브레이션, 미러/세로 비율/측면 QA.
2. 부분 가림 검출 분할 마스크 및 머리카락/손/안경 보호, 라이브 잔상 방지.
3. 얼굴 구간별 노멀/조명 추정 정확도 향상 및 temporal flicker 방지, 발열 테스트.
4. 개인별 얼굴 Shape Profile 저장은 개인정보/프라이버시 보호 설계와 3D 메시 QA 확정 후 진행.

### 참고 문서
- MediaPipe Face Landmarker Web: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
- Face Geometry: https://developers.googleblog.com/mediapipe-3d-face-transform/
- 상세: `docs/POSE_LIGHTING_V027.md`, `docs/QA_RUN_V027.txt`


## v0.2.8 — 부분 가림 이상값 보호 + 시간 기반 복귀 + 조명 안정화 (2026-11-04)

### 사용자 요구/범위
- 고개 회전, 손·머리카락 일부 가림, 순간 추적 오류에서 라이브 메시/피부/조명 점프를 억제. 기존 룩 저장·공유와 모바일 프리뷰 유지.
- 이 버전은 **부분 가림 segmentation이나 가려진 얼굴의 정확한 복원 기술이 아님**. 랜드마크 입력 이상값과 포즈 안전 장치를 추가함.

### 신규 파일/수정
- `occlusion-guard.v0.2.8.mjs`: 9개 얼굴 핵심 앵커 이동 중앙값, 478점 좌표 유효성 검사, 일부 이상점에 한해 과거 검증 좌표+평행이동으로 짧게 수리. 여러 핵심점이 동시 불안정/240ms 초과하면 수리 중단. `poseSafetyMultiplier`로 큰 yaw/pitch 변형 약화.
- `live-transition.v0.2.8.mjs`: FPS 독립의 exponential attack/release. 170ms attack/115ms release, 최대 310ms 지난 얼굴 메시는 폐기.
- `ambient-light.v0.2.8.mjs`: 밝기·그림자·색온도·좌우광 추정값 변화 제한으로 순간 화이트밸런스/노출 깜빡임 억제.
- `main.v0.2.8.js`: 기존 VIDEO 추적 뒤 Occlusion Guard → Live Face Filter → Face Pose 순서 연결. 마스크 및 Warp에는 검증된 좌표만 전달. `uFaceQuality`·라이브 눈 Warp·`uPoseAwareLight`와 품질 fade 연결. 추적 안전 상태 텍스트.
- `index.html`은 v0.2.8 모듈을 가리키도록 변경; v0.2.7와 다른 캐시 URL.
- `face-pose`, `mesh-warp`, `reference-match`, `reference-panel`, `live-performance`, `live-safety`, `look-presets` 모듈은 같은 동작을 유지하면서 실행 버전 경로만 분리.
- `.github/workflows/qa.yml`, `tests_*.py`가 v0.2.8을 검사하도록 수정. Node 테스트 파일 3개 추가.

### 안전 정책 및 잔여 리스크
- 위·아래/측면 대각도에서 식별 불확실성이 커지면 Warp 강도가 줄어든다. 실제 얼굴 전체 가림 시 지속 추적은 불가능하며 원본 복귀가 설계상 올바른 동작.
- MediaPipe 자체가 부정확한 좌표를 '일관되게' 여러 프레임 내보내는 경우 통계적 필터만으로 검출 불가. 실제 픽셀 손/머리 segmentation, 3D 얼굴 보간과 confidence 기반 occlusion은 후속 과제.
- 라이브 턱 변형은 안전을 위해 여전히 비활성; 완전한 게임 캐릭터식 변형 유지 불가. 프리셋은 얼굴 구조/개인사진이 아닌 효과 파라미터만 포함.
- 로컬 Node 및 Python 회귀 검사 통과. 실제 모바일 WebGL2·MediaPipe·발열·장시간 오클루전/측면 결과는 미검증.

### 다음 작업
1. 실기기 영상 QA 기록: 0°/30°/45°/60° 회전, 손으로 한쪽 눈 가림, 입/코 부분 가림, 안경/머리카락, 완전 가림 후 재진입.
2. 추적 품질·FPS 로그(이미지/좌표 제외)를 수집해 보정 수치 튜닝; Android/iOS 기종별 비교.
3. 실제 픽셀 기반 손·머리카락 segmentation, 3D Face Mesh/Optical Flow 및 occlusion-aware blending 탐색.
4. Reference Match의 위치/표정 일관성, 피부 마스크 경계 및 카메라 실시간 턱선 Warp(현재 비활성)를 별도 기기 QA 후 재검토.
5. 기존 사용자 정책: **GitHub에 직접 커밋하지 말고, 전체 ZIP + 누적 HANDOFF MD만 전달.**


## v0.2.9 — 의미론적 가림 마스크 및 원본 픽셀 보호 (2026-11-04)

### 신규
- `semantic-occlusion.v0.2.9.mjs`: 6개 category index 처리, 원본 보호 마스크, 검증/연결 규격, 생성 번호 교체와 영상 950ms 유효기간.
- `semantic-occlusion-runtime.v0.2.9.mjs`: MediaPipe ImageSegmenter 선택적 CPU delegate, 사진/비디오 모드 전환, 420~820ms rate limit, 잘못된 결과 폐기, WASM 마스크 메모리 해제, 실제 추론 비용 추적.
- `main.v0.2.9.js`: WebGL2 TEXTURE3 입력, `uSemanticMask`/`uSemanticEnabled`, 수정되지 않은 출력 픽셀(`p`) 기준으로 보호 영역을 원본 영상과 합성; 모델 실패 시 기존 Live Safe / 2D 폴백.
- `index.html`/`styles.css`: 가림 AI 보호 ON/OFF와 처리 상태; 기본값 OFF, 모바일 상단 프리뷰/하단 스크롤 유지.

### 데이터·라이브사이클
- 카메라/사진 소스 전환 시 이전 분할 결과 무효화, 모델이 비정상이거나 신뢰할 수 없는 출력을 내면 즉시 비활성 프레임 처리.
- 사진·얼굴 좌표·분할 RGB 데이터는 저장하지 않음. 모델·WASM만 외부 CDN/Google에서 가져오며 별도의 이미지 업로드 경로를 구현하지 않음.
- 룩 프리셋/내보낸 JSON에는 새 마스크 데이터가 없고, 가림 보호 ON/OFF는 **해당 장치** 일반 설정으로만 유지.

### 안정성·기술 부채
- 세그먼터 `segment()`/`segmentForVideo()`는 현재 UI 스레드에서 동기 실행하는 방식이므로 모바일 GPU/CPU 부하가 증가할 수 있음. 420–820ms 간격 제한/자동 화질 감속 지원. Web Worker+OffscreenCanvas 이동은 후속 연구.
- iOS Safari GPU delegate의 분할 레이블 혼동 보고를 고려해 CPU delegate 사용. 실제 Safari CPU 동작은 반드시 현장 검증.
- 머리카락/손을 직접 픽셀별 확실하게 판별하지 못함(6-class의 body-skin/others 근사). 깊은 각도 회전·완전 가림에도 추적이 계속된다고 주장하면 안 됨.
- 가림 마스크는 필터 합성 보호용이며 보정할 얼굴의 새 3D 지오메트리 생성을 포함하지 않음.
- 기존 라이브 턱선 변형 비활성화와 메시 foldover/stretch 가드는 계속 유지.

### QA/다음
- 정적/동적 Node 검사, mock ImageSegmenter 결과/취소/에러 검사, Python 버전 엔트리/자산 확인.
- 장치 미검증: Android Chrome, Samsung Internet, iOS Safari에서 모델 다운로드, 한손 가림/양쪽 머리카락, 정면/30°/60° 각도, 카메라 전면 미러/후면, 실내 역광, 10분 FPS/발열.
- 다음 패치: 사용자 실기기 QA 로그를 토대로 디바이스별 분할 성능 프로파일, 카메라 흐름과 충돌 없는 Worker 작업 분리, 3D 표현 베이스 확장.

- **성능 추가:** 사진/영상 segmenter 입력은 긴 변 320px(배터리 256px)로 축소한 캔버스 사용. full-HD 크기의 분할 마스크 할당 방지.


## v0.3.1 — 포즈 연속성·마스크 정렬·GPU 메시 업로드 최적화 (2026-11-04)
- **Pose Continuity**: 3개 이상 안정 프레임 확인 후 얼굴 변형을 서서히 복구. 급격한 회전·포즈 추정 누락 때 즉각 신뢰도 감쇠. 2D fallback은 낮은 확신도로 제한.
- **조명 신뢰도**: 포즈 신뢰도 감소 시 3D 근사 조명 신뢰도도 함께 감쇠. 실제 3D 복원·광원 위치 추적은 아님.
- **Matte Alignment**: 코뿐 아니라 양쪽 눈 중심·너비·기울기 확인. 옛 마스크가 회전한 얼굴의 잘못된 위치에 붙는 상황 억제.
- **GPU/CPU**: 메시 변형 강도가 0이고 이미 항등 UV가 업로드된 상태면 불필요한 4,161-정점 재계산/버퍼 업로드 생략. 변형 필요 시 즉시 갱신.
- **보안/개인정보**: 얼굴 데이터·사진 추가 저장 및 네트워크 전송 기능 없음. 프리셋 구조 및 사진 공유 기존 방식 유지.
- **중요**: 실제 모바일 GPU 장시간 출력·조명 화질·측면 가림·턱선 품질은 실기기 QA 필요. 자동 테스트는 이 효과를 입증하지 못함.

- **WebGL2 context restore 안정화**: GPU buffer가 재생성되면 meshIdentityReady를 무조건 false로 리셋하고 첫 프레임 메시 업로드를 강제해 검은 화면/원본 UV 미업로드 위험 완화.


---

# v0.9.0 통합 인수인계 — 2026-11-04

## 변경 목적
중간 버전 별도 릴리스 없이 0.3.1의 안정화 기반을 유지하며 0.9.0을 통합 베타로 구성. 최종 목표는 게임 캐릭터 편집에 가까운 2D/3D 기반 얼굴 커스터마이징이지만, 이번 베타는 실제 구현 범위만 릴리스로 표기.

## 추가·수정 파일
- main.v0.9.0.js: 새 UI/Face Sculpt/Studio Light/스냅샷/공유 링크/QA/기존 성능·가림·메시 통합
- face-sculpt.v0.9.0.mjs: 6영역 모델, inverse UV, contour safety, live confidence/보수적 제한, 선계산된 warp 함수
- mesh-warp.v0.9.0.mjs: 기존 foldover/stretch fail-safe와 새 국소 Warp 합성
- look-presets.v0.9.0.mjs + look-links.v0.9.0.mjs: 설정 정규화/저장/링크 공유 및 레거시 지원
- index.html + styles.css: 모바일 제어 패널/다양한 슬라이더/스튜디오 조명/라이브 진단
- 테스트: tests/v090-face-sculpt.test.mjs, tests/v090-look-links.test.mjs, tests_v090_integration.py
- docs/RELEASE_V090.md, docs/ROADMAP_V090.md, docs/DEVICE_QA_V090.md, docs/QA_RUN_V090.txt

## 기존 데이터 마이그레이션
- localStorage의 maxvfx.beauty.v0.1.preferences 및 maxvfx.beauty.custom.looks.v1 키 그대로 사용
- 이전 look.v2 스키마의 기존 필드는 유지, 새 studio 및 liveSculpt는 optional이고 구버전에는 기본 OFF
- 새 얼굴 6개 파라미터가 없는 옛 프리셋은 0 강도로 로드
- URL 공유 해시는 #look= 형태로, URL에 사진/얼굴 좌표 없음

## 안전 및 남은 문제
- 기존 수학적 fail-safe 2개(삼각 메시 뒤집힘/UV stretch)와 contour rim attenuation 유지.
- 라이브 볼/턱 변형 OFF, 세부 미형 BETA 자체도 기본 OFF.
- 얼굴 완전 가림 중 정확한 3D 추적은 불가능하며, 기존 live transition/원본 복구 유지.
- 이미지 세그먼테이션 모델의 손/머리카락 인식은 오류 가능. 실기기 테스트 필요.
- 모바일 GPU/WebGL/브라우저 UI 시각 테스트 불가능(환경 정책 차단), Android/iOS QA 미완료.

## 다음 작업(0.9.0 검증→1.0.0)
1. Android Galaxy / Xiaomi / iOS Safari/WebView: 기본 필터, 6영역 조절, 조명, 원본 비교 PNG, 룩 링크 테스트
2. 턱선 외곽 신뢰도 검증(빠른 회전/손/머리카락/측면 30/45/60도), 실측 시 failure zero 목표
3. 10분 연속 FPS/발열/누수 로그 및 adaptive quality 튜닝
4. 장래 3D identity shape 및 blendshape capture 설계(개인정보 동의/저장 위치/모델 호환/안전성 검토)

**GitHub 원격 변경 없음.** GitHub 업로드는 사용자가 실행.
