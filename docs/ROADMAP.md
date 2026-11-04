# maxVFX Beauty Engine — 공식 로드맵 v1.1
개정: 2026-11-04
현재 앱: v0.2.1 (Face Mesh Warp 1차 구현, 실제 모바일 GPU 검증 필요)

## 개발 원칙
- Android/iOS/Windows/macOS 공통 뷰티 엔진을 지향한다.
- 모바일 고정 프리뷰 + 스크롤 가능한 보정 패널을 유지한다.
- Reference Match(참고 인물 스타일 보정)는 시각화이며 동일 인물 복제나 실제 성형 결과 예측이 아니다.
- 상담용 시뮬레이션에는 실제 수술 결과를 예측하거나 보장하지 않는다는 고지를 유지한다.
- 기능 구현 완료와 실기기 QA를 별도로 판정한다.

## 개발 단계
| 단계 | 기존 기능 | 신규 기능 | 완료 게이트 |
|---|---|---|---|
| v0.1.x (현재 v0.1.5) | 웹 실시간 MVP/샘플/비교/기본 미형과 메이크업 | 레퍼런스 설계만 추가 | 모바일 원본 비율·피부·카메라·저장 안정화 |
| v0.2.0 | Douyin 국소 미형/메이크업 | 11개 점 근사 Warp를 국소 Face Mesh Warp로 재구현 | 0% 원본, 배경 보호, fold-over 없음 |
| v0.2.1 | 얼굴 분석 | 내 사진/참고 사진 각각 분석, 정렬·표정·각도·크기 정규화 | 각 사진에 얼굴 1개, 오류/교체 처리 |
| v0.2.2 | 미형 UI | Reference Match, 눈/코/입술/턱/눈썹 유사도 강도, 3면 비교 | 부위별 토글, 얼굴 외 배경 불변, 고정 프리뷰 |
| v0.2.3 | 추적 안정화·QA | A/B 참고 사진, 프리셋, GPU 최적화, 실패 처리 | Android/iOS/PC 기기별 성능·정렬 검증 |
| v0.3.0 | Soft Beauty Relighting/주파수 분리/눈 밑/피부톤 | 참고 이미지의 조명·메이크업 스타일 분리 적용 | 피부 질감·하이라이트 보호 |
| v0.3.1 | 고급 얼굴 렌더 | Consultation Visualization: 눈매/코끝/입술/하안면 부위별 보수적 가상 시각화 | 상담 고지 화면·저장 결과에 표시 |
| v0.3.2 | 3D 얼굴 연구 | 정면·측면 분석 및 depth/3D 근사(연구 범위) | 3D 품질 보고, 임상 정확도 주장 없음 |
| v0.4 | Android NDK/CameraX/iOS AVFoundation/Metal | 로컬 Reference Match 처리 최적화 | 발열·배터리·GPU QA |
| v0.5 | Windows/macOS/OBS/가상 카메라 | 상담 레퍼런스 보드/복수 사진/보고서 | 보관·삭제·내보내기 정책 |
| v1.0 | 통합 배포·QA | Reference Match 제품화, 상담 기능은 검증 후 별도 출시 판단 | 라이선스·개인정보·규제 검토 |

## 우선순위 및 단계별 통과 조건
P0: 사진 2장, 독립 분석, 랜드마크 정렬, 얼굴 부위별 변형 제한, 메시 Warp, 3면 비교.
P1: 메이크업/색감 분리, 레퍼런스 A/B, 포즈/표정 안정화.
P2: 상담용 3D 근사, 상담 보드, 리포트.

- v0.1.6: 피부결 디테일, 눈 밑 밝기, 하이라이트, 모바일 안정화.
- v0.2.0: 기존 보정 화면 확대 오류 재발 방지용 ROI/UV/비율 회귀.
- v0.2.1: 사진 0인/다인/심한 각도/가림 입력은 오류 및 재촬영 안내.
- v0.2.2: 매칭 강도 0%=원본, 과도한 변형 방지, 3면 비교.
- v0.3.1: 상담용 이미지 시뮬레이션 · 실제 수술 결과를 예측하거나 보장하지 않습니다.
- 향후 클리닉용 사용 전에 별도의 의료·법률·규제/임상 검토 필요.

## 설계 문서
- Reference Match Design: REFERENCE_MATCH_DESIGN.md
- QA Reference Match: QA_REFERENCE_MATCH.md
- 설정 스키마: ../schemas/reference-match-config.schema.json
- 참고: https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/FaceLandmarkerOptions
- 참고: https://www.plasticsurgery.org/news/articles/the-ai-face-when-inspiration-photos-arent-real

## v0.2.0 진행 기록 — 2026-11-04
- GPU triangular grid inverse-UV Face Mesh Warp 기반을 새 모듈로 구현.
- 현재 미형에 해당하는 눈 크기/얼굴 라인만 새로운 메시 경로로 연결. 코·입술 부위 메시 변형은 다음 세부 단계로 이월.
- 0% 원본, 4:5/1:1/16:9, 카메라 미러 및 메시 fold-over 테스트 통과.
- Android/iOS/PC 실제 WebGL2 렌더 QA, 얼굴/배경 합성 이음새에 대한 실기기 평가는 별도 진행 필요.
- 다음 단계 v0.2.1: 참조 이미지 2장 업로드/독립 얼굴 분석 및 오류 처리.


## v0.2.1 현황
- 두 사진 독립 업로드, MediaPipe IMAGE 단일 얼굴 검증, 눈/코/입술/턱의 2D 비율 분석 구현.
- 향후 v0.2.2에서 실제 Reference Match 변형을 연결합니다.
- 실기기 GPU와 모델 로딩은 QA가 필요합니다.
