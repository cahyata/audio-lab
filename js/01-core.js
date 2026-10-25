'use strict';
/* ================= helpers ================= */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const dB=x=>Math.pow(10,x/20);
const fmtTime=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const fmt=(v,d=1)=>v.toFixed(d).replace('.',',');
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
function chipRow(el,items,onPick){
  el.innerHTML='';
  items.forEach(([k,label])=>{const b=document.createElement('button');b.className='chip';b.dataset.k=k;b.textContent=label;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>onPick(k));el.appendChild(b)});
}
function markChip(el,key){$$('.chip',el).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===String(key))))}

/* theme */
const theme={};
function readTheme(){
  const s=getComputedStyle(document.documentElement),g=n=>s.getPropertyValue(n).trim();
  theme.bg=g('--bg');theme.panel=g('--panel');theme.ink=g('--ink');theme.ink2=g('--ink2');theme.line=g('--line');theme.shade=g('--shade');
  theme.accent=g('--accent');theme.accentSoft=g('--accent-soft');theme.signal=g('--signal');theme.signalSoft=g('--signal-soft');
}
const redrawers=[];
function onTheme(){readTheme();redrawers.forEach(f=>f())}
readTheme();
new MutationObserver(onTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',onTheme)}catch(e){}
function autoCanvas(cv,draw){
  const f=()=>{const r=cv.getBoundingClientRect();if(r.width<2)return;const d=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,r.width,r.height);draw(c,r.width,r.height)};
  new ResizeObserver(f).observe(cv);redrawers.push(f);return f;
}

/* ================= state ================= */
const DEF=()=>({eq:Array(9).fill(0),width:.7,depth:.25,sep:1,enc:'none',noise:0,xo:{on:false,delay:0,pol:false,hi:0}});
const P=Object.assign(DEF(),{vol:.35,owner:null,mute:{vox:false,drums:false,bass:false,pad:false}});
const MODES={eq:'Peta karakter suara',stage:'Soundstage dan separation',enc:'Open / closed-back',xo:'Koheren driver'};
const EQ_BANDS=[
  {f:60,type:'lowshelf',q:.7,label:'60'},{f:150,type:'peaking',q:1,label:'150'},{f:300,type:'peaking',q:1.1,label:'300'},
  {f:600,type:'peaking',q:1.2,label:'600'},{f:1200,type:'peaking',q:1,label:'1,2k'},{f:2800,type:'peaking',q:1.3,label:'2,8k'},
  {f:5000,type:'peaking',q:1.6,label:'5k'},{f:7500,type:'peaking',q:2,label:'7,5k'},{f:12000,type:'highshelf',q:.7,label:'12k'}
];
const BUS=[
  {n:'vox',pan:0,send:.5},{n:'kick',pan:0,send:0},{n:'snare',pan:.18,send:.6},{n:'hat',pan:.6,send:.35},
  {n:'bass',pan:-.12,send:0},{n:'padL',pan:-1,send:.9},{n:'padR',pan:1,send:.9}
];
const ENC={
  none:{w:1,dm:1,da:0,bass:0,leak:.4},
  closed:{w:.7,dm:.6,da:0,bass:3,leak:.06},
  open:{w:1.25,dm:1,da:.12,bass:-1.5,leak:.75}
};
const XO_F=2500, BUTTER_Q=-3.0103; /* Q lowpass/highpass WebAudio dalam dB */
const MIX={kick:.9,snare:.45,hat:.16,bass:.22,pad:.08,vox:.8,sib:.12};
