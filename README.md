# 시 감상 방법 클리닉 🌸 (Firebase 버전)

**화자 상태 → 대상 +/- → 감정·생각 결론 → 시인이 하고자 하는 말**
현대시를 4단계로 감상하는 훈련 앱입니다. Lovable 버전을 Firebase 기반으로 옮겼습니다.

| 단계 | 내용 |
|---|---|
| 1. 지문 정제 | 시험지 PDF → 네모 안 현대시만 골라 문제용 기호 제거 → 작품함 저장 |
| 2. 전체 감상 | 첫인상 쓰기 → AI가 피드백, 전체 내용 풀이, 분위기·어조 정리 |
| 3. 감상 방법 클리닉 | 4단계 질문에 차례로 답하고 단계마다 AI 피드백 + 예시 답안 |
| 4. 한 행씩 표현기법 클리닉 | 행마다 표현기법을 고르고 효과를 쓴 뒤 정답과 비교 (맞힘/놓침/오답 표시) |
| 5. 작품 개관 정리 | 갈래·성격·주제·운율·특징·시험 포인트 + 나의 4단계 감상을 한 장으로 → 인쇄/PDF |

## 구성

```
poetic-clinic/
├─ src/                  화면 (React + TypeScript + Vite)
├─ dist/                 이미 빌드된 화면 파일 → 그대로 Firebase Hosting 에 올라감
├─ functions/
│  ├─ src/index.ts       AI 기능 (Cloud Functions + Gemini)
│  ├─ lib/index.js       이미 컴파일된 함수 → 그대로 배포됨
│  └─ .env               사용할 Gemini 모델, 하루 사용 한도
├─ firebase.json         Hosting · Functions · Firestore 설정
├─ .firebaserc           ← 여기에 내 Firebase 프로젝트 ID 입력
└─ firestore.rules       본인 작품함만 읽고 쓰도록 하는 보안 규칙
```

- **로그인**: Google 로그인 (Firebase Authentication)
- **작품함**: Firestore `users/{uid}/works` — 학생마다 따로 저장, 어느 기기에서나 이어서 학습
- **AI**: Google AI Studio(Gemini) API 키를 **Secret Manager** 에만 보관. 브라우저에는 키가 절대 노출되지 않습니다.
- **남용 방지**: 로그인한 사용자만 AI 호출 가능 + 1인당 하루 200회 제한 (`functions/.env` 에서 조정)

---

## 처음 배포하기 (약 15분)

### 1) Firebase 프로젝트 준비 — [Firebase 콘솔](https://console.firebase.google.com)

1. **프로젝트 추가** → 이름 입력 (예: `poetic-clinic`). 만들어진 **프로젝트 ID** 를 기억해 두세요.
2. 왼쪽 아래 **요금제 업그레이드 → Blaze** (Cloud Functions 와 Secret Manager 에 필요. 무료 사용량 안에서는 거의 0원이고, 예산 알림을 걸어 두면 안심돼요.)
3. **Authentication → 시작하기 → 로그인 방법 → Google → 사용 설정**
4. **Firestore Database → 데이터베이스 만들기** → 위치 `asia-northeast3 (서울)` → 프로덕션 모드
5. **프로젝트 설정 → 내 앱 → 웹 앱(</>) 추가** (Hosting 설정 체크는 하지 않아도 됩니다)

### 2) 내 컴퓨터 준비

[Node.js 22](https://nodejs.org) 를 설치한 뒤 터미널에서:

```bash
npm install -g firebase-tools
firebase login
```

### 3) 프로젝트 ID 넣기

`.firebaserc` 의 `YOUR-FIREBASE-PROJECT-ID` 를 1)에서 만든 프로젝트 ID 로 바꿉니다.

### 4) Gemini API 키 등록 (한 번만)

[Google AI Studio](https://aistudio.google.com/apikey) 에서 API 키를 만든 뒤:

```bash
cd poetic-clinic
firebase functions:secrets:set GEMINI_API_KEY
# 키를 붙여 넣고 Enter
```

### 5) 배포

```bash
cd functions && npm install && cd ..
firebase deploy
```

끝나면 `https://<프로젝트ID>.web.app` 주소가 나옵니다. 🎉

> `dist/` 와 `functions/lib/` 에 빌드된 파일이 이미 들어 있어서 위 명령만으로 배포됩니다.
> 코드를 고친 뒤에는 `npm install` 한 번 하고 `npm run deploy` 로 다시 빌드·배포하세요.

---

## 설정 바꾸기

`functions/.env`

```
GEMINI_MODEL=gemini-3.8-flash   # 더 저렴하게: gemini-3.5-flash-lite
DAILY_LIMIT=200                 # 학생 1명당 하루 AI 호출 횟수
```

바꾼 뒤 `firebase deploy --only functions`.

## 로컬에서 개발하기

```bash
npm install
cp .env.example .env      # Firebase 웹 앱 설정 값 붙여 넣기
npm run dev               # http://localhost:5173
```

## 자주 묻는 것

- **Google 로그인 창이 바로 닫혀요** → Authentication → 설정 → **승인된 도메인** 에 접속 주소(예: 커스텀 도메인)를 추가하세요. `*.web.app`, `localhost` 는 기본으로 들어 있어요.
- **"AI 응답을 받지 못했어요"** → Firebase 콘솔 → Functions → 로그 확인. 키가 틀렸거나 모델 이름이 바뀌었을 수 있어요 (`GEMINI_MODEL`).
- **PDF 크기** → 7MB 이하. 큰 시험지는 시 지문이 있는 쪽만 잘라서 올려 주세요.
