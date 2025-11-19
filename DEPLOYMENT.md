# 배포 가이드 (Deployment Guide)

## Vercel 배포 설정

### 1. 환경 변수 설정 (Vercel Dashboard)

Vercel 프로젝트 설정에서 다음 환경 변수를 추가하세요:

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**설정 방법:**
1. Vercel Dashboard 접속
2. 프로젝트 선택
3. Settings → Environment Variables
4. `ANTHROPIC_API_KEY` 추가
5. 모든 환경(Production, Preview, Development)에 적용
6. Save 후 재배포

### 2. 배포

코드가 GitHub에 연결되어 있다면 자동으로 배포됩니다.

또는 Vercel CLI로 배포:
```bash
npm i -g vercel
vercel --prod
```

### 3. API 동작 방식

- **로컬 개발**: `npm run dev:all` (프론트엔드 + 백엔드 서버)
- **Vercel 배포**: Vercel Functions (`/api/anthropic`) 자동 사용

로컬에서는 `http://localhost:3001/api/anthropic` 사용
Vercel에서는 상대 경로 `/api/anthropic` 사용 (자동으로 Vercel Functions 호출)

### 4. 문제 해결

**API 호출 실패 시:**
1. Vercel Dashboard에서 `ANTHROPIC_API_KEY` 환경 변수 확인
2. Vercel Functions 로그 확인 (Dashboard → Functions)
3. 브라우저 콘솔에서 네트워크 에러 확인

**로컬에서 테스트:**
```bash
npm run dev:all
```

이렇게 하면 프론트엔드(5173)와 백엔드 서버(3001)가 동시에 실행됩니다.
