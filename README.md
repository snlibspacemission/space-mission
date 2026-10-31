# 우주탐사대원 훈련 미션

중원어린이도서관 우주체험관 전시물 QR 퀴즈 미션 페이지입니다.
아이들이 전시물 옆 QR 코드를 찍어 문제를 풀고, 맞힐 때마다 암호 조각을 모아
9개를 다 모으면 수료증과 비밀 암호가 나타납니다.

- 서버·데이터베이스 없음 (진행 기록은 아이 휴대폰 브라우저에만 저장)
- 개인정보 수집 없음 (수료증용 별명만 기기 안에 저장)
- GitHub Pages로 무료 공개

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 아이들이 보는 미션 페이지 |
| `qr.html` | 직원용 QR 인쇄 페이지 |
| `js/data.js` | **문제·정답·힌트·비밀 암호** (내용 수정은 이 파일만) |
| `js/app.js` | 미션 동작 |
| `css/style.css` | 디자인 |
| `js/vendor/qrcode.js` | QR 생성 라이브러리 (MIT) |

## 문제 바꾸기

`js/data.js`를 열어 `question`, `answer`, `wrong`, `hint`, `explain`을 고칩니다.

- `secretWord` 글자 수 = 정거장 수 (지금 9)
- 달마다 암호를 바꾸려면 `secretWord`와 `season`을 함께 바꿉니다.
  `season`이 바뀌면 아이들의 이전 기록은 초기화됩니다.
- `code`를 바꾸면 QR도 다시 인쇄해야 합니다. 문제 내용만 바꿀 때는 QR을 그대로 써도 됩니다.

## 주소 구조

- 미션 시작: `https://<아이디>.github.io/<저장소이름>/`
- 정거장: `https://<아이디>.github.io/<저장소이름>/?s=tel7k`
- QR 인쇄: `https://<아이디>.github.io/<저장소이름>/qr.html`

## 내 컴퓨터에서 미리 보기

```bash
cd space-mission
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000/qr.html 열고 "이 정거장 열어 보기"로 테스트
```
