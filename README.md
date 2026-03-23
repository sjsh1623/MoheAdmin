# MoheAdmin

> Mohe 서비스 관리자 대시보드 (React)

## 기술 스택

- **Frontend**: React 19, Vite
- **Routing**: React Router DOM
- **Styling**: CSS Modules
- **API**: MoheSpring `/api/admin/monitor/*` 프록시

## 시작하기

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
```

Docker 환경에서는 MoheReact의 docker-compose.yml에서 `mohe-admin-app` 컨테이너로 빌드됩니다.

## 웹 페이지 URL

| Path | 컴포넌트 | 설명 |
|------|---------|------|
| `/monitor` | Dashboard | 메인 대시보드 (서비스 통계) |
| `/monitor/batch` | BatchMonitor | 배치 작업 모니터링 (워커 상태, 큐) |
| `/monitor/logs` | DockerLogs | Docker 컨테이너 로그 뷰어 |
| `/monitor/places` | Places | 장소 데이터 관리 |
| `/monitor/crawling` | CrawlingMap | 크롤링 진행 지도 시각화 |
| `/` | → `/monitor` | 루트 리다이렉트 |

### 크롤링 지도 (`/monitor/crawling`)

한국 지도를 CSS Grid로 시각화하여 전국 크롤링 진행 상황을 모니터링합니다:

- 17개 시도별 색상 코딩 (PENDING=회색, IN_PROGRESS=주황, COMPLETED=초록, FAILED=빨강)
- 시도 클릭 시 시군구별 상세 패널 표시
- 10초 자동 새로고침 토글
- "전국 자동 순환 시작" 버튼
- 전체 통계 카드 (총 지역, 완료, 진행 중, 대기, 실패, 수집 장소 수)
- 진행률 바

## 프로젝트 구조

```
MoheAdmin/
├── src/
│   ├── App.jsx                        # 라우트 정의
│   ├── main.jsx                       # 엔트리포인트
│   ├── pages/
│   │   ├── Dashboard.jsx              # 메인 대시보드
│   │   ├── BatchMonitor.jsx           # 배치 모니터링
│   │   ├── DockerLogs.jsx             # Docker 로그
│   │   ├── Places.jsx                 # 장소 관리
│   │   └── CrawlingMap.jsx            # 크롤링 지도
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.jsx        # 레이아웃 (Sidebar + Header)
│   │   │   ├── Sidebar.jsx            # 네비게이션 사이드바
│   │   │   └── Header.jsx
│   │   ├── ui/
│   │   │   ├── Card.jsx
│   │   │   ├── Button.jsx
│   │   │   └── Spinner.jsx
│   │   └── dashboard/
│   │       ├── StatCard.jsx
│   │       └── WorkerCard.jsx
│   ├── services/
│   │   └── ApiService.js              # API 호출
│   └── styles/
│       └── global.css                 # 전역 CSS 변수
└── Dockerfile
```

## Caddy 프록시 경로

프로덕션 환경에서는 Caddy 리버스 프록시를 통해 접근합니다:

```
https://mohe.app/admin/* → mohe-admin-app:80
```

## 작성자

**Andrew Lim (임석현)** - sjsh1623@gmail.com
