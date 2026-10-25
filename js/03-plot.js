'use strict';
/* ================= FreqPlot ================= */
const FREQS=Array.from({length:260},(_,i)=>20*Math.pow(1000,i/259));
const FREQ_F32=new Float32Array(FREQS);
const ZONES=[['SUB',20,60],['BASS',60,250],['LOW-MID',250,500],['MID',500,2000],['UPPER-MID',2000,4000],['PRESENCE',4000,6000],['TREBLE',6000,12000],['AIR',12000,20000]];
const FGRID=[[20,'20'],[50,'50'],[100,'100'],[200,'200'],[500,'500'],[1000,'1k'],[2000,'2k'],[5000,'5k'],[10000,'10k'],[20000,'20k']];
const plots=[];
class FreqPlot{
  constructor(cv,o){
    this.cv=cv;this.o=Object.assign({range:[-18,18],step:6,axis:true,zones:true,spec:true,hi:[],marks:[],curve:null,hint:'Tekan Putar untuk melihat spektrum langsung'},o);
    this.vis=true;this.buf=null;plots.push(this);
    new ResizeObserver(()=>this.resize()).observe(cv);
    if('IntersectionObserver' in window)new IntersectionObserver(e=>{this.vis=e[0].isIntersecting},{rootMargin:'120px'}).observe(cv);
    this.resize();
  }
  resize(){const r=this.cv.getBoundingClientRect();this.d=Math.min(2,window.devicePixelRatio||1);this.w=r.width;this.h=r.height;this.cv.width=Math.max(1,Math.round(r.width*this.d));this.cv.height=Math.max(1,Math.round(r.height*this.d))}
  X(f){return this.pl+(Math.log10(f)-1.30103)/3*(this.w-this.pl-this.pr)}
  draw(){
    const c=this.cv.getContext('2d'),o=this.o,T=theme,w=this.w,h=this.h;
    if(w<2)return;
    c.setTransform(this.d,0,0,this.d,0,0);c.clearRect(0,0,w,h);
    this.pl=o.axis?36:8;this.pr=10;
    const top=o.zones?26:8,bot=h-20,[lo,hi]=o.range;
    const Y=db=>bot-(db-lo)/(hi-lo)*(bot-top);
    if(o.zones){
      c.font='500 9px "JetBrains Mono",monospace';c.textAlign='center';c.textBaseline='middle';
      ZONES.forEach((z,i)=>{const x1=this.X(z[1]),x2=this.X(z[2]);
        if(i%2===0){c.fillStyle=T.shade;c.fillRect(x1,top,x2-x1,bot-top)}
        if(c.measureText(z[0]).width+6<x2-x1){c.fillStyle=T.ink2;c.fillText(z[0],(x1+x2)/2,14)}});
    }
    o.hi.forEach(([a,b])=>{const x1=this.X(a),x2=this.X(b);c.fillStyle=T.signalSoft;c.fillRect(x1,top,x2-x1,bot-top);c.fillStyle=T.signal;c.fillRect(x1,top,x2-x1,2)});
    c.strokeStyle=T.line;c.lineWidth=1;c.fillStyle=T.ink2;c.font='500 9.5px "JetBrains Mono",monospace';c.textAlign='center';c.textBaseline='top';
    FGRID.forEach(([f,l])=>{const x=this.X(f);c.globalAlpha=.7;c.beginPath();c.moveTo(x,top);c.lineTo(x,bot);c.stroke();c.globalAlpha=1;c.fillText(l,clamp(x,14,w-12),bot+5)});
    if(o.axis){
      c.textAlign='right';c.textBaseline='middle';
      for(let db=Math.ceil(lo/o.step)*o.step;db<=hi;db+=o.step){const y=Y(db);c.globalAlpha=db===0?1:.6;c.strokeStyle=db===0?T.ink2:T.line;c.beginPath();c.moveTo(this.pl,y);c.lineTo(w-this.pr,y);c.stroke();c.globalAlpha=1;c.fillText((db>0?'+':'')+db,this.pl-5,y)}
    }
    const live=busy.size>0&&ctx&&G&&ctx.state==='running';
    if(o.spec&&live){
      const an=G.an,n=an.frequencyBinCount;if(!this.buf||this.buf.length!==n)this.buf=new Float32Array(n);
      an.getFloatFrequencyData(this.buf);const ny=ctx.sampleRate/2;
      c.beginPath();c.moveTo(this.pl,bot);
      for(let x=this.pl;x<=w-this.pr;x+=2){
        const f1=Math.pow(10,1.30103+3*(x-1-this.pl)/(w-this.pl-this.pr)),f2=Math.pow(10,1.30103+3*(x+1-this.pl)/(w-this.pl-this.pr));
        let i1=Math.max(0,Math.floor(f1/ny*n)),i2=Math.min(n-1,Math.ceil(f2/ny*n)),m=-120;
        for(let i=i1;i<=i2;i++)if(this.buf[i]>m)m=this.buf[i];
        c.lineTo(x,bot-clamp((m+95)/62,0,1)*(bot-top)*.92);
      }
      c.lineTo(w-this.pr,bot);c.closePath();c.globalAlpha=.3;c.fillStyle=T.accent;c.fill();c.globalAlpha=1;
      c.strokeStyle=T.accent;c.lineWidth=1.2;c.stroke();
    }else if(o.hint){c.fillStyle=T.ink2;c.font='500 11px "JetBrains Mono",monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(o.hint,(this.pl+w-this.pr)/2,(top+bot)/2)}
    if(o.curve){
      const cv=o.curve();c.beginPath();
      for(let i=0;i<cv.length;i++){const x=this.X(FREQS[i]),y=clamp(Y(cv[i]),top,bot);i?c.lineTo(x,y):c.moveTo(x,y)}
      c.strokeStyle=T.signal;c.lineWidth=2.4;c.lineJoin='round';c.stroke();
    }
    o.marks.forEach(mk=>{const x=this.X(mk.f);c.strokeStyle=mk.c||T.ink;c.lineWidth=1.2;c.setLineDash([4,4]);c.beginPath();c.moveTo(x,top);c.lineTo(x,bot);c.stroke();c.setLineDash([]);
      if(mk.label){c.fillStyle=mk.c||T.ink;c.font='600 10px "JetBrains Mono",monospace';c.textBaseline='top';c.textAlign=x>w-60?'right':'left';c.fillText(mk.label,x+(x>w-60?-4:4),top+3)}});
    c.strokeStyle=T.line;c.lineWidth=1;c.strokeRect(this.pl,top,w-this.pl-this.pr,bot-top);
  }
}
(function loop(){plots.forEach(p=>{if(p.vis)p.draw()});requestAnimationFrame(loop)})();

/* respons filter bayangan (tanpa perlu audio berjalan) */
const calc=(()=>{try{return new OfflineAudioContext(1,128,48000)}catch(e){return null}})();
const shadow=calc?{
  eq:EQ_BANDS.map(b=>{const f=calc.createBiquadFilter();f.type=b.type;f.frequency.value=b.f;f.Q.value=b.q;return f}),
  lp:[0,1].map(()=>{const f=calc.createBiquadFilter();f.type='lowpass';f.frequency.value=XO_F;f.Q.value=BUTTER_Q;return f}),
  hp:[0,1].map(()=>{const f=calc.createBiquadFilter();f.type='highpass';f.frequency.value=XO_F;f.Q.value=BUTTER_Q;return f}),
  pk:(()=>{const f=calc.createBiquadFilter();f.type='peaking';f.Q.value=2.5;f.gain.value=9;return f})()
}:null;
function resp(node,freqs){const m=new Float32Array(freqs.length),p=new Float32Array(freqs.length);node.getFrequencyResponse(freqs,m,p);return {m,p}}
function eqCurve(){
  const out=new Float32Array(FREQS.length);if(!shadow)return out;
  shadow.eq.forEach((f,i)=>{f.gain.value=P.eq[i];const r=resp(f,FREQ_F32);for(let k=0;k<out.length;k++)out[k]+=20*Math.log10(r.m[k])});
  return out;
}
let xoStatic=null;
function xoCurve(){
  const n=FREQS.length,out=new Float32Array(n);if(!shadow)return out;
  if(!xoStatic){const a=shadow.lp.map(f=>resp(f,FREQ_F32)),b=shadow.hp.map(f=>resp(f,FREQ_F32));xoStatic={a,b}}
  const {a,b}=xoStatic,x=P.xo,g=dB(x.hi)*(x.pol?-1:1),tau=x.delay/1000;
  for(let k=0;k<n;k++){
    const ml=a[0].m[k]*a[1].m[k],pl=a[0].p[k]+a[1].p[k],mh=b[0].m[k]*b[1].m[k]*g,ph=b[0].p[k]+b[1].p[k]-2*Math.PI*FREQS[k]*tau;
    const re=ml*Math.cos(pl)+mh*Math.cos(ph),im=ml*Math.sin(pl)+mh*Math.sin(ph);
    out[k]=20*Math.log10(Math.max(Math.hypot(re,im),1e-4));
  }
  return out;
}
