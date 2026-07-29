/* ============================================================
   THEME.JS — 공통 마이크로 인터랙션 & UI 컴포넌트
   2026-07 UI/UX 개편. 계산 로직에는 전혀 관여하지 않으며,
   화면 표현(프레젠테이션) 레이어만 담당합니다.
   ============================================================ */
window.PayCal = (function(){
  "use strict";

  /* ---------- 0. 햅틱 피드백 ---------- */
  function haptic(ms){
    try{ if (navigator.vibrate) navigator.vibrate(ms || 8); }catch(e){}
  }

  /* ---------- 1. Quick-Add 칩: 입력값에 금액 더하기 ---------- */
  function chipAdd(inputId, amount){
    const el = document.getElementById(inputId);
    if(!el) return;
    haptic(8);
    const current = parseInt(String(el.value).replace(/[^0-9]/g,'') || '0', 10);
    const next = amount === 0 ? 0 : current + amount;
    el.value = next === 0 ? '' : next.toLocaleString('ko-KR');
    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.focus({ preventScroll:true });
  }

  /* ---------- 2. 토글 스위치: select 값과 시각 상태 동기화 ---------- */
  function initToggles(){
    document.querySelectorAll('.toggle-switch[data-for]').forEach(function(group){
      const targetId = group.getAttribute('data-for');
      const select = document.getElementById(targetId);
      if(!select) return;
      const buttons = Array.prototype.slice.call(group.querySelectorAll('button'));
      function sync(){
        buttons.forEach(function(b){ b.classList.toggle('active', b.dataset.val === select.value); });
      }
      buttons.forEach(function(btn){
        btn.addEventListener('click', function(){
          haptic(8);
          select.value = btn.dataset.val;
          select.dispatchEvent(new Event('change', { bubbles:true }));
          sync();
        });
      });
      sync();
    });
  }

  /* ---------- 3. 숫자 카운트업 애니메이션 ---------- */
  function countUp(el, finalText, duration){
    if(!el) return;
    duration = duration || 700;
    const match = String(finalText).match(/^(-?)([0-9,]+)(.*)$/);
    if(!match){ el.textContent = finalText; return; }
    const sign = match[1];
    const finalNum = parseInt(match[2].replace(/,/g,''), 10) || 0;
    const suffix = match[3];
    const startTime = performance.now();
    function tick(now){
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
      const val = Math.round(finalNum * eased);
      el.textContent = sign + val.toLocaleString('ko-KR') + suffix;
      if(p < 1) requestAnimationFrame(tick);
      else el.textContent = sign + finalNum.toLocaleString('ko-KR') + suffix;
    }
    requestAnimationFrame(tick);
  }
  // data-count-final 속성이 있는 요소를 자동으로 카운트업 (renderResult 이후 호출)
  function runAutoCountUp(scopeEl){
    (scopeEl || document).querySelectorAll('.count-target').forEach(function(el){
      const finalText = el.textContent;
      countUp(el, finalText);
    });
  }

  /* ---------- 4. 도넛 차트 (conic-gradient) ---------- */
  // slices: [{label, value, color}], centerLabel/centerSub: 중앙 텍스트
  function renderDonut(container, slices, centerPct, centerSub){
    if(!container) return;
    const total = slices.reduce(function(s,x){ return s + Math.max(x.value,0); }, 0) || 1;
    let acc = 0;
    const stops = slices.map(function(s){
      const start = (acc/total)*360;
      acc += Math.max(s.value,0);
      const end = (acc/total)*360;
      return s.color + ' ' + start.toFixed(2) + 'deg ' + end.toFixed(2) + 'deg';
    }).join(', ');

    const legendHtml = slices.map(function(s){
      const pct = Math.round((Math.max(s.value,0)/total)*100);
      return '<div class="donut-legend-item"><span class="swatch" style="background:'+s.color+'"></span>'
           + '<span>'+s.label+'</span><span class="amt">'+pct+'%</span></div>';
    }).join('');

    container.innerHTML =
      '<div class="donut-wrap">'
      + '<div class="donut" style="background:conic-gradient('+stops+')">'
      +   '<div class="donut-center"><span class="pct">'+(centerPct||'')+'</span><span class="txt">'+(centerSub||'')+'</span></div>'
      + '</div>'
      + '<div class="donut-legend">'+legendHtml+'</div>'
      + '</div>';

    // 진입 애니메이션: 0%에서 실제 값까지 부드럽게
    const donutEl = container.querySelector('.donut');
    if(donutEl){
      donutEl.style.background = 'conic-gradient(' + slices.map(function(s){ return s.color + ' 0deg 0deg'; }).join(', ') + ')';
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ donutEl.style.background = 'conic-gradient('+stops+')'; });
      });
    }
  }

  /* ---------- 5. 아코디언 ---------- */
  function initAccordions(scopeEl){
    (scopeEl || document).querySelectorAll('.accordion').forEach(function(acc){
      const toggle = acc.querySelector('.accordion-toggle');
      if(!toggle || toggle.dataset.bound) return;
      toggle.dataset.bound = '1';
      toggle.addEventListener('click', function(){
        haptic(6);
        acc.classList.toggle('open');
      });
    });
  }

  /* ---------- 6. 결과 공유 바 (이미지 저장 / 공유) ---------- */
  let toastTimer = null;
  function showToast(msg){
    let toast = document.querySelector('.share-toast');
    if(!toast){
      toast = document.createElement('div');
      toast.className = 'share-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 2200);
  }

  function initShareBar(scopeEl){
    const root = scopeEl || document;
    const saveBtn = root.querySelector('.share-save');
    const kakaoBtn = root.querySelector('.share-kakao');

    if(saveBtn && !saveBtn.dataset.bound){
      saveBtn.dataset.bound = '1';
      saveBtn.addEventListener('click', function(){
        haptic(10);
        const target = document.getElementById('resultCard') || document.querySelector('.result-card');
        if(!target){ return; }
        if(window.html2canvas){
          html2canvas(target, { backgroundColor:'#ffffff', scale:2 }).then(function(canvas){
            const link = document.createElement('a');
            link.download = '계산결과.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
          }).catch(function(){ showToast('이미지 생성에 실패했어요. 스크린샷으로 저장해보세요 🙏'); });
        } else {
          showToast('이미지 저장을 준비할 수 없어요. 스크린샷으로 저장해주세요 🙏');
        }
      });
    }

    if(kakaoBtn && !kakaoBtn.dataset.bound){
      kakaoBtn.dataset.bound = '1';
      kakaoBtn.addEventListener('click', function(){
        haptic(10);
        const shareData = {
          title: document.title,
          text: '내 계산 결과를 확인해보세요!',
          url: location.href
        };
        if(navigator.share){
          navigator.share(shareData).catch(function(){});
        } else if(navigator.clipboard){
          navigator.clipboard.writeText(location.href).then(function(){
            showToast('링크를 복사했어요. 카카오톡에 붙여넣기 해주세요 💬');
          }).catch(function(){ showToast('공유하기를 지원하지 않는 브라우저예요.'); });
        } else {
          showToast('공유하기를 지원하지 않는 브라우저예요.');
        }
      });
    }
  }

  /* ---------- 7. 초기화 ---------- */
  function init(){
    initToggles();
    initAccordions();
    initShareBar();
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    haptic: haptic,
    chipAdd: chipAdd,
    initToggles: initToggles,
    countUp: countUp,
    runAutoCountUp: runAutoCountUp,
    renderDonut: renderDonut,
    initAccordions: initAccordions,
    initShareBar: initShareBar,
    showToast: showToast
  };
})();
