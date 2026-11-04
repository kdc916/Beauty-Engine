# maxVFX Beauty Engine v0.2.0

실시간 카메라/이미지 기반 화사한 뷰티 필터 웹 MVP. **브라우저만으로 실행하는 정적 웹앱**이므로 GitHub Pages에 바로 업로드할 수 있습니다.

## v0.2.0 — 국소 삼각형 Face Mesh Warp (1차)
- **단일 화면 전체 셰이더 얼굴 변형을 제거하고** 56×72 셀의 삼각형 그리드(4,161 정점/8,064 삼각형)로 눈 크기·V라인을 변형합니다.
- 얼굴 외곽 36점 기준 마스크로 배경/헤어라인의 UV 변형을 제한하고, 경계에서 변위를 0으로 완화합니다.
- 정점 좌표와 원본 UV를 GPU 보간하여 추가 오프스크린 컬러 버퍼 없이 렌더링합니다.
- 0% 변형 항등 UV, 전면 카메라 미러, 4:5/1:1/16:9 종횡비, 삼각형 뒤집힘 자동 제한을 테스트했습니다.
- 피부·눈 밑·하이라이트·메이크업·샘플 인물·모바일 고정 프리뷰 및 사진 저장은 유지합니다.
- 새 모듈 `mesh-warp.v0.2.0.mjs`, 테스트 `tests/mesh-warp.test.mjs`를 추가했습니다.
- 코·입술의 정교한 메시 변형과 Reference Match는 아직 미구현이며 후속 단계에서 다룹니다.
- 실제 Android/iOS GPU 출력 및 Pages 반영은 실기기에서 확인해야 합니다.

### 실행 및 테스트
- 웹앱: https://kdc916.github.io/Beauty-Engine/?v=0.2.0
- Node 22 이상: `node --test tests/mesh-warp.test.mjs`
- Python 3: `python tests_geometry.py` 등 `tests_*.py`
- 샘플 인물 → 미형 → 눈 크기 0/100 및 얼굴 라인 0/100을 비교해 보세요.

## v0.1.6 — 피부 표현 개선
- 피부 스무딩을 2개 스케일(1.5/4.1 px)로 분리하고 피부 영역 이외 샘플 제외. 미세 피부결 신호를 선택적으로 재합성.
- **피부결 보존**, **눈 밑 밝기**, **하이라이트 보호** 슬라이더 3개 추가 (피부 탭 총 6개).
- Face Landmarker의 아래 눈꺼풀(145, 374번) 좌표를 활용한 눈 밑 국소 밝기 처리. 피부 마스크로 눈동자/속눈썹 보호.
- 피부 밝은 영역의 색상 과노출을 완화하는 소프트 하이라이트 숄더 적용.
- v0.1.x에서 저장한 과거 프리셋을 복원해도 새 파라미터는 선택한 프리셋 기본값에서 초기화.
- 기존 얼굴형·메이크업·3가지 프리셋·샘플 인물·모바일 고정 프리뷰·원본 비교 유지.
- **정적 회귀검사 통과**. Chromium 로컬 브라우저는 환경 정책으로 차단되어 WebGL2 실시간 출력 및 실제 모바일 성능은 미검증.

## v0.1.5 변경 사항
- Face Landmarker의 얼굴 외곽선 36개 좌표로 피부 마스크를 생성합니다. 눈, 눈썹, 입술 제외 영역은 보존합니다.
- 피부 스무딩의 이웃 샘플링에 피부 마스크를 적용하여 경계 픽셀 혼입을 줄입니다.
- 보정 패널의 **피부 마스크 확인** 버튼으로 처리 영역을 녹색으로 시각화합니다 (WebGL2 전용).
- 사진과 기본 인물 샘플은 슬라이더·프리셋·비교 위치가 바뀔 때만 재렌더링합니다.
- 소스 전환 시 오래된 얼굴 추적 결과를 무효화합니다.
- 모바일 프리뷰 고정 및 패널 별도 스크롤을 유지합니다.

## 실제 구현
- WebGL2 실시간 피부 영역 스무딩(에지 인지), 얼굴 밝기·피치톤·소프트 글로우·전체 채도
- MediaPipe Face Landmarker 기반 1인 얼굴 랜드마크 감지
- 얼굴 윤곽·눈 크기 근사 워프, 입술과 양 볼 간이 메이크업
- Clear Glow / Douyin Beauty / Soft Portrait 프리셋
- 피부·미형·메이크업·색감 슬라이더, 전/후 드래그 비교, 전후면 카메라 전환
- 사진 업로드, PNG 스냅샷, 로컬 프리셋 저장, JSON 내보내기/가져오기
- 모바일 대응 UI, WebGL2 실패 시 기본 색감 Canvas 2D 폴백

## GitHub Pages 배포
1. **새 GitHub 공개 저장소**를 만들고 이 폴더 안의 `index.html`, `main.v0.2.0.js`, `mesh-warp.v0.2.0.mjs`, `styles.css`, `assets/` 등을 저장소 **루트**에 업로드합니다.
2. `Settings > Pages > Build and deployment`에서 **Deploy from a branch**, Branch **main**, Folder **/(root)** 선택 후 저장합니다.
3. Pages 공개 URL(`https://<id>.github.io/<repo>/`)에서 **카메라 시작하기**를 누르고 권한을 허용합니다.
4. 카메라 권한 문제가 있으면 HTTPS 페이지인지, 브라우저 권한이 허용되어 있는지 확인합니다.

로컬에서 테스트할 때 `file://`로 열지 말고 `python -m http.server 8080` 후 `http://localhost:8080`에서 여세요. 스마트폰에서는 GitHub Pages HTTPS를 권장합니다.

## 제약 및 주의
- 첫 실행 시 CDN을 통해 `@mediapipe/tasks-vision@1.2.0` 및 Google-hosted Face Landmarker 모델을 다운로드합니다. **인터넷 연결 필요**.
- 얼굴 모델이 다운로드되지 않아도 카메라/사진, 전체 색감 조절은 가능하며 얼굴 기반 기능은 제한됩니다.
- 최초 접속에서 MediaPipe 모델 다운로드/초기화 지연이 생길 수 있습니다.
- 미형은 셰이더의 실험적 단일 패스 근사 구현입니다. 상용 뷰티 SDK와 동일한 정밀도나 60fps는 보장하지 않습니다.
- 한 명의 얼굴만 추적합니다. 빠른 움직임, 얼굴 가림, 측면 얼굴, 조명이 부족한 환경에서 오류가 발생할 수 있습니다.
- PNG 저장은 실제 웹 프레임 이미지를 저장합니다. 비교 모드에서 저장하면 전/후 합성 결과가 저장됩니다. 원본 없는 보정 결과를 원하면 비교 모드를 끄세요.
- iOS Safari / Android Chrome 및 PC 브라우저의 실제 기기 테스트가 필요합니다.
- 사용자 사진·비디오는 기본적으로 로컬 처리됩니다. 다만 모델/CDN 다운로드에 외부 통신을 사용하며 MediaPipe 측 사용 통계 관련 정책은 해당 제공자 문서 확인이 필요합니다.

## 소스 및 라이선스
- **본 애플리케이션 HTML/CSS/JS와 GLSL 필터 코드는 신규 작성**입니다. GPUPixel 또는 타사 라이브러리 코드를 복사하지 않았습니다.
- MediaPipe Tasks Vision: Apache-2.0, https://github.com/google-ai-edge/mediapipe
- 모델: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task — 배포/상용화 전에 모델별 이용 조건 검토
- 배포 시 제3자 라이선스 고지 및 개인정보처리 검토 필요.

## 후속 패치 우선순위
1. 카메라/사진 통합 QA 및 landmark 좌표/왜곡 보정
2. 정교한 얼굴/피부 마스크와 헤어·눈썹·입술 제외
3. 고급 잡티 제거 및 눈 밑 보정, 선명도 보호
4. 실제 Mesh Warp 기반 고품질 얼굴형/눈 변형
5. 조명·얼굴 톤 및 멀티 플랫폼 색 재현

See [docs/HANDOFF.md](docs/HANDOFF.md) and [docs/QA_REPORT.md](docs/QA_REPORT.md).


### v0.1.5 업데이트 안내 (과거 이력)
- 모바일 사진 보정 확대 오류 방지: 버전별 JS 파일 사용(`main.v0.1.5.js`)으로 기존 브라우저 캐시 무효화
- 얼굴형 변형 반경 제한 및 비교 슬라이더 위치 수정
- 배포 후 페이지에 `v0.1.5` 표시를 확인하세요. 이전 버전이면 강력 새로고침하거나 페이지 재접속이 필요합니다.


## v0.1.5 — 모바일 상단 고정 프리뷰 + 테스트 샘플
- 앱 진입 즉시 앞서 제작한 인물 샘플이 로드되고 원본/보정 비교가 시작됩니다. 이미지 파일은 `assets/sample-portrait.webp` (360×450, 6.7KB)입니다.
- 모바일에서는 얼굴 프리뷰를 화면 상단에 유지하고 하단 보정 패널만 스크롤할 수 있습니다. PC는 기존 2열 레이아웃을 유지합니다.
- 패널의 **샘플 / 카메라 / 사진** 버튼으로 입력 소스를 전환합니다.
- WebGL2 미지원 상황의 Canvas2D 폴백에서도 원본/보정 비교를 수행합니다.
- 모바일 테스트: https://kdc916.github.io/Beauty-Engine/?v=0.2.0
- 실제 Android Chrome/Samsung Internet/iOS Safari 카메라 및 GPU 동작은 기기별로 추가 검증이 필요합니다.

## v0.1.5 변경사항
- 립 윤곽 20개 랜드마크 기반 마스크 적용, 입 안쪽/치아 보호
- 라디얼 그라디언트 블러셔를 별도 GPU 마스크로 합성
- 움직임 적응형 얼굴 랜드마크 스무딩 및 디버그 마스크 컬러 구분


## 로드맵 v1.1 — Reference Match / 상담용 시각화 계획 (2026-11-04)
- [공식 개정 로드맵](docs/ROADMAP.md): 기존 v0.1~v1.0 유지, v0.2.1~0.2.3 Reference Match 및 v0.3.1~0.3.2 Consultation Visualization 추가.
- [구현 설계](docs/REFERENCE_MATCH_DESIGN.md) · [전용 QA 계획](docs/QA_REFERENCE_MATCH.md)
- [설정 스키마](schemas/reference-match-config.schema.json) · [예시 프리셋](examples/reference-match-preset.json)
- **현재 실행 버전은 v0.2.0이며 Reference Match와 상담 시뮬레이션은 아직 구현되지 않았습니다.**
- 상담용 가상 이미지는 실제 수술 결과 예측이나 의학적 상담을 대체하지 않습니다.
