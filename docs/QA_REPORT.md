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
- Node.js `node --check main.js`: PASS
- HTML DOM 중복 ID 검사: PASS
- 필수 리소스 존재 확인: PASS
- Playwright Chromium 로컬 페이지 접근: **환경 보안 정책에서 차단됨** (`ERR_BLOCKED_BY_ADMINISTRATOR`). 화면 렌더·실제 WebGL 셰이더 컴파일 검증 불가.
- 따라서 브라우저 구동과 실제 모바일 GPU 품질은 **PASS라고 주장하지 않음**.
