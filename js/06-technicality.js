'use strict';
/* ================= PUNCH ================= */
const KP={click:.85,f:55,decay:.14};
const KPRE={
  punchy:['Punchy',{click:.85,f:55,decay:.14}],
  boomy:['Boomy',{click:.25,f:45,decay:.55}],
  soft:['Lembek, serangan lambat',{click:0,f:60,decay:.3}],
  tight:['Tipis tapi ketat',{click:.7,f:95,decay:.08}]
};
chipRow($('#kickPresets'),Object.entries(KPRE).map(([k,v])=>[k,v[0]]),k=>{Object.assign(KP,KPRE[k][1]);kSync()});
let kBuf=null,kPending=false;
function kRender(){
  if(kPending)return;kPending=true;
  requestAnimationFrame(async()=>{
    kPending=false;
    try{
      const sr=44100,oc=new OfflineAudioContext(1,Math.floor(sr*.8),sr),o=oc.createGain();o.connect(oc.destination);
      kickVoice(oc,o,.01,{f:KP.f,decay:KP.decay,click:KP.click},1);
      kBuf=(await oc.startRendering()).getChannelData(0);drawKick();
    }catch(e){}
  });
}
const drawKick=autoCanvas($('#cvKick'),(c,w,h)=>{
  const T=theme,pl=8,pr=8,mid=h/2-6;
  c.strokeStyle=T.line;c.lineWidth=1;c.fillStyle=T.ink2;c.font='500 9.5px "JetBrains Mono",monospace';c.textAlign='center';
  for(let ms=0;ms<=800;ms+=100){const x=pl+ms/800*(w-pl-pr);c.globalAlpha=.7;c.beginPath();c.moveTo(x,6);c.lineTo(x,h-18);c.stroke();c.globalAlpha=1;c.fillText(ms+' ms',clamp(x,22,w-22),h-5)}
  const x1=pl+.01/.8*(w-pl-pr),x2=pl+.03/.8*(w-pl-pr);
  c.fillStyle=T.signalSoft;c.fillRect(x1,6,x2-x1,h-24);c.fillStyle=T.signal;c.textAlign='left';c.fillText('serangan',x2+3,16);
  if(!kBuf)return;
  c.fillStyle=T.accent;
  const n=kBuf.length;c.beginPath();
  const cols=Math.floor(w-pl-pr);
  const top=[],bot=[];
  for(let x=0;x<cols;x++){const a=Math.floor(x/cols*n),b=Math.floor((x+1)/cols*n);let mn=0,mx=0;for(let i=a;i<b;i++){const v=kBuf[i];if(v<mn)mn=v;if(v>mx)mx=v}top.push(mid-mx*(mid-10));bot.push(mid-mn*(mid-10))}
  top.forEach((y,x)=>x?c.lineTo(pl+x,y):c.moveTo(pl,y));
  for(let x=cols-1;x>=0;x--)c.lineTo(pl+x,bot[x]);
  c.closePath();c.fill();
});
function kSync(){
  $('#kClick').value=Math.round(KP.click*100);$('#kF').value=KP.f;$('#kD').value=Math.round(KP.decay*1000);
  $('#kClickO').textContent=Math.round(KP.click*100)+'%';$('#kFO').textContent=KP.f+' Hz';$('#kDO').textContent=Math.round(KP.decay*1000)+' ms';
  const k=Object.keys(KPRE).find(k=>{const v=KPRE[k][1];return Math.abs(v.click-KP.click)<.005&&v.f===KP.f&&Math.abs(v.decay-KP.decay)<.0005});
  markChip($('#kickPresets'),k||'');kRender();
}
$('#kClick').addEventListener('input',e=>{KP.click=e.target.value/100;kSync()});
$('#kF').addEventListener('input',e=>{KP.f=+e.target.value;kSync()});
$('#kD').addEventListener('input',e=>{KP.decay=e.target.value/1000;kSync()});
$('#kickHit').addEventListener('click',()=>{claim('kick');ensureAudio();kickVoice(ctx,G.util,ctx.currentTime+.02,KP,.9);busy.add('kickhit');setTimeout(()=>busy.delete('kickhit'),900)});
const kLoop=new Sched(60/96/4,(i,t,D)=>{
  const s=i%16;
  if(s===0||s===6||s===8)kickVoice(ctx,D.kick,t,KP,.9);
  if(s===4||s===12)hitSnare(ctx,D.snare,t,.4);
  if(s%2===0)hitHat(ctx,D.hat,t,.04,.12);
},'util','kloop');
function kLoopStop(){if(kLoop.on){kLoop.stop();$('#kickLoop').setAttribute('aria-pressed','false');$('#kickLoop').textContent='Putar pola drum'}}
stoppers.set('kloop',kLoopStop);
$('#kickLoop').addEventListener('click',()=>{if(kLoop.on){kLoopStop();return}claim('kloop');kLoop.start();$('#kickLoop').setAttribute('aria-pressed','true');$('#kickLoop').textContent='Hentikan pola drum'});
kSync();

/* ---- lab transient: tiga nada beruntun (attack dan decay) ---- */
const TR={a:1,d:200,r:0};
const TRPRE={
  ideal:['Tajam, decay seimbang',{a:1,d:200,r:0},'Tiap nada bersih dan terdefinisi. Terdengar normal.'],
  blunt:['Attack tumpul',{a:25,d:200,r:0},'Nada terasa tumpul. Petikan senar teredam, perkusi seperti memukul bantal.'],
  long:['Decay terlalu panjang',{a:1,d:650,r:0},'Nada saling menempel dan separation hilang. Terdengar muddy dan sesak.'],
  short:['Decay terlalu pendek',{a:1,d:40,r:0},'Sangat terdefinisi tetapi tidak natural. Nada hilang sebelum sempat berbunyi, kesan hampa atau plastik.'],
  ring:['Decay berdenyut',{a:1,d:350,r:70},'Decay yang berdenyut membuat suara terdengar metalik.']
};
const TR_NOTES=[329.63,392,493.88],TR_GAP=.14;
function trVoice(c,out,t,p,f){
  const a=Math.max(.0005,p.a/1000),d=p.d/1000;
  const o=c.createOscillator();o.type='triangle';o.frequency.value=f;
  const o2=c.createOscillator();o2.type='sine';o2.frequency.value=f*2;
  const g2=c.createGain();g2.gain.value=.25;
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.45,t+a);g.gain.exponentialRampToValueAtTime(.001,t+a+d);
  o.connect(g);o2.connect(g2);g2.connect(g);
  let node=g;const end=t+a+d+.05;
  if(p.r>0){
    const depth=p.r/100*.5,m=c.createGain();m.gain.value=1-depth;
    const lfo=c.createOscillator(),ld=c.createGain();lfo.frequency.value=38;ld.gain.value=depth;
    lfo.connect(ld);ld.connect(m.gain);lfo.start(t);lfo.stop(end);g.connect(m);node=m;
  }
  node.connect(out);o.start(t);o2.start(t);o.stop(end);o2.stop(end);
}
function trTrio(c,out,t){TR_NOTES.forEach((f,i)=>trVoice(c,out,t+i*TR_GAP,TR,f))}
chipRow($('#trPresets'),Object.entries(TRPRE).map(([k,v])=>[k,v[0]]),k=>{Object.assign(TR,TRPRE[k][1]);trSync()});
let trBuf=null,trPending=false;
function trRender(){
  if(trPending)return;trPending=true;
  requestAnimationFrame(async()=>{
    trPending=false;
    try{
      const sr=44100,oc=new OfflineAudioContext(1,Math.floor(sr*1.5),sr),o=oc.createGain();o.connect(oc.destination);
      trTrio(oc,o,.02);trBuf=(await oc.startRendering()).getChannelData(0);drawTr();
    }catch(e){}
  });
}
const drawTr=autoCanvas($('#cvTr'),(c,w,h)=>{
  const T=theme,pl=8,pr=8,mid=h/2-6;
  c.strokeStyle=T.line;c.lineWidth=1;c.fillStyle=T.ink2;c.font='500 9.5px "JetBrains Mono",monospace';c.textAlign='center';
  for(let ms=0;ms<=1500;ms+=250){const x=pl+ms/1500*(w-pl-pr);c.globalAlpha=.7;c.beginPath();c.moveTo(x,6);c.lineTo(x,h-18);c.stroke();c.globalAlpha=1;c.fillText(ms+' ms',clamp(x,22,w-22),h-5)}
  TR_NOTES.forEach((_,i)=>{const x=pl+(.02+i*TR_GAP)/1.5*(w-pl-pr);c.fillStyle=T.signal;c.fillRect(x-1,6,2,10)});
  if(!trBuf)return;
  const n=trBuf.length,cols=Math.floor(w-pl-pr),top=[],bot=[];
  for(let x=0;x<cols;x++){const a=Math.floor(x/cols*n),b=Math.floor((x+1)/cols*n);let mn=0,mx=0;for(let i=a;i<b;i++){const v=trBuf[i];if(v<mn)mn=v;if(v>mx)mx=v}top.push(mid-mx*(mid-10)*1.8);bot.push(mid-mn*(mid-10)*1.8)}
  c.fillStyle=T.accent;c.beginPath();
  top.forEach((y,x)=>x?c.lineTo(pl+x,y):c.moveTo(pl,y));
  for(let x=cols-1;x>=0;x--)c.lineTo(pl+x,bot[x]);
  c.closePath();c.fill();
});
function trSync(){
  $('#trA').value=TR.a;$('#trD').value=TR.d;$('#trR').value=TR.r;
  $('#trAO').textContent=TR.a+' ms';$('#trDO').textContent=TR.d+' ms';$('#trRO').textContent=TR.r+'%';
  const k=Object.keys(TRPRE).find(k=>{const v=TRPRE[k][1];return v.a===TR.a&&v.d===TR.d&&v.r===TR.r});
  markChip($('#trPresets'),k||'');
  $('#trNote').textContent=k?TRPRE[k][2]:'Atur attack dan decay sendiri, lalu dengar apakah tiap nada masih terpisah rapi.';
  trRender();
}
$('#trA').addEventListener('input',e=>{TR.a=+e.target.value;trSync()});
$('#trD').addEventListener('input',e=>{TR.d=+e.target.value;trSync()});
$('#trR').addEventListener('input',e=>{TR.r=+e.target.value;trSync()});
$('#trPlay').addEventListener('click',()=>{claim('tr');ensureAudio();trTrio(ctx,G.util,ctx.currentTime+.03);busy.add('trhit');setTimeout(()=>busy.delete('trhit'),2200)});
const trLoop=new Sched(TR_GAP,(i,t,D)=>{const s=i%12;if(s<3)trVoice(ctx,D.kick,t,TR,TR_NOTES[s])},'util','trloop');
function trLoopStop(){if(trLoop.on){trLoop.stop();$('#trLoop').setAttribute('aria-pressed','false');$('#trLoop').textContent='Ulangi'}}
stoppers.set('trloop',trLoopStop);
$('#trLoop').addEventListener('click',()=>{if(trLoop.on){trLoopStop();return}claim('trloop');trLoop.start();$('#trLoop').setAttribute('aria-pressed','true');$('#trLoop').textContent='Hentikan ulangan'});
trSync();

/* ================= RUANG ================= */
const SPRE={
  head:['Dalam kepala',{w:.2,d:0,s:.8}],
  nat:['Natural',{w:.7,d:.25,s:1}],
  hall:['Konser luas',{w:1,d:.8,s:1}],
  mess:['Lebar tapi berantakan',{w:1,d:.5,s:0}],
  mono:['Mono',{w:0,d:0,s:.5}]
};
chipRow($('#stagePresets'),Object.entries(SPRE).map(([k,v])=>[k,v[0]]),k=>{engage('stage');const v=SPRE[k][1];P.width=v.w;P.depth=v.d;P.sep=v.s;commit()});
[['stW','width'],['stD','depth'],['stS','sep']].forEach(([id,key])=>$('#'+id).addEventListener('input',e=>{engage('stage');P[key]=e.target.value/100;commit()}));
const SRC=[['Vokal','vox',0,.5],['Kick','kick',0,.78],['Snare','snare',.18,.7],['Hat','hat',.6,.62],['Bass','bass',-.12,.9],['Pad L','padL',-1,.5],['Pad R','padR',1,.5]];
const stageSvg=$('#stageMap'),NS='http://www.w3.org/2000/svg';
(function(){
  let h='<ellipse cx="200" cy="232" rx="16" ry="13" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.6"/><rect x="180" y="226" width="5" height="12" rx="2" fill="var(--ink)"/><rect x="215" y="226" width="5" height="12" rx="2" fill="var(--ink)"/>';
  h+='<path d="M200 214 L200 214" stroke="var(--ink)"/><text x="200" y="22" text-anchor="middle" class="sv-t">depan</text>';
  [70,120,170].forEach(r=>{h+='<path d="M'+(200-r*1.35)+' 232 A'+r*1.35+' '+r+' 0 0 1 '+(200+r*1.35)+' 232" fill="none" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 5"/>'});
  SRC.forEach(s=>{h+='<g id="sg-'+s[1]+'"><circle class="halo" r="8" fill="var(--accent-soft)"/><circle class="dot" r="7" fill="var(--accent)"/><text class="lbl" text-anchor="middle" y="-13" fill="var(--ink)" style="font:600 10px var(--font-ui)">'+s[0]+'</text></g>'});
  stageSvg.innerHTML=h;
})();
function syncStage(){
  $('#stW').value=Math.round(P.width*100);$('#stD').value=Math.round(P.depth*100);$('#stS').value=Math.round(P.sep*100);
  $('#stWO').textContent=Math.round(P.width*100)+'%';$('#stDO').textContent=Math.round(P.depth*100)+'%';$('#stSO').textContent=Math.round(P.sep*100)+'%';
  const k=Object.keys(SPRE).find(k=>{const v=SPRE[k][1];return Math.abs(v.w-P.width)<.005&&Math.abs(v.d-P.depth)<.005&&Math.abs(v.s-P.sep)<.005});
  markChip($('#stagePresets'),P.owner==='stage'||!P.owner?k:'');
  const st=stageEff();
  SRC.forEach(s=>{
    const g=$('#sg-'+s[1]);
    const x=200+clamp(s[2]*st.spread,-1,1)*170,y=196-s[3]*95-st.depth*52;
    g.setAttribute('transform','translate('+x.toFixed(1)+' '+y.toFixed(1)+')');
    $('.halo',g).setAttribute('r',(8+(1-P.sep)*18).toFixed(1));
    $('.dot',g).setAttribute('opacity',(0.55+0.45*P.sep).toFixed(2));
  });
}

/* ================= OPEN / CLOSED ================= */
$$('#encModes .chip').forEach(b=>b.addEventListener('click',()=>{engage('enc');P.enc=b.dataset.enc;if(P.noise===0)P.noise=.5;commit()}));
$('#encNoise').addEventListener('input',e=>{engage('enc');P.noise=e.target.value/100;commit()});
function syncEnc(){
  const e=ENC[P.enc];
  $$('#encModes .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.enc===P.enc)));
  $('#encFig').dataset.enc=P.enc;
  $('#encNoise').value=Math.round(P.noise*100);$('#encNoiseO').textContent=Math.round(P.noise*100)+'%';
  $('#roIso').textContent='-'+Math.round(-20*Math.log10(e.leak))+' dB';
  $('#roBass').textContent=(e.bass>0?'+':'')+String(e.bass).replace('.',',')+' dB';
  $('#roW').textContent=Math.round(clamp(P.width*e.w,0,1.25)*100)+'%';
  $('#roLeak').textContent=P.enc==='open'?'Besar':P.enc==='closed'?'Kecil':'Sedang';
}

/* ================= DRIVER ================= */
const L=(x,y,t)=>'<text x="'+x+'" y="'+y+'" class="sv-t">'+t+'</text>';
const DRV={
  dd:{name:'Dynamic driver (DD)',
    svg:'<svg viewBox="0 0 340 180" role="img" aria-label="Penampang dynamic driver"><path class="sv-acc" d="M50 70 Q150 10 250 70 L250 78 L50 78 Z"/><rect class="sv-fill" x="128" y="78" width="44" height="26"/><path class="sv-line" d="M128 84 H172 M128 90 H172 M128 96 H172"/><rect class="sv-fill" x="80" y="104" width="140" height="48"/><rect x="140" y="104" width="20" height="48" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/><path class="sv-sig" d="M150 34 V18 M144 24 L150 17 L156 24"/>'+L(262,52,'diafragma')+L(180,96,'voice coil')+L(228,132,'magnet')+'</svg>',
    how:'<b>Voice coil bergerak di dalam medan magnet dan menggerakkan diafragma</b> berbentuk kubah. Prinsipnya sama dengan speaker.',
    plus:'Bass bertenaga dan terasa alami, ukuran fleksibel, harga bersahabat. Cocok sebagai driver tunggal maupun pengurus bass pada hybrid.',
    minus:'Diafragma relatif berat sehingga treble dan transient pada rancangan sederhana bisa kalah cepat dari BA atau planar. Distorsi bisa naik di volume tinggi.',
    char:'Bass dalam dan berbobot, suara terasa penuh.'},
  ba:{name:'Balanced armature (BA)',
    svg:'<svg viewBox="0 0 340 180" role="img" aria-label="Penampang balanced armature"><rect class="sv-fill" x="40" y="50" width="190" height="80" rx="6"/><rect class="sv-acc" x="80" y="72" width="70" height="36"/><path class="sv-line" d="M86 72 V108 M96 72 V108 M106 72 V108 M116 72 V108 M126 72 V108 M136 72 V108 M146 72 V108"/><path d="M60 90 H200" stroke="var(--signal)" stroke-width="5" stroke-linecap="round"/><path class="sv-line" d="M200 90 L222 74"/><path class="sv-line" d="M214 56 L214 124"/><path class="sv-sig" d="M236 66 Q250 90 236 114 M246 58 Q268 90 246 122"/>'+L(70,44,'kumparan')+L(60,150,'armature (batang logam)')+L(222,148,'diafragma mungil')+'</svg>',
    how:'<b>Batang logam kecil (armature) bergetar di dalam kumparan</b> dan menggerakkan diafragma mungil lewat pengait. Satu BA biasanya nyaman hanya pada sebagian rentang, jadi IEM sering memakai beberapa BA dengan crossover.',
    plus:'Kecil, cepat, dan detail di mid dan treble. Mudah ditumpuk dalam satu rumah IEM.',
    minus:'Sulit menghasilkan bass dalam dan besar. Banyak driver butuh crossover rumit, yang rawan masalah koherensi.',
    char:'Cepat dan bersih, kuat di mid-treble.'},
  planar:{name:'Planar magnetic',
    svg:'<svg viewBox="0 0 340 180" role="img" aria-label="Penampang planar magnetic"><g fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"><rect x="40" y="36" width="24" height="26"/><rect x="82" y="36" width="24" height="26"/><rect x="124" y="36" width="24" height="26"/><rect x="166" y="36" width="24" height="26"/><rect x="208" y="36" width="24" height="26"/><rect x="40" y="118" width="24" height="26"/><rect x="82" y="118" width="24" height="26"/><rect x="124" y="118" width="24" height="26"/><rect x="166" y="118" width="24" height="26"/><rect x="208" y="118" width="24" height="26"/></g><path d="M36 90 Q60 82 84 90 T132 90 T180 90 T228 90 T252 90" stroke="var(--accent)" stroke-width="3" fill="none"/><path class="sv-sig" d="M144 74 V66 M140 70 L144 65 L148 70 M144 106 V114 M140 110 L144 115 L148 110"/>'+L(40,28,'susunan magnet')+L(40,164,'susunan magnet')+L(262,94,'diafragma tipis')+'</svg>',
    how:'<b>Diafragma tipis dan datar dengan jejak konduktor</b> di atasnya, ditempatkan di antara susunan magnet. Seluruh permukaan digerakkan merata.',
    plus:'Distorsi rendah, transient cepat, kontrol bass baik. Umum di headphone, mulai ada di IEM.',
    minus:'Headphone planar cenderung berat dan butuh daya lebih besar. Harga biasanya tinggi.',
    char:'Rapi, terkendali, bass bertekstur.'},
  est:{name:'Electrostatic (EST)',
    svg:'<svg viewBox="0 0 340 180" role="img" aria-label="Penampang electrostatic"><path d="M40 60 H250" stroke="var(--ink)" stroke-width="2.4" stroke-dasharray="8 5" fill="none"/><path d="M40 122 H250" stroke="var(--ink)" stroke-width="2.4" stroke-dasharray="8 5" fill="none"/><path d="M40 91 Q90 80 145 91 T250 91" stroke="var(--accent)" stroke-width="3" fill="none"/><path class="sv-sig" d="M274 74 V108 M268 82 L274 72 L280 82"/>'+L(40,50,'stator berlubang')+L(40,142,'stator berlubang')+L(40,172,'film tipis bermuatan listrik')+L(262,128,'tegangan bias')+'</svg>',
    how:'<b>Film super tipis bermuatan listrik</b> berada di antara dua pelat berlubang (stator). Tegangan audio menggerakkan film. Butuh tegangan bias tinggi, jadi headphone EST memakai amplifier khusus. Pada IEM, EST biasanya dipakai sebagai tweeter kecil di dalam hybrid.',
    plus:'Film sangat ringan sehingga treble halus dan cepat, dengan distorsi rendah.',
    minus:'Butuh amp atau modul bias khusus, rawan lembab, dan kurang bertenaga di bass.',
    char:'Treble halus dan berudara.'}
};
const drvTabs=$('#drvTabs');let drvCur='dd';
Object.entries(DRV).forEach(([k,v])=>{const b=document.createElement('button');b.setAttribute('role','tab');b.dataset.k=k;b.textContent=v.name;b.addEventListener('click',()=>{drvCur=k;drvRender()});drvTabs.appendChild(b)});
function drvRender(){
  const d=DRV[drvCur];
  $$('button',drvTabs).forEach(b=>b.setAttribute('aria-selected',String(b.dataset.k===drvCur)));
  $('#drvBody').innerHTML='<div>'+d.svg+'</div><dl><div><dt>Cara kerja</dt><dd>'+d.how+'</dd></div><div><dt>Kelebihan</dt><dd>'+d.plus+'</dd></div><div><dt>Kekurangan</dt><dd>'+d.minus+'</dd></div><div><dt>Karakter umum</dt><dd>'+d.char+'</dd></div></dl>';
}
drvRender();

/* ================= KOHEREN ================= */
const XPRE={
  ok:['Selaras',{d:0,l:0,p:false}],
  late:['Terlambat 0,2 ms',{d:.2,l:0,p:false}],
  loud:['Treble terlalu keras',{d:0,l:4,p:false}],
  pol:['Polaritas terbalik',{d:0,l:0,p:true}]
};
const plotXo=new FreqPlot($('#plotXo'),{range:[-30,6],step:6,curve:xoCurve,marks:[{f:XO_F,label:'crossover 2,5k',c:null}]});
chipRow($('#xoPresets'),Object.entries(XPRE).map(([k,v])=>[k,v[0]]),k=>{engage('xo');const v=XPRE[k][1];P.xo={on:true,delay:v.d,hi:v.l,pol:v.p};commit()});
$('#xoD').addEventListener('input',e=>{engage('xo');P.xo.on=true;P.xo.delay=e.target.value/100;commit()});
$('#xoL').addEventListener('input',e=>{engage('xo');P.xo.on=true;P.xo.hi=e.target.value/10;commit()});
$('#xoP').addEventListener('change',e=>{engage('xo');P.xo.on=true;P.xo.pol=e.target.checked;commit()});
const drawXoTime=autoCanvas($('#cvXoTime'),(c,w,h)=>{
  const T=theme,pl=70,pr=12,x0=pl,x1=w-pr,sc=ms=>x0+ms/1.0*(x1-x0);
  c.font='500 10px "JetBrains Mono",monospace';c.textBaseline='middle';
  [['Driver bass',28,0],['Driver treble',62,P.xo.delay]].forEach(([n,y,d],i)=>{
    c.fillStyle=T.ink2;c.textAlign='left';c.fillText(n,6,y);
    c.strokeStyle=T.line;c.lineWidth=1;c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();
    const x=sc(d);c.strokeStyle=i?T.signal:T.accent;c.lineWidth=3;c.beginPath();c.moveTo(x,y-12);c.lineTo(x,y+12);c.stroke();
  });
  c.fillStyle=T.ink2;c.textAlign='center';c.textBaseline='top';
  [0,.25,.5,.75,1].forEach(ms=>{c.fillText(String(ms).replace('.',',')+' ms',clamp(sc(ms),x0+8,x1-12),h-13)});
});
function syncXo(){
  const x=P.xo;
  $('#xoD').value=Math.round(x.delay*100);$('#xoL').value=Math.round(x.hi*10);$('#xoP').checked=x.pol;
  $('#xoDO').textContent=fmt(x.delay,2)+' ms';$('#xoLO').textContent=(x.hi>0?'+':'')+fmt(x.hi,1)+' dB';
  const k=Object.keys(XPRE).find(k=>{const v=XPRE[k][1];return Math.abs(v.d-x.delay)<.005&&Math.abs(v.l-x.hi)<.05&&v.p===x.pol});
  markChip($('#xoPresets'),k||'');
  const cv=xoCurve(),i=FREQS.findIndex(f=>f>=XO_F),dip=Math.min(...[...cv].slice(Math.max(0,i-30),i+30));
  const cm=(x.delay/1000)*343*100;
  $('#xoInfo').innerHTML='Selisih waktu <b>'+fmt(x.delay,2)+' ms</b> setara beda jarak sekitar <b>'+fmt(cm,1)+' cm</b>. Lekukan terdalam di sekitar crossover: <b>'+(dip>-1?'hampir tidak ada':fmt(dip,0)+' dB')+'</b>. '+(dip<-6?'Vokal di daerah itu terdengar hilang atau hollow.':'Sambungan driver mulus.');
  drawXoTime();
}

/* ================= MULTIPOINT ================= */
const MP={mode:'multi',link:{laptop:true,phone:true},music:false,call:'idle',log:[]};
function mpLog(t){MP.log.unshift(t);MP.log=MP.log.slice(0,6)}
function ring(kind){
  claim('mp');ensureAudio();const t=ctx.currentTime+.02;
  const tone=(f,st,d)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f;g.gain.setValueAtTime(.0001,st);g.gain.linearRampToValueAtTime(.12,st+.02);g.gain.setValueAtTime(.12,st+d-.03);g.gain.linearRampToValueAtTime(.0001,st+d);o.connect(g);g.connect(G.util);o.start(st);o.stop(st+d+.02)};
  if(kind==='ring'){[0,.6].forEach(o=>{tone(440,t+o,.4);tone(480,t+o,.4)})}
  else if(kind==='ping'){tone(880,t,.12);tone(1320,t+.12,.16)}
  else if(kind==='music'){[261.63,329.63,392].forEach((f,i)=>tone(f,t+i*.14,.18))}
  busy.add('mp');setTimeout(()=>busy.delete('mp'),1500);
}
stoppers.set('mp',()=>{});
function mpStream(){
  if(MP.call!=='idle'&&MP.link.phone)return 'phone';
  if(MP.music&&MP.link.laptop)return 'laptop';
  return null;
}
function renderMP(){
  const s=mpStream();
  $('#lnLaptop').dataset.s=!MP.link.laptop?'off':s==='laptop'?'active':'idle';
  $('#lnPhone').dataset.s=!MP.link.phone?'off':s==='phone'?'active':'idle';
  $('#gLaptop .dev').dataset.s=MP.link.laptop?(s==='laptop'?'active':'idle'):'off';
  $('#gPhone .dev').dataset.s=MP.link.phone?(s==='phone'?'active':'idle'):'off';
  $('#bLaptop').textContent=MP.music?'musik menyala':'';
  $('#bPhone').textContent=MP.call==='ringing'?'berdering':MP.call==='active'?'dalam panggilan':'';
  $('#mpStream').textContent=s==='phone'?'HP (panggilan)':s==='laptop'?'Laptop (musik)':'Tidak ada';
  $('#mpCodec').textContent=s==='phone'?'HFP / mSBC, mode telepon':MP.mode==='multi'?'SBC atau AAC (umumnya)':'AAC, aptX, atau LDAC sesuai perangkat';
  $$('#mpMode .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===MP.mode)));
  $('#mpSwitch').hidden=MP.mode!=='single';
  $('#mpLog').innerHTML=MP.log.map(t=>'<li>'+t+'</li>').join('')||'<li>Pilih sebuah kejadian untuk melihat apa yang terjadi.</li>';
}
function mpSetMode(m){
  MP.mode=m;MP.call='idle';
  if(m==='single'){MP.link={laptop:true,phone:false};mpLog('Mode tanpa multipoint: headset hanya terhubung ke Laptop.')}
  else{MP.link={laptop:true,phone:true};mpLog('Multipoint aktif: headset terhubung ke Laptop dan HP sekaligus.')}
  renderMP();
}
$$('#mpMode .chip').forEach(b=>b.addEventListener('click',()=>mpSetMode(b.dataset.m)));
$$('#mpActs [data-a]').forEach(b=>b.addEventListener('click',()=>{
  const a=b.dataset.a,m=MP;
  if(a==='music'){
    m.music=!m.music;
    if(!m.music)mpLog('Musik laptop dijeda.');
    else if(!m.link.laptop)mpLog('Laptop tidak terhubung ke headset. Musik keluar dari speaker laptop.');
    else if(m.call!=='idle')mpLog('Musik menunggu. Panggilan di HP diprioritaskan.');
    else{mpLog('Laptop mengirim musik ke headset.');ring('music')}
  }else if(a==='call'){
    if(!m.link.phone)mpLog('HP berdering, tetapi headset tidak terhubung ke HP. Panggilan terlewat kecuali kamu berpindah koneksi.');
    else if(m.call!=='idle')mpLog('Panggilan sudah berlangsung.');
    else{m.call='ringing';mpLog(m.music?'HP berdering di headset. Musik laptop dijeda otomatis (perilaku bergantung model).':'HP berdering di headset.');ring('ring')}
  }else if(a==='answer'){
    if(m.call==='ringing'){m.call='active';mpLog('Panggilan diangkat. Mikrofon aktif dan kualitas turun ke mode telepon (HFP).')}
    else mpLog('Tidak ada panggilan yang berdering.');
  }else if(a==='hangup'){
    if(m.call!=='idle'){m.call='idle';mpLog(m.music&&m.link.laptop?'Panggilan selesai. Musik laptop lanjut. Sebagian model perlu tekan play manual.':'Panggilan selesai.')}
    else mpLog('Tidak ada panggilan.');
  }else if(a==='ping'){
    if(m.link.phone){mpLog('Notifikasi HP terdengar di headset (perilaku bergantung model).');ring('ping')}
    else mpLog('Headset tidak terhubung ke HP, notifikasi tidak terdengar.');
  }else if(a==='switch'){
    const toPhone=m.link.laptop;m.link={laptop:!toPhone,phone:toPhone};m.call='idle';
    mpLog('Memutus koneksi lama lalu menyambung ke '+(toPhone?'HP':'Laptop')+'. Butuh beberapa detik, dan musik harus diputar ulang.');
  }
  renderMP();
}));
