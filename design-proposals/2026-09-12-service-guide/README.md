# 최신 사용 방법 영상 제작 원본

2026-09-12 주사용 흐름의 실제 CUA 화면 캡처로 편집한 무음 자막 영상이다. 가상 수강 이력만 사용했으며 연속 화면 녹화는 아니다.

- 최종 공개 파일: public/videos/track-service-guide-20260912.mp4 및 같은 이름의 JPG·ko.vtt
- 50개 장면·48개 사용 캡처·20개 기능 목차·332초
- 앱 목차: src/data/serviceGuideVideo.json. 장면 합계와 각 챕터의 시작·종료가 일치한다.
- storyboard.json은 각 장면의 캡처·길이·제목·자막을 저장한다. 일부 촬영 확인용 캡처는 편집에 사용하지 않았다.
- render_video.py는 Python 표준 라이브러리와 기존 FFmpeg/FFprobe, Windows 맑은 고딕을 사용한다. 입력과 기존 출력은 보존하며 재실행 결과는 상위 rendered/run 폴더에 저장한다.
- 검증만: `python render_video.py --validate`. 한 장면 확인: `python render_video.py --only 33`. 전체 렌더: `python render_video.py`.
- 1080p·25fps·H.264·무음·faststart를 검증한다. JPG 색 범위를 제한 범위 BT.709로 변환하고, 자막 아래156px을 비워 재생 조작부와 겹침을 줄인다.
- 원본 캡처 해상도는 CUA JPEG 약1265×712이며, 영상 출력 크기가 원본보다 세밀한 UI 정보를 추가하는 것은 아니다. 휴대폰에서는 전체 화면·가로 보기 또는 글 안내를 함께 이용한다.

이 폴더와 렌더 중간 파일은 Vercel 업로드에서 제외한다. 내부 절대 경로나 개인 메일 파일을 런타임 화면에 노출하지 않는다.
