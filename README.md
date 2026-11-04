# maxVFX Beauty Engine v0.2.5

PC/모바일 웹에서 WebGL2와 MediaPipe Face Landmarker를 사용하는 실시간 뷰티 카메라 실험 버전입니다. **이번 릴리스는 GitHub에 자동 업로드하지 않았습니다.** 사용자가 이 ZIP을 직접 저장소에 반영해야 배포됩니다.

## 이번 업데이트 — Adaptive Live Performance

- **자동 라이브 화질:** 균형 모드(최대 768px / 목표 상한 30fps)부터 시작해 실제 지연이 장기간 반복될 때만 절전(640px / 24fps) → 배터리(512px / 20fps)로 점진 전환합니다. 안정되면 단계적으로 균형 모드까지 복귀합니다.
- **수동 설정:** 자동 / 고화질(960px) / 균형(768px) / 절전(640px) / 배터리(512px). 모바일에서도 상단 프리뷰를 그대로 보면서 아래 패널에서 선택 가능합니다.
- **텍스처 최적화:** 영상과 마스크의 크기가 같다면 `texSubImage2D()`를 사용하고, 정지 이미지는 동일한 소스에 대해 GPU 업로드를 반복하지 않습니다.
- **추적 비용 제어:** 라이브 모드에 따라 Face Landmarker 실행 주기(110–240ms)와 피부 마스크 갱신 주기(130–280ms)를 조절합니다. 큰 얼굴 움직임은 예외적으로 마스크 즉시 갱신.
- **안정성:** 탭 일시중지/복귀 시 라이브 얼굴 좌표 안전 재획득, 늦게 도착한 카메라 권한 요청 폐기, WebGL 컨텍스트 손실 시 2D 폴백 및 복원 시 GPU 재초기화.
- **기존 기능:** v0.2.4 Live Safe 턱선 변형 안전장치, 메쉬 UV stretch/foldover fallback, 샘플 인물, 피부·메이크업, 미형, Reference Match, 전후/3면 비교 유지.

| 라이브 모드 | 렌더 최대 긴 변 | 렌더 목표 FPS 상한 | 추적 최소 간격 | 마스크 최소 간격 |
|---|---:|---:|---:|---:|
| 고화질 | 960 px | 30 | 110 ms | 130 ms |
| 균형 | 768 px | 30 | 140 ms | 180 ms |
| 절전 | 640 px | 24 | 190 ms | 230 ms |
| 배터리 | 512 px | 20 | 240 ms | 280 ms |

이 값은 **설정 정책**입니다. 실제 FPS, 온도, 배터리 절약량을 측정한 결과가 아닙니다. 외부 라이브 영상으로 의료·성형 수술 후 모습을 예측하지 않습니다.

## GitHub 직접 업로드

1. 전체 패키지 ZIP의 압축을 풉니다. ZIP의 **최상위가 저장소 루트**이며, `index.html` 바로 아래 `assets/`, `docs/`, `.github/`, `tests/` 등이 있어야 합니다.
2. [Beauty-Engine 저장소](https://github.com/kdc916/Beauty-Engine) `main` 브랜치에 변경된 파일과 새 v0.2.5 파일을 그대로 업로드하여 커밋합니다. **기존 정식 소스를 잃지 않도록 백업하거나 새 브랜치에서 검증하는 것을 권장합니다.**
3. GitHub Actions의 `Beauty Engine QA` 테스트를 확인합니다. 테스트 PASS는 얼굴 형태의 GPU 시각적 정확도를 보장하지 않습니다.
4. GitHub Pages [v0.2.5 테스트](https://kdc916.github.io/Beauty-Engine/?v=0.2.5)에서 상단 버전을 확인하고 샘플/사진/카메라 순서로 점검합니다.

로컬 웹서버 실행: `python -m http.server 8080`, 브라우저에서 `http://localhost:8080` 열기. `file://`는 ES 모듈·카메라 제한으로 권장하지 않습니다.

## 현재 앱 구조

- `index.html`, `styles.css` — UI; 모바일에서 고정 프리뷰 + 보정 패널 독립 스크롤
- `main.v0.2.5.js` — 카메라/사진/렌더링/슬라이더/라이프사이클
- `live-performance.v0.2.5.mjs` — 순수 연산 자동 화질/프레임 예산 컨트롤러
- `live-safety.v0.2.5.mjs` — 얼굴 추적 좌표 검증/급격한 움직임 차단
- `mesh-warp.v0.2.5.mjs` — 4161-정점 Face Mesh 안전 변형, UV stretch·foldover 검사
- `reference-match.v0.2.5.mjs`, `reference-panel.v0.2.5.mjs`, `reference-metrics.v0.2.1.mjs` — 실험적 이미지 기반 참고 얼굴 비율/2D 매칭
- `assets/sample-portrait.webp` — 내장 테스트 인물 사진
- `tests/`, `tests_*.py`, `.github/workflows/qa.yml` — Node/Python 회귀 검사
- `docs/HANDOFF.md`, `docs/QA_REPORT.md`, `docs/DEVICE_QA_V025.md` — 누적 개발 이력, 검증, 실제 스마트폰 체크리스트

## 실행 제약·검증

- 첫 얼굴 추적 시 MediaPipe JS/WASM 및 모델을 CDN에서 다운로드하기 때문에 인터넷이 필요합니다. 얼굴 사진·비디오·좌표는 기본적으로 기기 내 메모리에서 처리되며, 프리셋에는 저장되지 않습니다.
- WebGL2 불가 시 Canvas2D 기본 색감·비교만 가능하며 정밀 얼굴형/Reference Match 변형은 제한됩니다.
- Node 동적 테스트 **22개**, Python 정적 회귀 **10개**, JavaScript 구문·자산 검사 통과.
- Chromium의 로컬 페이지 접근이 `ERR_BLOCKED_BY_ADMINISTRATOR`로 차단되어 **실제 브라우저 GPU 렌더링, 카메라 성능, 10분 발열/배터리 테스트는 실행하지 못했습니다.** 실기기 테스트 전 상용/라이브 운영에서 안정성을 보장할 수 없습니다.
- 모든 메이크업/참고 얼굴 변환은 시각화이며 실제 성형 시술/수술 결과를 예측하거나 보장하지 않습니다.

## 다음 단계

스마트폰 실측(기기별 FPS·발열·추적 재획득 시간)을 기반으로 자동 전환 임계값과 메시 안전성을 조정하고, Reference Match의 A/B 이미지 전환/품질 경고를 고도화합니다. 이전 버전 기록은 `CHANGELOG.md`와 `docs/HANDOFF.md`에 보관합니다.
