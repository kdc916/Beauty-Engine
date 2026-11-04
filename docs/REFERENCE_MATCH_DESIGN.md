# Reference Match / Consultation Visualization 구현 설계 v1.0
문서 계획안: 런타임 구현되지 않았으며 현재 앱은 v0.1.5.

## 기능 범위
- Reference Match: 사용자 본인 사진과 참고 인물 사진 두 장을 받아 눈매/코·입술 비율/턱선/눈썹 등 외형 특징을 부분적으로 가상 보정. 동일 인물 복제나 신원 인식을 목적으로 하지 않는다.
- Consultation Visualization: 참고용 눈매·코끝·입술·하안면 이미지 합성. 실제 수술 결과 예측, 의학적 진단, 시술 성공 보장이 아니다.
- 피부색·민감 속성을 자동 유사도 평가 지표로 사용하지 않는다. 사진 권리와 당사자 동의를 확인한다.

## 현 소스에서의 기술 변경 지점
- main.v0.1.5.js의 단일 source/face 상태를 sourceFace/referenceFace 별도 상태로 분리.
- startTracking/updateFace의 MediaPipe 분석을 사진 2장에 대해 독립 실행하고 sourceGeneration/referenceGeneration으로 오래된 결과 폐기.
- LANDMARK_IDS 11개에만 의존하는 Eye/Slim Warp에서 얼굴 삼각 메시와 부위별 경계 마스크로 전환.
- FACE_OVAL/눈/입술 마스크를 확장하고 피부/메이크업 결과와 기하 변형을 분리.
- WebGL2 별도 GPU 국소 메시 또는 변위 텍스처 기반 inverse warp와 마스크 경계 feathering.
- 기존 모바일 고정 프리뷰/별도 스크롤 유지, Beauty/Reference/Consultation 모드 탭 추가(구현 시점).

## 분석 알고리즘
1. 입력 이미지를 EXIF 회전·해상도·색공간 기준으로 정규화.
2. 얼굴이 1개인 사진 각각 MediaPipe Face Landmarker 분석.
3. 눈 중심, IPD(눈 사이 거리), 코끝, 입술, 턱 위치로 위치/크기/roll 정렬; yaw/pitch 및 표정 차이는 품질 게이트로 사용.
4. 정규화 부위별 특징 벡터: eyes(열림·가로폭·기울기), nose(콧방울/코끝의 2D 위치), lips(높이·폭·입꼬리), jaw(턱·볼 폭과 길이), brow(눈썹 높이·기울기).
5. 차이값 delta = reference - source; regionLimit으로 clamp하고 globalStrength와 각 지역 strength로 반영.
6. 지역별 얼굴 메시 Warp, 배경 displacement=0, 뷰티/메이크업/조명은 선택적으로 별도 적용.
7. 3면 비교: 내 사진 / 참고 사진 / 가상 결과.

## 속도와 품질 제약
- 정면 이미지 권장. 얼굴 회전(예: yaw/roll 15~20도 이상)은 초기 경고 기준으로만 사용하며 임상 기준이 아니다.
- UI 0% 강도에서 원본 이미지 반환(전체 색감 효과도 별도 OFF).
- 변형에는 얼굴 부위·IPD 기준 하드 상한을 적용하며, 메시 fold-over(삼각형 뒤집힘) 방지.
- 얼굴 바깥 배경은 원본 유지, 이음새는 주변 마스크 feathering으로 관리.
- 정면 단일 사진만으로 코의 3D 돌출량/뼈·연골 구조/치유 과정을 추정하지 않는다.
- 현재 WebGL2 단일 패스에 478개의 점을 모두 uniform으로 담지 않고 전용 메시 버퍼/texture buffer를 사용한다.

## 계획 데이터 계약
FaceInput: kind(source/reference), bitmap, generation.
FaceAnalysis: imageWidth/imageHeight, normalized landmarks, faceCount, pose, features(eyes,nose,lips,jaw,brow), warnings.
ReferenceMatchConfig: schemaVersion, mode, enabled, globalStrength, regions, maxDisplacementIPD, includeMakeupLook, includeColorLook.
- JSON 명세: ../schemas/reference-match-config.schema.json
- 예시: ../examples/reference-match-preset.json
- 프리셋에는 얼굴 사진/랜드마크/임베딩/이름/인물 신원/URL을 넣지 않는다.
- 사진 교체·삭제 시 ObjectURL revoke, ImageBitmap/GPU 리소스 폐기.

## UX
모바일: 고정 프리뷰 + 하단 컨트롤의 Reference 탭에 내 사진/참고 사진 카드, 전체 강도, 눈·코·입술·턱·눈썹 슬라이더, 원본/참고/가상 비교.
PC: 중앙 큰 프리뷰 + 우측 레퍼런스 보드, 동기 확대와 3면 비교.
입력 분석 실패 시 왜 실패했는지 알리고 합성하지 않는다.
상담 모드는 프리뷰 및 저장 결과에 다음 문구를 상시 표시: 상담용 이미지 시뮬레이션 · 실제 수술 결과를 예측하거나 보장하지 않습니다.

## 작업 분할
| Task | 모듈 | 종료 조건 |
|---|---|---|
| REF-001 | reference-input.js | 이미지 2장 입력, 취소/교체/오류 |
| REF-002 | face-analysis.js | 1인 랜드마크, 포즈/표정 경고 |
| REF-003 | feature-metrics.js | 특징값 정규화, 이미지 스케일 독립 |
| REF-004 | warp-limits.js | 강도·위상·배경 보호 |
| REF-005 | mesh-warp.js + GLSL | 0% 항등, 삼각형 정상, UV 회귀 |
| REF-006 | reference-ui.js | 모바일 유지, 부위별·3면 비교 |
| REF-007 | reference-export.js | 설정만 저장, 얼굴 데이터 제외 |
| CON-001 | consultation module | 보수적 2D 시각화와 고지 |
| CON-002 | 3D feasibility research | 정면/측면 제약과 불확실성 문서화 |

## 미구현/주의사항
- 모든 작업은 향후 마일스톤에만 해당하고 현재 런타임 변경 없음.
- 임상 예측을 주장하지 않는다. 전문 상담용 정식 제품 출시는 의학적 검증, 개인정보 처리 및 해당 국가 규제 검토 후 별도 결정.
- 참고: https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/FaceLandmarkerOptions
- 한계: https://pmc.ncbi.nlm.nih.gov/articles/PMC13441132/
