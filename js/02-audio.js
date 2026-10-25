'use strict';
/* ================= audio core ================= */
let ctx=null,G=null;
const busy=new Set();
const stoppers=new Map();
function claim(name){stoppers.forEach((fn,k)=>{if(k!==name)fn()})}

const noiseCache=new WeakMap();
function getNoise(c){let b=noiseCache.get(c);if(!b){b=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;noiseCache.set(c,b)}return b}
function makeIR(c,sec=1.8){
  const n=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,n,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0;for(let i=0;i<n;i++){const t=i/n,env=Math.pow(1-t,3.2),k=lerp(.65,.12,t);lp+=k*((Math.random()*2-1)-lp);d[i]=lp*env*(i<c.sampleRate*.012?0:1)}}
  return b;
}
function buildGraph(c){
  const g={};
  g.master=c.createGain();
  g.lim=c.createDynamicsCompressor();g.lim.threshold.value=-8;g.lim.knee.value=6;g.lim.ratio.value=14;g.lim.attack.value=.003;g.lim.release.value=.12;
  g.an=c.createAnalyser();g.an.fftSize=4096;g.an.smoothingTimeConstant=.8;
  g.master.connect(g.lim);g.lim.connect(g.an);g.an.connect(c.destination);
  g.util=c.createGain();g.util.connect(g.master);
  g.noiseOut=c.createGain();g.noiseOut.gain.value=0;g.noiseOut.connect(g.master);
  g.enc=c.createBiquadFilter();g.enc.type='lowshelf';g.enc.frequency.value=110;g.enc.connect(g.master);
  g.trim=c.createGain();g.trim.connect(g.enc);
  g.eq=EQ_BANDS.map(b=>{const f=c.createBiquadFilter();f.type=b.type;f.frequency.value=b.f;f.Q.value=b.q;f.gain.value=0;return f});
  g.eq.forEach((f,i)=>f.connect(i<g.eq.length-1?g.eq[i+1]:g.trim));
  g.xin=c.createGain();
  g.byp=c.createGain();g.xin.connect(g.byp);g.byp.connect(g.eq[0]);
  g.xsum=c.createGain();g.xsum.connect(g.eq[0]);
  const bw=type=>{const f=c.createBiquadFilter();f.type=type;f.frequency.value=XO_F;f.Q.value=BUTTER_Q;return f};
  const l1=bw('lowpass'),l2=bw('lowpass'),h1=bw('highpass'),h2=bw('highpass');
  g.lo=c.createGain();g.lo.gain.value=0;g.xin.connect(l1);l1.connect(l2);l2.connect(g.lo);g.lo.connect(g.xsum);
  g.hdel=c.createDelay(.02);g.pol=c.createGain();g.hi=c.createGain();g.hi.gain.value=0;
  g.xin.connect(h1);h1.connect(h2);h2.connect(g.hdel);g.hdel.connect(g.pol);g.pol.connect(g.hi);g.hi.connect(g.xsum);
  g.rev=c.createConvolver();g.rev.buffer=makeIR(c);g.rev.connect(g.xin);
  g.pres=c.createBiquadFilter();g.pres.type='peaking';g.pres.frequency.value=2600;g.pres.Q.value=1;g.pres.gain.value=0;
  BUS.forEach(b=>{
    const inn=c.createGain(),p=c.createStereoPanner(),s=c.createGain();
    p.pan.value=b.pan;s.gain.value=0;
    if(b.n==='vox'){inn.connect(g.pres);g.pres.connect(p)}else inn.connect(p);
    p.connect(g.xin);p.connect(s);s.connect(g.rev);
    g[b.n]={in:inn,pan:p,send:s};
  });
  /* kebisingan ruangan: dengung + obrolan samar */
  const bb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),bd=bb.getChannelData(0);let last=0;
  for(let i=0;i<bd.length;i++){last=(last+.02*(Math.random()*2-1))/1.02;bd[i]=last*3.5}
  const rs=c.createBufferSource();rs.buffer=bb;rs.loop=true;
  const rl=c.createBiquadFilter();rl.type='lowpass';rl.frequency.value=320;rs.connect(rl);rl.connect(g.noiseOut);rs.start();
  const cs=c.createBufferSource();cs.buffer=getNoise(c);cs.loop=true;
  const cb=c.createBiquadFilter();cb.type='bandpass';cb.frequency.value=1100;cb.Q.value=.6;
  const cg=c.createGain();cg.gain.value=.12;
  const lfo=c.createOscillator();lfo.frequency.value=3.4;const ld=c.createGain();ld.gain.value=.1;lfo.connect(ld);ld.connect(cg.gain);
  cs.connect(cb);cb.connect(cg);cg.connect(g.noiseOut);cs.start();lfo.start();
  return g;
}
function ensureAudio(){
  if(!ctx){
    const AC=window.AudioContext||window.webkitAudioContext;
    ctx=new AC({latencyHint:'interactive'});
    G=buildGraph(ctx);
    applyParams();
  }
  if(ctx.state!=='running')ctx.resume();
  return ctx;
}
function stageEff(){
  const e=ENC[P.enc];
  return {spread:clamp(P.width*e.w,0,1)*lerp(.1,1,P.sep),depth:clamp(P.depth*e.dm+e.da,0,1)};
}
function applyParams(){
  if(!G||!ctx)return;
  const t=ctx.currentTime,e=ENC[P.enc],st=stageEff(),m=P.mute,x=P.xo;
  P.eq.forEach((v,i)=>G.eq[i].gain.setTargetAtTime(v,t,.03));
  G.trim.gain.setTargetAtTime(dB(-.7*Math.max(0,...P.eq)),t,.03);
  G.master.gain.setTargetAtTime(P.vol*P.vol*1.5,t,.03);
  const pad=m.pad?0:lerp(1.9,1,P.sep);
  const lv={vox:m.vox?0:1,kick:m.drums?0:1,snare:m.drums?0:1,hat:m.drums?0:1,bass:m.bass?0:1,padL:pad,padR:pad};
  BUS.forEach(b=>{const n=G[b.n];n.in.gain.setTargetAtTime(lv[b.n],t,.03);n.pan.pan.setTargetAtTime(clamp(b.pan*st.spread,-1,1),t,.05);n.send.gain.setTargetAtTime(b.send*st.depth*1.6,t,.05)});
  G.pres.gain.setTargetAtTime(lerp(-5,0,P.sep),t,.05);
  G.enc.gain.setTargetAtTime(e.bass,t,.05);
  G.noiseOut.gain.setTargetAtTime(playing()?P.noise*e.leak*.3:0,t,.05);
  G.byp.gain.setTargetAtTime(x.on?0:1,t,.02);G.lo.gain.setTargetAtTime(x.on?1:0,t,.02);
  G.hi.gain.setTargetAtTime(x.on?dB(x.hi):0,t,.02);
  G.pol.gain.setTargetAtTime(x.pol?-1:1,t,.02);
  G.hdel.delayTime.setTargetAtTime(x.delay/1000,t,.02);
}

/* ---- synth voices ---- */
function noiseBurst(c,out,t,dur,filt,gain,atk=.002){
  const s=c.createBufferSource();s.buffer=getNoise(c);
  const f=c.createBiquadFilter();f.type=filt.type;f.frequency.value=filt.f;if(filt.q!=null)f.Q.value=filt.q;
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+atk);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(out);s.start(t,Math.random()*1.5);s.stop(t+dur+.02);
}
const KDEF={f:55,decay:.14,click:.85};
function kickVoice(c,out,t,p,v){
  p=p||KDEF;
  const a=.002+(1-p.click)*.014;
  const o=c.createOscillator();o.type='sine';
  o.frequency.setValueAtTime(p.f*2.6,t);o.frequency.exponentialRampToValueAtTime(p.f,t+.045);
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(.001,t+a+p.decay);
  o.connect(g);g.connect(out);o.start(t);o.stop(t+a+p.decay+.05);
  if(p.click>.02)noiseBurst(c,out,t,.012,{type:'bandpass',f:3200,q:.9},v*.55*p.click,.0008);
}
function hitSnare(c,out,t,v){
  noiseBurst(c,out,t,.17,{type:'bandpass',f:1900,q:.8},v,.002);
  const o=c.createOscillator();o.type='triangle';o.frequency.setValueAtTime(210,t);o.frequency.exponentialRampToValueAtTime(150,t+.08);
  const g=c.createGain();g.gain.setValueAtTime(v*.7,t);g.gain.exponentialRampToValueAtTime(.001,t+.11);o.connect(g);g.connect(out);o.start(t);o.stop(t+.13);
}
function hitHat(c,out,t,dur,v){noiseBurst(c,out,t,dur,{type:'highpass',f:7000,q:.7},v,.001)}
function hitBass(c,out,t,f,dur,v){
  const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;
  const o2=c.createOscillator();o2.type='sine';o2.frequency.value=f;
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.Q.value=2;lp.frequency.setValueAtTime(f*7,t);lp.frequency.exponentialRampToValueAtTime(f*2.2,t+dur);
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.setValueAtTime(v,t+Math.max(.02,dur-.05));g.gain.linearRampToValueAtTime(.0001,t+dur+.04);
  const sg=c.createGain();sg.gain.value=.5;o.connect(lp);lp.connect(g);o2.connect(sg);sg.connect(g);g.connect(out);
  o.start(t);o2.start(t);o.stop(t+dur+.1);o2.stop(t+dur+.1);
}
function padVoice(c,out,t,f,dur,v){
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1500;lp.Q.value=.5;
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.25);g.gain.setValueAtTime(v,t+dur-.35);g.gain.linearRampToValueAtTime(.0001,t+dur);
  [-7,7].forEach(d=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=d;o.connect(lp);o.start(t);o.stop(t+dur+.05)});
  lp.connect(g);g.connect(out);
}
const VOWELS={a:[730,1090,2440],e:[530,1840,2480],i:[270,2290,3010],o:[570,840,2410],u:[300,870,2240]};
function voiceNote(c,dest,t,dur,f,vowel,g,fs){
  fs=fs||1;
  const F=VOWELS[vowel];
  const o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f,t);
  const lfo=c.createOscillator();lfo.frequency.value=5.3;
  const lg=c.createGain();lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*.011,t+Math.min(.4,dur));lfo.connect(lg);lg.connect(o.frequency);
  const env=c.createGain();env.gain.setValueAtTime(.0001,t);env.gain.linearRampToValueAtTime(g,t+.05);env.gain.setValueAtTime(g,t+Math.max(.06,dur-.07));env.gain.linearRampToValueAtTime(.0001,t+dur+.04);
  const q=[7,9,12],gs=[1,.55,.3];
  F.forEach((fr,i)=>{const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=fr*fs;bp.Q.value=q[i];const gg=c.createGain();gg.gain.value=gs[i];o.connect(bp);bp.connect(gg);gg.connect(env)});
  const lo=c.createBiquadFilter();lo.type='lowpass';lo.frequency.value=420;const lgn=c.createGain();lgn.gain.value=.35;o.connect(lo);lo.connect(lgn);lgn.connect(env);
  env.connect(dest);
  o.start(t);lfo.start(t);const end=t+dur+.1;o.stop(end);lfo.stop(end);
  return {kill(tt){env.gain.cancelScheduledValues(tt);env.gain.setTargetAtTime(.0001,tt,.015);try{o.stop(tt+.12);lfo.stop(tt+.12)}catch(e){}}};
}
function sBurst(c,dest,t,dur,g){noiseBurst(c,dest,t,dur,{type:'bandpass',f:6800,q:.8},g,.02)}

/* ---- lagu demo ---- */
const STEP=60/92/4;
const CHORDS=[[220,261.63,329.63],[174.61,220,261.63],[261.63,329.63,392],[196,246.94,293.66]];
const ROOTS=[55,43.65,65.41,49];
const BASSP=[[0,2.5,1],[3,1.5,1],[6,2,2],[10,2.5,1],[13,2,1.5]];
const MELODY=[
  [[0,6,329.63,'a'],[6,2,293.66,'o'],[8,4,261.63,'a'],[12,4,293.66,'e',1]],
  [[0,4,261.63,'a'],[4,4,349.23,'e'],[8,6,329.63,'i'],[14,2,293.66,'e',1]],
  [[0,6,392,'o'],[6,2,329.63,'a'],[8,4,329.63,'e'],[12,4,261.63,'u']],
  [[0,4,293.66,'a'],[4,4,392,'i'],[8,6,293.66,'o'],[14,2,246.94,'a',1]]
];
function scheduleStep(c,D,step,t){
  const bar=Math.floor(step/16)%4,s=step%16;
  if(s===0||s===6||s===10||(s===14&&bar%2===1))kickVoice(c,D.kick,t,KDEF,MIX.kick);
  if(s===4||s===12)hitSnare(c,D.snare,t,MIX.snare);
  if(s%2===0)hitHat(c,D.hat,t,s===14?.22:.045,MIX.hat*(s%4===0?1:.6));
  BASSP.forEach(([st,len,mul])=>{if(st===s)hitBass(c,D.bass,t,ROOTS[bar]*mul,len*STEP,MIX.bass)});
  if(s===0)CHORDS[bar].forEach((f,i)=>padVoice(c,i%2?D.padR:D.padL,t,f,16*STEP,MIX.pad));
  MELODY[bar].forEach(n=>{if(n[0]===s){voiceNote(c,D.vox,t,n[1]*STEP*.94,n[2],n[3],MIX.vox);if(n[4])sBurst(c,D.vox,t+n[1]*STEP*.9,.14,MIX.sib)}});
}
function makeRun(kind){
  const out={};const nodes=[];
  if(kind==='track'){BUS.forEach(b=>{const n=ctx.createGain();n.connect(G[b.n].in);out[b.n]=n;nodes.push(n)})}
  else{const u=ctx.createGain();u.connect(G.util);['kick','snare','hat','bass','padL','padR','vox'].forEach(k=>out[k]=u);nodes.push(u)}
  return {out,kill(){const t=ctx.currentTime;nodes.forEach(n=>{n.gain.cancelScheduledValues(t);n.gain.setTargetAtTime(0,t,.02)});setTimeout(()=>nodes.forEach(n=>{try{n.disconnect()}catch(e){}}),500)}};
}
/* pencatat waktu di Web Worker: tidak ikut diperlambat saat tab di latar belakang (setInterval bisa tertahan ~1 detik) */
function makeTicker(fn,ms){
  try{
    const url=URL.createObjectURL(new Blob(['let id;onmessage=e=>{clearInterval(id);if(e.data>0)id=setInterval(()=>postMessage(0),e.data)}'],{type:'text/javascript'}));
    const w=new Worker(url);w.onmessage=fn;w.postMessage(ms);
    return {stop(){w.postMessage(0);w.terminate();URL.revokeObjectURL(url)}};
  }catch(e){
    const id=setInterval(fn,ms);return {stop(){clearInterval(id)}};
  }
}
class Sched{
  constructor(step,fn,kind,name){this.step=step;this.fn=fn;this.kind=kind;this.name=name;this.on=false}
  start(){ensureAudio();this.on=true;this.i=0;this.next=ctx.currentTime+.08;this.run=makeRun(this.kind);this.id=makeTicker(()=>this.tick(),25);busy.add(this.name)}
  tick(){const ahead=document.hidden?1.5:.25;while(this.next<ctx.currentTime+ahead){this.fn(this.i,this.next,this.run.out);this.next+=this.step;this.i++}}
  stop(){if(!this.on)return;this.on=false;this.id.stop();this.run.kill();busy.delete(this.name)}
}
const Track=new Sched(STEP,(i,t,D)=>scheduleStep(ctx,D,i%64,t),'track','track');
/* lagu sendiri (vokal asli): file audio dari perangkat, lewat rantai EQ yang sama */
const Song={buf:null,use:false,on:false,src:null,g:null,name:'',cur:null,t0:0};
const playing=()=>Track.on||Song.on;
const offs=new Map(),gains=new Map();
function normGain(buf){
  if(gains.has(buf))return gains.get(buf);
  const d=buf.getChannelData(0),n=Math.min(d.length,buf.sampleRate*60);let sum=0,c=0;
  for(let i=0;i<n;i+=3){sum+=d[i]*d[i];c++}
  const g=clamp(.125/(Math.sqrt(sum/Math.max(c,1))||.1),.15,3);gains.set(buf,g);return g;
}
function songStart(buf){
  ensureAudio();const t=ctx.currentTime;
  Song.g=ctx.createGain();Song.g.gain.setValueAtTime(0,t);Song.g.gain.linearRampToValueAtTime(normGain(buf),t+.08);Song.g.connect(G.xin);
  Song.src=ctx.createBufferSource();Song.src.buffer=buf;Song.src.loop=true;Song.src.connect(Song.g);
  Song.cur=buf;Song.t0=t;Song.src.start(0,(offs.get(buf)||0)%buf.duration);
  Song.on=true;busy.add('track');
}
function songStop(){
  if(!Song.on)return;Song.on=false;busy.delete('track');
  const t=ctx.currentTime,s=Song.src,g=Song.g;
  offs.set(Song.cur,((offs.get(Song.cur)||0)+t-Song.t0)%Song.cur.duration);
  g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(0,t,.03);
  setTimeout(()=>{try{s.stop();s.disconnect();g.disconnect()}catch(e){}},300);
}
stoppers.set('track',()=>{Track.stop();songStop();syncTransport()});
/* sumber lagu: lab ruang selalu sintetis; lainnya lagu sendiri, lalu rekaman bawaan, lalu sintetis */
const Real={buf:null,state:'idle',pending:false};
let curSrc=null;
function pickSource(){
  if(P.owner==='stage')return 'synth';
  if(Song.use&&Song.buf)return 'user';
  if(Real.state==='ok')return 'real';
  return 'synth';
}
function startTrack(){
  claim('track');
  if(pickSource()!=='user'&&P.owner!=='stage'&&Real.state==='loading'){Real.pending=true;syncTransport();return}
  const src=pickSource();curSrc=src;
  if(src==='user'){if(!Song.on)songStart(Song.buf)}
  else if(src==='real'){if(!Song.on)songStart(Real.buf)}
  else if(!Track.on)Track.start();
  syncTransport();
}
function stopTrack(){Real.pending=false;Track.stop();songStop();syncTransport()}

/* ---- engage / commit ---- */
function engage(owner){
  if(P.owner!==owner){
    const d=DEF();
    if(owner!=='eq')P.eq=d.eq;
    if(owner!=='stage'){P.width=d.width;P.depth=d.depth;P.sep=d.sep}
    if(owner!=='enc'){P.enc='none';P.noise=0}
    if(owner!=='xo')P.xo=d.xo;
    P.owner=owner;
  }
  if(playing()&&curSrc!==pickSource())stopTrack();
  if(!playing())startTrack();
}
function commit(){syncAll();applyParams()}
function resetAll(){Object.assign(P,DEF(),{owner:null});P.mute={vox:false,drums:false,bass:false,pad:false};commit()}
