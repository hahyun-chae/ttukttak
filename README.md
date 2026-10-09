# 뚝딱 (MVP)

사장님을 위한 매장 안내문 제작 서비스. 원하는 안내문을 뚝딱 만들어 드려요.

설치할 패키지 없음 — Node.js 18 이상만 있으면 됩니다.

```bash
npm start            # http://localhost:3000
```

- 사용자 화면: http://localhost:3000
- 관리자 페이지: http://localhost:3000/admin (기본 비밀번호 `admin1234`, 배포 시 `ADMIN_PASSWORD` 환경변수로 변경)
- 데이터: `data/db.json`(템플릿·설문·다운로드 수), `data/events.jsonl`(퍼널 이벤트), `data/uploads/`(썸네일·Figma 에셋)

## 구조
- `public/js/catalog.js` 공지 유형·레이아웃·색상 토큰·기본 템플릿 12종(×색상 2 = 24 변형)
- `public/js/copy.js` 입력값 → 톤별 고정 문구 문서 모델
- `public/js/render.js` A4 2480×3508px(300dpi) 캔버스 렌더러 (미리보기와 결과물이 같은 코드)
- `public/js/export.js` 외부 라이브러리 없는 A4 PDF / 300dpi PNG 생성
- `server.js` 정적 파일 + API (템플릿, 이벤트, 다운로드 수, 설문, 관리자)

## Figma 템플릿 연동
Figma에서 텍스트 레이어를 숨기고 배경·장식만 2480×3508px로 export →
관리자 > 템플릿 수정 > "출력용 템플릿 에셋"에 업로드하면, 기본 배경 대신 그 이미지 위에 사용자 입력이 그려집니다.
