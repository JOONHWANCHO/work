/* ============================================================
   공통 스크립트 — 모두의 계산기
   - 뷰(조회수) 트래킹 & Google Sheets(Apps Script) 공용 헬퍼
   - 관리자 페이지와 각 계산기 페이지에서 공통으로 사용합니다.
   ============================================================ */
window.SITE = (function(){
  "use strict";

  // ⚠️ admin.html에서 안내하는 Google Apps Script 배포 후 발급받는 웹앱 URL을
  //    아래 WEB_APP_URL 한 곳에만 넣으면 전체 사이트(계산기 페이지 + 관리자 페이지)에 반영됩니다.
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxyXCLxustkIVkh2e4k2RiAglh4seTFzQJStbjK5Jy0d_wzDk7ZIwbzBCakOJ5SQRs/exec";
  const SHEET_ID   = "1jMKkYQcUZP8DPeMv1dZbM8PIe3HxoInTvmiD3lEVsj4";
  const SHEET_NAME = "시트1";

  // 같은 브라우저에서 같은 글을 반복 조회해도 조회수가 과도하게 증가하지 않도록
  // 세션당 1회만 카운트합니다.
  function alreadyViewed(id){
    try{
      const key = 'viewed_' + id;
      if (sessionStorage.getItem(key)) return true;
      sessionStorage.setItem(key, '1');
      return false;
    }catch(e){ return false; }
  }

  // 조회수 증가 요청 (실패해도 화면엔 영향 없음 — fire & forget)
  function trackView(id){
    if (!id || alreadyViewed(id)) return;
    if (!WEB_APP_URL) return;
    fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({ action: "incrementView", id: id })
    }).catch(()=>{ /* 네트워크 오류는 조용히 무시 */ });
  }

  return { WEB_APP_URL, SHEET_ID, SHEET_NAME, trackView, alreadyViewed };
})();
