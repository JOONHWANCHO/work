/* ============================================================
   공통 스크립트 — 모두의 계산기
   1) 게시글 조회수 트래킹
   2) 방문자·트래픽·수익 관련 행동 데이터 수집 (SITE.Analytics)
   Google Apps Script 웹앱(WEB_APP_URL) 한 곳으로 모든 데이터가 모입니다.
   ============================================================ */
window.SITE = (function () {
  "use strict";

  // ⚠️ admin.html 안내를 따라 Apps Script를 배포한 뒤 발급받은 웹앱 URL을
  //    아래 한 곳에만 넣으면 전체 사이트(계산기 + 게시글 + 관리자)에 반영됩니다.
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzGppmgMoCHUF4zrEQb6aYzXS2uONluMhjrQr-nNmEFbDHTM2n4R3bM0_4CgvdKuGyU/exec";
  const SHEET_ID          = "1jMKkYQcUZP8DPeMv1dZbM8PIe3HxoInTvmiD3lEVsj4"; // 게시글(콘텐츠) 시트
  const SHEET_NAME         = "시트1";     // 게시글 탭 이름
  const ANALYTICS_SHEET    = "분석로그";  // 방문자/행동 로그가 쌓이는 탭 이름 (Apps Script가 자동 생성)

  /* ---------------------------------------------------------
     공용 유틸
     --------------------------------------------------------- */
  function safeGet(store, key){ try { return store.getItem(key); } catch(e){ return null; } }
  function safeSet(store, key, val){ try { store.setItem(key, val); } catch(e){} }

  function uid(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // 방문자 ID: 브라우저에 영구 저장 (재방문 여부 판별용, 개인식별정보 아님)
  function getVisitorId(){
    let id = safeGet(localStorage, 'pc_visitor_id');
    let isNew = false;
    if (!id) { id = uid(); safeSet(localStorage, 'pc_visitor_id', id); isNew = true; }
    return { id, isNew };
  }

  // 세션 ID: 탭을 닫거나 브라우저를 재시작하면 새로 발급 (1회 방문 단위)
  function getSessionId(){
    let id = safeGet(sessionStorage, 'pc_session_id');
    let isNewSession = false;
    if (!id) {
      id = uid();
      safeSet(sessionStorage, 'pc_session_id', id);
      safeSet(sessionStorage, 'pc_session_start', String(Date.now()));
      isNewSession = true;
    }
    return { id, isNewSession };
  }

  // 세션 내 첫 방문 페이지(랜딩 페이지) — 세션당 1회만 기록
  function getEntryPage(currentPath){
    let entry = safeGet(sessionStorage, 'pc_entry_page');
    if (!entry) { entry = currentPath; safeSet(sessionStorage, 'pc_entry_page', entry); }
    return entry;
  }

  /* ---------------------------------------------------------
     UA 파싱 — 디바이스 / 브라우저 / OS
     --------------------------------------------------------- */
  function parseUA(){
    const ua = navigator.userAgent || '';
    let device = 'desktop';
    if (/iPad|Tablet|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) device = 'tablet';
    else if (/Mobi|iPhone|Android/i.test(ua)) device = 'mobile';

    let browser = 'Other';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
    else if (/Chrome\//i.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/KAKAOTALK/i.test(ua)) browser = 'KakaoTalk 인앱';
    else if (/NAVER/i.test(ua)) browser = '네이버 인앱';

    let os = 'Other';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    return { device, browser, os };
  }

  /* ---------------------------------------------------------
     유입 경로(트래픽 소스) 분류
     --------------------------------------------------------- */
  function parseTrafficSource(){
    const params = new URLSearchParams(location.search);
    const utmSource = params.get('utm_source') || '';
    const utmMedium = params.get('utm_medium') || '';
    const utmCampaign = params.get('utm_campaign') || '';
    if (utmSource) return { source: utmSource, medium: utmMedium || 'campaign', campaign: utmCampaign };

    const ref = document.referrer;
    if (!ref) return { source: '직접 유입', medium: 'direct', campaign: '' };

    try {
      const host = new URL(ref).hostname.replace('www.', '');
      if (host === location.hostname) return { source: '내부 이동', medium: 'internal', campaign: '' };
      if (/google\./.test(host)) return { source: 'Google', medium: 'organic', campaign: '' };
      if (/naver\.com/.test(host)) return { source: 'Naver', medium: 'organic', campaign: '' };
      if (/daum\.net|kakao\.com/.test(host)) return { source: 'Daum/Kakao', medium: 'organic', campaign: '' };
      if (/bing\.com/.test(host)) return { source: 'Bing', medium: 'organic', campaign: '' };
      if (/facebook\.com|instagram\.com|threads\.net/.test(host)) return { source: 'Meta(SNS)', medium: 'social', campaign: '' };
      if (/twitter\.com|x\.com/.test(host)) return { source: 'X(Twitter)', medium: 'social', campaign: '' };
      if (/t\.co/.test(host)) return { source: 'X(Twitter)', medium: 'social', campaign: '' };
      if (/band\.us/.test(host)) return { source: '밴드', medium: 'social', campaign: '' };
      return { source: host, medium: 'referral', campaign: '' };
    } catch (e) {
      return { source: '기타', medium: 'referral', campaign: '' };
    }
  }

  /* ---------------------------------------------------------
     국가 추정 — 무료 IP 지오로케이션 (세션당 1회만 조회, 실패해도 무시)
     --------------------------------------------------------- */
  function getCountry(){
    return new Promise((resolve) => {
      const cached = safeGet(sessionStorage, 'pc_country');
      if (cached) { resolve(cached); return; }
      fetch('https://ipapi.co/json/', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const country = (data && (data.country_name || data.country)) || 'Unknown';
          safeSet(sessionStorage, 'pc_country', country);
          resolve(country);
        })
        .catch(() => resolve('Unknown'));
    });
  }

  /* ---------------------------------------------------------
     서버(Apps Script)로 이벤트 전송
     --------------------------------------------------------- */
  function sendLog(payload, useBeacon){
    if (!WEB_APP_URL) return;
    const body = JSON.stringify(Object.assign({ action: 'logEvent' }, payload));
    if (useBeacon && navigator.sendBeacon) {
      try {
        const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
        navigator.sendBeacon(WEB_APP_URL, blob);
        return;
      } catch (e) { /* fallback to fetch below */ }
    }
    fetch(WEB_APP_URL, { method: 'POST', body, keepalive: true }).catch(() => {});
  }

  /* ---------------------------------------------------------
     조회수(게시글) 트래킹 — 세션당 1회
     --------------------------------------------------------- */
  function alreadyViewed(id){
    try {
      const key = 'viewed_' + id;
      if (sessionStorage.getItem(key)) return true;
      sessionStorage.setItem(key, '1');
      return false;
    } catch (e) { return false; }
  }

  function trackView(id){
    if (!id || alreadyViewed(id)) return;
    if (!WEB_APP_URL) return;
    fetch(WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'incrementView', id: id })
    }).catch(() => {});
  }

  /* ---------------------------------------------------------
     Analytics — 페이지뷰 / 체류시간 / 이탈 / 클릭 이벤트
     --------------------------------------------------------- */
  let pageLoadTime = Date.now();
  let navigatedAway = false; // 사이트 내부 링크 클릭으로 이동하는 경우 true

  function currentPath(){ return location.pathname.replace(/^.*\//, '') || 'index.html'; }

  function trackPageview(){
    const { id: visitorId, isNew: isNewVisitor } = getVisitorId();
    const { id: sessionId } = getSessionId();
    const path = currentPath();
    const entryPage = getEntryPage(path);
    const { device, browser, os } = parseUA();
    const { source, medium, campaign } = parseTrafficSource();

    getCountry().then((country) => {
      sendLog({
        event_type: 'pageview',
        session_id: sessionId,
        visitor_id: visitorId,
        is_new_visitor: isNewVisitor ? 'Y' : 'N',
        page_path: path,
        page_title: document.title,
        referrer: document.referrer || '',
        traffic_source: source,
        utm_medium: medium,
        utm_campaign: campaign,
        device_type: device,
        browser: browser,
        os: os,
        country: country,
        entry_page: entryPage,
        duration_sec: '',
        exit_type: '',
        target_url: '',
        timestamp: new Date().toISOString()
      });
    });

    // 이탈/이동 시 체류시간 전송
    function sendEnd(){
      const durationSec = Math.max(0, Math.round((Date.now() - pageLoadTime) / 1000));
      sendLog({
        event_type: 'pageview_end',
        session_id: sessionId,
        visitor_id: visitorId,
        page_path: path,
        duration_sec: durationSec,
        exit_type: navigatedAway ? '내부 이동' : '이탈(종료)',
        timestamp: new Date().toISOString()
      }, true);
    }
    document.addEventListener('visibilitychange', function(){
      if (document.visibilityState === 'hidden') sendEnd();
    });
    window.addEventListener('pagehide', sendEnd);

    // 내부 링크 클릭 시 "이탈"이 아닌 "내부 이동"으로 표시
    document.addEventListener('click', function(e){
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      let isExternal = false;
      try { isExternal = new URL(href, location.href).hostname !== location.hostname; } catch(e){}
      if (isExternal) {
        trackOutboundClick(href, a);
      } else {
        navigatedAway = true;
      }
    }, true);
  }

  // 광고/제휴/외부 링크 클릭 — 수익 관련 핵심 데이터
  function trackOutboundClick(url, el){
    let category = '외부 링크';
    const u = url.toLowerCase();
    if (/coupang|amazon|link\.aliexpress|11st|gmarket|shop|store/.test(u)) category = '제휴(어필리에이트)';
    else if (/googlesyndication|googleads|doubleclick|adsystem/.test(u)) category = '광고(AdSense)';
    else if (/nps\.or\.kr|nhis\.or\.kr|ei\.go\.kr|hometax\.go\.kr|moel\.go\.kr|work24\.go\.kr/.test(u)) category = '공공기관 참고링크';

    const { id: visitorId } = getVisitorId();
    const { id: sessionId } = getSessionId();
    sendLog({
      event_type: 'outbound_click',
      session_id: sessionId,
      visitor_id: visitorId,
      page_path: currentPath(),
      target_url: url,
      link_category: category,
      timestamp: new Date().toISOString()
    });
  }

  // 계산기 "계산하기" 버튼 클릭 — 참여도/전환 데이터
  function trackCalculatorUse(){
    const btn = document.getElementById('calcBtn');
    if (!btn) return;
    btn.addEventListener('click', function(){
      const { id: visitorId } = getVisitorId();
      const { id: sessionId } = getSessionId();
      sendLog({
        event_type: 'calculator_use',
        session_id: sessionId,
        visitor_id: visitorId,
        page_path: currentPath(),
        calculator_name: document.title.split('|')[0].trim(),
        timestamp: new Date().toISOString()
      });
    });
  }

  function initAnalytics(){
    if (window.SITE_NO_TRACK) return; // 관리자 페이지 등에서 트래킹 제외
    try {
      pageLoadTime = Date.now();
      trackPageview();
      trackCalculatorUse();
    } catch (e) { /* 트래킹 실패는 화면에 영향 없음 */ }
  }

  // DOM 준비 후 자동 시작 (모든 페이지 공통)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnalytics);
  } else {
    initAnalytics();
  }

  return {
    WEB_APP_URL, SHEET_ID, SHEET_NAME, ANALYTICS_SHEET,
    trackView, alreadyViewed,
    trackEvent: function(name, data){ sendLog(Object.assign({ event_type: name }, data || {})); },
    trackOutboundClick
  };
})();
