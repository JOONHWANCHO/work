# 모두의 계산기 (paycal.kr)

연봉 실수령액 · 퇴직금 · 연차수당 · 연말정산 · 실업급여 · 최저임금까지, 직장인을 위한
무료 노무·급여 계산기 모음 사이트입니다.

- **호스팅**: GitHub Pages (정적 사이트, 빌드 단계 없음)
- **DNS/CDN**: Cloudflare
- **콘텐츠 DB**: Google Sheets (게시글) + Google Apps Script (조회수/방문자 로그 수집)
- **프레임워크**: 없음 — 순수 HTML/CSS/Vanilla JS. 각 페이지는 독립적으로 동작합니다.

이 문서는 2026-07 개편(UI/UX 개선, SEO 구조 개선, 신뢰도 개선) 내용과 함께
디렉토리 구조·로컬 테스트·배포 방법을 정리합니다.

---

## 1. 디렉토리 구조

```
.
├── index.html              # 홈 — 계산기 6종 그리드 + 최신 뉴스 + 인기글 랭킹
├── salary.html              # 연봉 실수령액 계산기
├── retirement.html          # 퇴직금 계산기
├── annual-leave.html        # 연차수당 계산기
├── year-end-tax.html        # 연말정산 미리보기
├── unemployment.html        # 실업급여(구직급여) 계산기
├── minimum-wage.html        # 최저임금 계산기
├── content.html             # 게시글 상세 페이지 (?id=N 쿼리로 게시글 렌더링)
├── contact.html             # 문의 (noindex)
├── privacy.html             # 개인정보처리방침 (noindex)
├── terms.html                # 이용약관 (noindex)
├── admin.html                # 콘텐츠/통계 관리자 대시보드 (noindex, nofollow — 비공개 운영 도구)
├── sample.html                # ⚠️ 본 프로젝트와 무관한 레거시 파일로 보입니다. 삭제를 권장합니다 (7번 항목 참고)
├── assets/
│   ├── site.js               # 공통 스크립트: 방문자/조회수/행동 로그를 Apps Script로 전송
│   └── og-image.png          # 공유(카카오톡/트위터/페이스북) 미리보기 이미지 (1200×630)
├── scripts/
│   └── generate_sitemap.py   # Google Sheets 게시글 목록을 읽어 sitemap.xml을 재생성하는 스크립트
├── .github/workflows/
│   └── update-sitemap.yml    # 매주 sitemap.xml을 자동 재생성·커밋하는 GitHub Actions
├── sitemap.xml
├── robots.txt
├── ads.txt                    # Google AdSense 소유권 확인 파일
└── CNAME                      # GitHub Pages 커스텀 도메인 설정 (paycal.kr)
```

### 아키텍처 특징 (왜 이렇게 만들어져 있나)

- **빌드 도구가 없습니다.** 각 HTML 파일은 `<style>`을 자체적으로 포함한 완전히 독립된 문서입니다.
  GitHub Pages에 그대로 올리면 동작하도록 설계되어 있어, Node/webpack 등 빌드 파이프라인이
  필요 없습니다. 대신 페이지마다 CSS가 일부 중복되는 트레이드오프가 있습니다.
- **게시글(뉴스/인기글)은 Google Sheets가 원본(source of truth)입니다.** 시트를 "웹에 게시"로
  공개하면 `index.html`과 `content.html`이 구글의 gviz(JSON) 엔드포인트로 시트를 그대로
  읽어와 렌더링합니다. 별도 서버·DB가 필요 없습니다.
- **조회수/방문자 통계는 Google Apps Script 웹앱**이 받아서 시트에 적재합니다. `admin.html`이
  이 데이터를 대시보드로 보여주는 관리자 페이지입니다.

---

## 2. 이번 개편에서 무엇이 바뀌었나

### UI/UX
- **로고 클릭 버그 수정**: 계산기 하위 페이지(연봉/퇴직금/연차/연말정산/실업급여/최저임금)에서
  헤더 로고가 `<div>`라서 클릭해도 홈으로 이동하지 않던 문제를 `<a href="index.html">`로 수정했습니다.
- **브레드크럼(경로 표시) 추가**: 모든 계산기 페이지 상단에 `홈 › 계산기 › OOO 계산기` 형태의
  브레드크럼을 추가해 현재 위치를 명확히 하고, 페이지 간 이동을 쉽게 했습니다.
- **신뢰 배지(최종 확인일) 추가**: 각 계산기 소개 영역에 "정보 최종 확인일 · 근거 법령" 배지를
  넣어, 방문자가 이 계산기가 최신 기준으로 관리되고 있다는 신호를 바로 볼 수 있게 했습니다.
  (실제 세율/보험료 수치가 바뀌면 이 배지 문구도 함께 갱신해 주세요 — 7번 "알려진 제한사항" 참고)
- **문서/전표(장부) 컨셉 디자인 유지·보완**: 기존의 세리프 헤드라인 + 모노스페이스 숫자 +
  종이 질감 배경 컨셉은 "공식 서류 같은 신뢰감"을 주기 위해 의도적으로 설계된 디자인이라
  판단해 큰 틀은 유지했습니다. 대신 아래 항목을 보완했습니다.
  - 저대비 회색 텍스트(`--ink-faint`)의 명도를 낮춰 WCAG AA 명암비(4.5:1) 기준을 충족하도록 조정
    (`#8A93A3` → `#616B80`). 조회수·타임스탬프·안내문 등 작은 텍스트의 가독성이 개선됩니다.
  - `:focus-visible` 아웃라인, 시맨틱 랜드마크(`header`/`main`/`footer`) 등 기존 접근성 요소는
    그대로 유지했습니다.

### SEO
- **`<h1>` 중복 문제 해결 (가장 중요한 수정)**: 기존에는 **모든 페이지의 `<h1>`이 "모두의
  계산기"(사이트 로고)** 로 고정되어 있었고, 실제 페이지 주제("연봉 실수령액 계산기" 등)는
  `<h2>`였습니다. 구글은 `<h1>`을 페이지 핵심 주제 판단에 강하게 활용하므로, 이 구조에서는
  6개 계산기 페이지 모두 구글에게 "이 페이지의 핵심 주제는 모두의 계산기"라는 동일한 신호를
  보내고 있었습니다 — 개별 계산기 키워드로 상위 노출되기 어려운 구조였습니다.
  로고는 `<p class="brand-name">`으로, 각 페이지의 실제 주제를 `<h1>`으로 바꿨습니다.
- **`canonical`/`og:url` 오류 수정**: `salary.html`의 canonical과 og:url이 홈페이지
  (`https://paycal.kr/`)를 가리키고 있었습니다. 이 상태로 배포되면 구글이 salary.html의 콘텐츠를
  홈페이지의 "복제본"으로 인식해 색인에서 제외할 수 있는 심각한 버그였습니다. 자기 자신을
  가리키도록 수정했습니다.
- **구조화 데이터(JSON-LD) 신규 추가**: 검색 결과에 리치 스니펫(경로, 평점형 UI 등)이 노출될
  가능성을 높이기 위해 추가했습니다.
  - 홈: `WebSite`, `Organization`, `ItemList`(계산기 6종)
  - 계산기 6종: `WebApplication`, `BreadcrumbList`
  - 게시글(`content.html`): 게시글을 불러올 때 JS가 `Article`, `BreadcrumbList`를 동적으로 주입
- **Open Graph 이미지 추가**: 카카오톡/트위터/페이스북 등에 링크를 공유했을 때 미리보기가
  텍스트만 나오던 문제를 `assets/og-image.png`(1200×630) 추가로 해결했습니다.
- **게시글이 항상 `noindex`였던 치명적 버그 수정**: `content.html`(게시글 상세)이
  `<meta name="robots" content="noindex">`로 고정되어 있었고, 주석에 "배포 시 제거하세요"라고만
  적혀 있어 실수로 계속 방치되기 쉬운 구조였습니다. 즉, 블로그성 콘텐츠(SEO 트래픽의 핵심
  동력)가 **처음부터 구글에 절대 노출되지 않는 상태**였습니다. 기본값을 `index, follow`로
  바꾸고, 특정 글만 비공개로 두고 싶을 때 켜는 옵션으로 안내를 변경했습니다.
- **`sitemap.xml` 정비**:
  - `noindex` 페이지(문의/개인정보/약관)를 sitemap에서 제외 (상반된 신호 제거)
  - `lastmod` 추가
  - `scripts/generate_sitemap.py` + GitHub Actions로 **게시글 URL을 자동 포함**하도록 개선
    (기존에는 게시글이 sitemap에 전혀 없었습니다 → 6번 항목 참고)
- **`robots.txt`**: 사이트와 무관해 보이는 `sample.html`을 크롤링 대상에서 제외.

### 신뢰도 (E-E-A-T 관점)
- 계산기 결과가 "누구나 알 수 있는 공식 근거(법령명)"에 기반한다는 점을 배지·문구로 노출
- 하단 면책 문구("본 계산 결과는 정보 제공 목적의 추정치이며 법적 효력이 없습니다")는
  기존 그대로 유지 — 금융/법률 정보 사이트에서 신뢰를 지키는 데 중요한 요소이므로 임의로
  수정하지 않았습니다.

---

## 3. 로컬에서 실행하고 테스트하는 방법

빌드 과정이 없으므로, 정적 파일 서버만 있으면 됩니다.

```bash
# 프로젝트 루트에서
python3 -m http.server 8000
# 또는
npx serve .

# 브라우저에서 http://localhost:8000 접속
```

> ⚠️ `file://`로 직접 여는 것은 권장하지 않습니다. `assets/site.js`의 `fetch()` 호출과
> Google Sheets 연동(gviz)이 브라우저의 CORS/보안 정책 때문에 로컬 파일 프로토콜에서는
> 동작하지 않을 수 있습니다. 반드시 위와 같이 로컬 웹서버를 통해 열어서 테스트하세요.

### 체크리스트 (배포 전 최소 확인 항목)

| 항목 | 확인 방법 |
|---|---|
| 6개 계산기가 모두 정상 계산되는지 | 각 페이지에서 임의 값 입력 → "계산하기" 클릭 → 결과 카드 확인 |
| 모바일 레이아웃 | 브라우저 개발자도구 반응형 모드 (iPhone SE ~ 데스크톱 1440px까지) |
| 로고 클릭 시 홈으로 이동하는지 | 계산기 페이지에서 좌상단 로고 클릭 |
| 브레드크럼 링크 동작 | `홈`, `계산기` 링크 클릭 |
| Google Sheets 연동 | 홈 화면 "최신 뉴스" 섹션이 시트 데이터로 채워지는지 (시트 미설정 시 샘플 데이터 노출 + 안내 문구 표시됨) |
| 콘솔 에러 없는지 | 브라우저 개발자도구 Console 탭에서 에러 확인 |
| 폼 접근성 | Tab 키만으로 입력 필드 → 버튼까지 이동 가능한지 |

### 자동화된 검사 (이번 작업에서 실행한 것과 동일)

```bash
# 1) 정적 HTML의 인라인 JS 문법 검사 (Node 필요)
node -e "
const fs = require('fs');
for (const fn of ['index.html','salary.html','retirement.html','annual-leave.html',
                   'year-end-tax.html','unemployment.html','minimum-wage.html','content.html']) {
  const t = fs.readFileSync(fn, 'utf8');
  const scripts = [...t.matchAll(/<script(?![^>]*src)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
  scripts.forEach((m, i) => { try { new Function(m[1]); } catch (e) { console.log(fn, i, e.message); } });
}
console.log('OK');
"

# 2) JSON-LD 구조화 데이터가 유효한 JSON인지 검사
python3 -c "
import re, json
for fn in ['index.html','salary.html','retirement.html','annual-leave.html',
           'year-end-tax.html','unemployment.html','minimum-wage.html']:
    t = open(fn, encoding='utf-8').read()
    for b in re.findall(r'<script type=\"application/ld\+json\">\n(.*?)\n</script>', t, re.S):
        json.loads(b)
print('모든 JSON-LD 유효함')
"

# 3) sitemap.xml 재생성 테스트 (Google Sheets가 공개 상태여야 게시글이 채워집니다)
python3 scripts/generate_sitemap.py
```

### 외부 SEO/성능 검증 도구 (배포 후 반드시 확인)

1. **Google Search Console** → "URL 검사" 도구로 `salary.html` 등 색인 상태 확인,
   `sitemap.xml` 제출
2. **Rich Results Test** (https://search.google.com/test/rich-results) → 계산기 페이지 URL을
   넣어 `WebApplication`/`BreadcrumbList` JSON-LD가 정상 인식되는지 확인
3. **PageSpeed Insights / Lighthouse** (Chrome 개발자도구 → Lighthouse 탭) → 성능/접근성/SEO
   점수 확인. 목표: 접근성 90+, SEO 95+
4. **Facebook Sharing Debugger / 카카오톡 디버거** → `assets/og-image.png`가 정상적으로
   미리보기에 노출되는지 확인 (최초 1회는 캐시 갱신이 필요할 수 있습니다)
5. **모바일 친화성 테스트**: PageSpeed Insights에 포함된 모바일 점수로 대체 확인 가능

---

## 4. 배포 방법 (GitHub Pages + Cloudflare)

### 4-1. GitHub Pages

1. 이 저장소를 GitHub에 push 합니다.
2. 저장소 **Settings → Pages** → Source를 `main` 브랜치의 `/ (root)`로 설정합니다.
3. `CNAME` 파일에 이미 `paycal.kr`이 들어 있으므로, GitHub이 자동으로 커스텀 도메인을
   인식합니다. (파일을 삭제/수정하면 도메인 연결이 끊어지니 주의하세요.)
4. GitHub Pages 설정 화면에서 **Enforce HTTPS**를 반드시 켜 두세요.

### 4-2. Cloudflare (DNS)

1. Cloudflare에서 `paycal.kr` 도메인의 DNS를 관리합니다.
2. `A` 레코드를 GitHub Pages IP로, 또는 `CNAME` 레코드를 `<username>.github.io`로 설정합니다.
   (GitHub Pages 공식 문서의 최신 IP 목록을 따르세요.)
3. Cloudflare의 프록시(오렌지 클라우드)를 켜두면 CDN 캐싱 + 무료 SSL을 함께 사용할 수
   있습니다. 단, GitHub Pages 자체 HTTPS와 함께 쓸 경우 SSL 모드는 **Full** 이상으로
   설정해야 리디렉션 루프가 발생하지 않습니다.
4. 배포 후 정적 파일(`assets/*`, `sitemap.xml`, `robots.txt`)을 수정했는데 반영이 안 보이면
   Cloudflare 캐시를 퍼지(Purge Cache)하세요.

### 4-3. 배포 후 체크

- `https://paycal.kr/robots.txt` 접속 확인
- `https://paycal.kr/sitemap.xml` 접속 확인
- Search Console에 sitemap 제출: `https://paycal.kr/sitemap.xml`

---

## 5. Google Sheets 연동 (게시글/뉴스)

1. 구글 시트를 새로 만들고, 아래 순서로 컬럼을 구성합니다:

   | id | category | emoji | title | summary | tags | date | content | views |
   |----|----------|-------|-------|---------|------|------|---------|-------|

   - `content`는 마크다운 문법을 지원합니다 (`content.html`이 `marked.js`로 렌더링합니다).
   - `tags`는 쉼표로 구분한 문자열입니다. (`태그1,태그2,태그3`)
2. **파일 → 공유 → 웹에 게시**로 시트를 공개합니다. (일반 "공유" 권한 설정이 아니라
   반드시 "웹에 게시" 메뉴를 사용해야 gviz 엔드포인트가 열립니다.)
3. 시트 URL에서 `/d/`와 `/edit` 사이의 긴 문자열이 `SHEET_ID`입니다.
4. `assets/site.js` 상단의 `SHEET_ID`, `SHEET_NAME`을 실제 값으로 교체합니다. 이 한 곳만
   수정하면 홈(`index.html`), 게시글 상세(`content.html`), sitemap 생성 스크립트에 모두 반영
   됩니다. (단, `scripts/generate_sitemap.py`의 `SHEET_ID`/`SHEET_NAME`도 함께 맞춰주세요 —
   현재는 각 파일에 값이 중복 정의되어 있습니다.)

---

## 6. 방문자 통계 / Apps Script 백엔드 (`admin.html`)

`assets/site.js`의 `WEB_APP_URL`이 가리키는 Google Apps Script 웹앱이 모든 로그
(페이지뷰, 체류시간, 외부 링크 클릭, 계산기 사용, 게시글 조회수)를 시트의 `분석로그` 탭에
적재합니다. `admin.html`은 이 데이터를 대시보드 형태로 보여주고, 게시글을 추가/수정하는
관리자 화면입니다.

- `admin.html`은 `noindex, nofollow`로 설정되어 있어 검색 결과에 노출되지 않습니다.
- **하지만 URL을 아는 사람은 누구나 접근할 수 있는 상태**입니다(로그인/인증 없음). 실제
  운영 데이터가 쌓이기 시작하면 Cloudflare Access, Basic Auth, 또는 별도 로그인 로직 추가를
  권장합니다. (이번 작업 범위에는 포함하지 않았습니다.)

---

## 7. 알려진 제한사항 & 다음 담당자를 위한 TODO

이번 개편은 **UI/UX, SEO 구조, 문서화**에 집중했습니다. 아래 항목은 실데이터 검증이
필요하거나 더 큰 아키텍처 변경이 필요해 이번 범위에서 제외했으니, 우선순위에 따라
진행해 주세요.

1. **⚠️ 세율/보험료 수치의 연도 불일치**: `salary.html`, `year-end-tax.html` 등 일부 페이지의
   본문 내용이 여전히 "2025년 7월 기준", "2025년 귀속" 등 이전 연도 수치를 인용하고 있습니다
   (반면 `minimum-wage.html`은 2026년 수치로 이미 최신화되어 있습니다). 실제 법정 요율/세율
   수치를 다루는 부분이라 임의로 추정해 바꾸지 않았습니다 — 국민연금공단/국세청 등 공식
   자료로 검증 후 업데이트해 주세요.
2. **`content.html`의 SEO 구조적 한계**: 게시글은 `content.html?id=N` 형태의 **같은 파일에
   쿼리스트링만 다른 구조**입니다. 이번 개편으로 `noindex`는 해제했고 JS가 canonical/제목/
   구조화 데이터를 동적으로 채워 넣지만, 근본적으로는 클라이언트 사이드 렌더링(CSR)
   페이지입니다. 구글은 CSR도 렌더링해서 색인하지만, 정적 HTML보다는 불리합니다. 콘텐츠
   마케팅 비중을 늘릴 계획이라면, GitHub Actions에서 시트를 읽어 게시글마다
   `posts/{slug}.html` 정적 파일을 미리 생성(pre-render)하는 방식으로 전환하는 것을 중장기
   과제로 권장합니다.
3. **`sample.html`**: "기업형 데이터 암복호화 관리 시스템"이라는, 이 프로젝트와 무관해 보이는
   콘텐츠입니다. 다른 프로젝트의 산출물이 섞여 들어온 것으로 추정됩니다. 현재는 `robots.txt`
   로 크롤링만 막아둔 상태이며, 실제로 필요 없는 파일이라면 삭제를 권장합니다.
4. **`admin.html` 인증 부재**: 위 6번 항목 참고.
5. **GA4 / AdSense 스크립트 미연결**: `index.html` 등에 자리(플레이스홀더)만 마련되어 있고
   실제 측정 ID는 비어 있습니다. 배포 전 `G-XXXXXXXXXX`, `ca-pub-XXXXXXXXXXXXXXXX` 부분을
   실제 값으로 교체하세요. (`ads.txt`에는 이미 실제 게시자 ID가 들어 있습니다.)
6. **`SHEET_ID` 중복 정의**: `assets/site.js`와 `scripts/generate_sitemap.py` 양쪽에 같은 값이
   따로 적혀 있습니다. 시트를 교체할 경우 두 곳 모두 수정해야 합니다.

---

## 8. 디자인 시스템 요약

"급여명세서 / 사내 장부" 컨셉을 그대로 유지했습니다 (세리프 헤드라인 + 모노스페이스 숫자
+ 종이 질감 배경 + 도장 느낌의 포인트 컬러). 직장인 대상 급여·노무 계산기라는 주제와
잘 맞고, 일반적인 SaaS 템플릿과 차별화되어 신뢰감을 준다고 판단해 큰 골격은 손대지
않았습니다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--paper` | `#ECEFE3` | 배경 (장부 종이) |
| `--surface` | `#FFFFFF` | 카드/입력 표면 |
| `--ink` | `#20283D` | 본문 텍스트 (짙은 네이비) |
| `--ink-soft` | `#5B6478` | 보조 텍스트 |
| `--ink-faint` | `#616B80` (개편 전 `#8A93A3`, 명암비 개선) | 보조/타임스탬프 텍스트 |
| `--stamp` | `#B23A2D` | 포인트 컬러 (도장 레드), 버튼/강조 |
| `--gold` | `#93711C` | 핵심 숫자 강조 |
| 헤드라인 폰트 | Noto Serif KR | 브랜드/타이틀 |
| 본문 폰트 | Pretendard | 본문 전반 |
| 숫자 폰트 | IBM Plex Mono | 계산 결과, 통계, 라벨 |

새 페이지를 추가할 때는 기존 계산기 페이지(`salary.html` 등)의 `<style>` 블록을 복사해서
시작하면 디자인 일관성을 쉽게 맞출 수 있습니다.
