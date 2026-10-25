'use strict';
/* ================= navigasi samping + scroll-spy ================= */
(function(){
  const nav=$('.nav'),ind=$('#navInd'),links=$$('a',nav),map=new Map();
  $$('.nav>*').forEach((el,i)=>el.style.setProperty('--i',i));
  const secs=links.map(a=>{const s=$(a.getAttribute('href'));if(s)map.set(s,a);return s}).filter(Boolean);
  let cur=null;
  const brand=$('#navBrand'),toTop=()=>window.scrollTo({top:0,behavior:'smooth'});
  brand.addEventListener('click',toTop);
  brand.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toTop()}});
  const wide=()=>window.matchMedia('(min-width:1000px)').matches;
  function place(a){
    if(wide()){ind.style.opacity=a?1:0;if(a){ind.style.height=a.offsetHeight+'px';ind.style.transform='translateY('+a.offsetTop+'px)'}}
  }
  function set(a){
    if(a===cur)return;cur=a;
    links.forEach(l=>{l.classList.toggle('on',l===a);if(l===a)l.setAttribute('aria-current','true');else l.removeAttribute('aria-current')});
    place(a);
    if(a){
      if(wide()){const r=a.getBoundingClientRect(),nr=nav.getBoundingClientRect();if(r.top<nr.top+40||r.bottom>nr.bottom-120)nav.scrollTo({top:a.offsetTop-nav.clientHeight/2,behavior:'smooth'})}
      else nav.scrollTo({left:a.offsetLeft-nav.clientWidth/2+a.offsetWidth/2,behavior:'smooth'});
    }
  }
  let tick=false;
  function spy(){
    tick=false;let best=null;
    const line=window.innerHeight*.3;
    secs.forEach(s=>{if(!s.hidden&&s.getBoundingClientRect().top<=line)best=s});
    set(best?map.get(best):null);
  }
  window.addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(spy)}},{passive:true});
  window.addEventListener('resize',()=>{const c=cur;cur=undefined;set(c)});
  spy();
})();

/* tautan #bagian: gulung ke tujuan tanpa menambah # di URL */
document.addEventListener('click',e=>{
  if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey)return;
  const a=e.target.closest('a[href^="#"]');if(!a)return;
  const el=document.getElementById(a.getAttribute('href').slice(1));if(!el)return;
  e.preventDefault();el.scrollIntoView({behavior:'smooth'});
});
try{if(location.hash)history.replaceState(null,'',location.pathname+location.search)}catch(e){}

/* ================= sinkronisasi ================= */
function syncAll(){syncPeta();syncStage();syncEnc();syncXo();syncTransport()}
syncAll();renderMP();
