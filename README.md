# Exception 코딩학회 플랫폼

Next.js 14 (App Router) + Firebase + Tailwind CSS로 만든 코딩학회 학습 플랫폼.

## 기능
- 회원가입(학번+비밀번호+학과+이름+전화번호) — 내부 Auth는 `학번@exception.kr` 형식으로 저장
- 학번+비밀번호 로그인
- 학생 대시보드(과제목록, 점수, 성장 그래프)
- 퍼즐 에디터: 빈칸 채우기 / 드래그앤드롭 함수 조립
- Pyodide로 브라우저에서 Python 실행 + 자동 채점
- GitHub 저장소 URL 제출 + 운영진 수동 채점
- 관리자 패널(과제 등록/관리, 학생 현황, GitHub 채점)
- 리더보드(총점 상위 50명)

## 시작하기

```bash
npm install
npm run dev
```

`.env.local`에 Firebase 키가 이미 채워져 있으며 `.gitignore`에 의해 커밋되지 않습니다.

## Firebase 준비
1. **Authentication** → Sign-in method에서 **이메일/비밀번호** 활성화
2. **Firestore Database** 활성화 (Native 모드)
3. `firestore.rules` 내용을 콘솔의 Rules 탭에 붙여넣기
4. 첫 운영진 계정은 일반 회원가입 후, Firestore의 `users/{uid}` 문서에서
   `role` 필드를 `"admin"`으로 직접 변경

## 데이터 모델

### `users/{uid}`
```
{ uid, studentId, name, department, phone, email,
  role: "student"|"admin", totalScore, createdAt }
```

### `assignments/{id}`
```
{ type: "puzzle"|"code"|"github",
  puzzleType?: "blank"|"dragdrop",
  title, description, maxScore,
  template?, blanks?,                  // blank 퍼즐
  snippets?, correctOrder?,            // dragdrop 퍼즐
  starterCode?,                        // code 자유실행
  expectedOutput?, testSuffix?,
  createdAt }
```

### `submissions/{id}`
```
{ uid, studentId, name,
  assignmentId, assignmentTitle, type,
  score, stdout, error, code|repoUrl|note,
  pendingReview?, submittedAt, gradedAt? }
```

## 채점 규칙
- **퍼즐 / 코드**: 정답+실행 성공 → 만점, 한 쪽만 → 70%, 실행만 성공 → 30%
- **GitHub**: 제출 시 0점 + `pendingReview=true`. 관리자 패널에서 점수 부여
- 학생의 `totalScore`는 과제별 최고점의 합 (개선분만 누적)
