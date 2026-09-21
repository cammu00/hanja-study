# 한결 — 한문 암기 웹앱

GitHub Pages에서 바로 실행되는 정적 웹앱입니다. 별도 서버나 설치가 필요하지 않습니다.

## 기능

- 한자 플래시카드와 `다시 / 어려움 / 보통 / 쉬움` 복습 간격
- 객관식 퀴즈와 자동 오답 노트
- 연속 학습일·정답률·오늘 남은 카드 표시
- CSV/JSON 단어 파일 불러오기
- 단어와 학습 기록 JSON 백업 및 복원
- 브라우저 `localStorage` 자동 저장
- 모바일·태블릿·데스크톱 대응 및 다크 모드

## 내 단어 넣기

앱의 **단어 관리**에서 CSV 또는 JSON을 선택하면 됩니다.

CSV 필수 열:

```csv
hanja,sound,meaning,word,wordMeaning,lesson
學,학,배우다,學校,학교,1과
問,문,묻다,質問,질문,1과
```

- 필수: `hanja`, `sound`, `meaning`
- 선택: `word`, `wordMeaning`, `lesson`
- 한글 열 이름도 지원: `한자`, `음`, `뜻`, `한자어`, `단어뜻`, `단원`

JSON 예시:

```json
[
  {
    "hanja": "學",
    "sound": "학",
    "meaning": "배우다",
    "word": "學校",
    "wordMeaning": "학교",
    "lesson": "1과"
  }
]
```

## GitHub Pages에 올리기

1. GitHub에서 새 저장소 `hanja-study`를 만듭니다.
2. 이 폴더 안의 파일을 모두 저장소 최상위에 업로드합니다.
3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Build and deployment**에서 `Deploy from a branch`를 선택합니다.
5. Branch는 `main`, 폴더는 `/ (root)`로 선택하고 **Save**를 누릅니다.
6. 잠시 후 표시되는 주소로 접속합니다.

## 주의

학습 기록은 사용 중인 브라우저와 기기에만 저장됩니다. 브라우저 데이터를 지우거나 다른 기기로 옮기기 전에는 **백업 내보내기**를 사용하세요.
내보낸 JSON을 **단어 관리 → 파일 선택**에서 다시 불러오면 학습 기록까지 복원됩니다.
