'use strict';
/* ================= PETA ================= */
const TERMS={
  flat:{name:'Flat (acuan)',zone:'Tanpa penekanan',eq:[0,0,0,0,0,0,0,0,0],hi:[],
    def:'<b>Semua daerah frekuensi setara.</b> Ini titik awal untuk membandingkan. Dengarkan satu putaran lagu dulu sebelum mencoba istilah lain.',
    hear:'Vokal di depan, bass jelas tapi tidak mengganggu, hi-hat tidak tajam.',
    cause:'Tidak ada headset yang benar-benar flat. Pakai Flat sebagai acuan untuk membandingkan.'},
  warm:{name:'Hangat (warm)',zone:'60–500 Hz naik',eq:[3,3,2,0,-1,-1,-2,-2,-3],hi:[[60,500]],
    def:'<b>Kehangatan</b> datang dari bass dan low-mid yang sedikit naik, ditambah decay yang cukup. Suara terasa kaya dan berbobot tanpa kehilangan kejelasan.',
    hear:'Vokal dan instrumen terasa lebih tebal. Bandingkan dengan Muddy: di sana semuanya jadi berkabut.',
    cause:'Tonality condong ke frekuensi rendah. Kalau terlalu jauh, hangat berubah jadi lumpur. Hangat bukan lebih baik atau lebih buruk, hanya soal selera.'},
  muddy:{name:'Muddy',zone:'150–400 Hz',eq:[2,4,8,2,0,-2,-2,-2,-3],hi:[[150,400]],
    def:'Suara terdengar <b>berkabut, seperti ada selimut di atas musik</b>. Bass dan low-mid menumpuk sehingga garis bass, pad, dan badan vokal saling menutupi.',
    hear:'Fokus pada bass dan badan vokal. Ujung tiap not bass tidak jelas, dan lirik vokal lebih sulit ditangkap dibanding Flat.',
    cause:'Gundukan di 150–400 Hz, bass yang lambat berhenti, ear tips yang menumpuk tekanan bass di kanal telinga, atau cup headset yang bergaung.'},
  boxy:{name:'Boxy',zone:'400–900 Hz',eq:[0,0,1,8,4,0,0,-1,-1],hi:[[400,900]],
    def:'Suara <b>seperti keluar dari dalam kotak kardus</b>. Vokal bernada hidung, tertutup, dan kurang udara.',
    hear:'Vokal menyempit dan terdengar "ho-hong". Pad terdengar sesak di tengah.',
    cause:'Puncak di 400–900 Hz, resonansi di nozzle atau rumah IEM yang kecil, atau cup tertutup yang kurang diredam.'},
  shouty:{name:'Shouty',zone:'2–4 kHz',eq:[0,0,0,0,2,8,3,0,0],hi:[[2000,4000]],
    def:'Vokal dan instrumen mid <b>maju secara agresif, seperti orang berteriak</b>. Awalnya terasa dekat dan jelas, tetapi cepat melelahkan.',
    hear:'Vokal menusuk ke depan dan terdengar keras walau volume sama. Telinga paling peka di daerah ini, jadi beberapa dB saja sudah terasa.',
    cause:'Penekanan 2–4 kHz yang berlebihan pada tuning, atau resonansi telinga pemakai yang bertabrakan dengan puncak tuning.'},
  piercing:{name:'Piercing',zone:'4–7 kHz',eq:[0,0,0,0,0,1,8,4,3],hi:[[4000,7000]],
    def:'Nada tinggi terasa <b>menusuk atau menyakitkan</b>, terutama snare, cymbal, dan vokal tinggi. Lebih tinggi dan lebih tajam daripada shouty.',
    hear:'Hi-hat terdengar seperti jarum, snare retak kasar. Setelah beberapa menit telinga ingin istirahat.',
    cause:'Puncak sempit di 4–7 kHz (resonansi driver atau nozzle), treble yang dibuat agresif demi kesan detail, atau ear tips yang menggeser resonansi.'},
  sibilance:{name:'Sibilance',zone:'6–9 kHz',eq:[0,0,0,0,0,0,2,10,3],hi:[[6000,9000]],
    def:'Huruf s, sy, t, dan c pada vokal berubah jadi <b>desis tajam</b>. Sedikit sibilance ada di rekaman, dan headset dengan puncak di 6–9 kHz memperburuknya.',
    hear:'Tunggu akhir kata pada vokal, saat desis "ssss" muncul. Bandingkan kerasnya dengan Flat. Bagian Vokal di bawah punya pita khusus untuk ini.',
    cause:'Puncak di 6–9 kHz, atau rekaman yang terlalu terang tanpa de-esser.'},
  clear:{name:'Detail dan clarity',zone:'3–14 kHz naik',eq:[0,-1,-2,-1,0,2,3,3,5],hi:[[3000,14000]],
    def:'<b>Detail adalah kemampuan mendengar hal halus</b>: ekor cymbal, napas penyanyi, gesekan senar. <b>Clarity adalah kesan bahwa semuanya terpisah jelas</b>. Menaikkan treble sedikit memberi kesan lebih jernih.',
    hear:'Ekor hi-hat dan desis napas lebih terdengar. Jika mulai tajam, kamu sudah melewati batas dan masuk ke piercing.',
    cause:'Detail sejati berasal dari distorsi rendah dan transient cepat. Treble yang dinaikkan hanya membuat kesan detail, bukan detail yang bertambah.'},
  dull:{name:'Tumpul',zone:'5–20 kHz turun',eq:[1,1,1,0,0,-2,-5,-7,-10],hi:[[5000,20000]],
    def:'Kebalikan clarity: <b>treble dan udara turun</b> sehingga suara tertutup dan detail halus hilang.',
    hear:'Hi-hat hanya "tek" pendek, desis vokal hampir hilang, musik terdengar seperti dari balik pintu.',
    cause:'Roll-off treble pada driver, ear tips yang meredam, atau seal yang bocor sehingga keseimbangan bergeser.'},
  vshape:{name:'V-shape',zone:'Bass dan treble naik',eq:[5,3,-1,-3,-3,-1,3,4,5],hi:[[20,150],[5000,20000]],
    def:'<b>Bass dan treble dinaikkan, mid diturunkan.</b> Awalnya seru karena dentuman dan kilau terdengar jelas, tetapi vokal terdorong mundur.',
    hear:'Kick dan hi-hat menonjol, vokal terdengar lebih jauh dibanding Flat.',
    cause:'Tuning ala konsumen yang mengejar kesan "wow" pada sekali dengar.'}
};
const TERM_ORDER=['flat','warm','muddy','boxy','shouty','piercing','sibilance','clear','dull','vshape'];
const plotEq=new FreqPlot($('#plotEq'),{range:[-18,18],step:6,curve:eqCurve,hi:[]});
chipRow($('#termChips'),TERM_ORDER.map(k=>[k,TERMS[k].name]),k=>{engage('eq');P.eq=[...TERMS[k].eq];commit()});
const eqBank=$('#eqBank');
EQ_BANDS.forEach((b,i)=>{
  const col=document.createElement('div');col.className='eqcol';
  col.innerHTML='<output id="eqo'+i+'">0</output><input class="vs" id="eqs'+i+'" type="range" min="-12" max="12" step="0.5" value="0" orient="vertical" aria-label="Band '+b.label+' Hz"><span>'+b.label+'</span>';
  eqBank.appendChild(col);
  $('#eqs'+i).addEventListener('input',e=>{engage('eq');P.eq[i]=+e.target.value;commit()});
});
function matchTerm(){return TERM_ORDER.find(k=>TERMS[k].eq.every((v,i)=>v===P.eq[i]))||null}
function syncPeta(){
  P.eq.forEach((v,i)=>{const s=$('#eqs'+i);if(+s.value!==v)s.value=v;$('#eqo'+i).textContent=(v>0?'+':'')+String(v).replace('.',',')});
  const k=matchTerm(),t=k?TERMS[k]:null;
  markChip($('#termChips'),k);
  plotEq.o.hi=t?t.hi:[];
  $('#tdName').textContent=t?t.name:'Kustom';
  $('#tdZone').textContent=t?t.zone:'Atur sendiri';
  $('#tdZone').style.display='';
  $('#tdDef').innerHTML=t?t.def:'Kombinasi pengaturanmu sendiri. Lihat kurva oranye di grafik untuk bentuk responsnya, lalu cocokkan dengan istilah di atas.';
  $('#tdHear').textContent=t?t.hear:'Geser satu band saja pada satu waktu, supaya kamu tahu daerah mana yang menyebabkan perubahan.';
  $('#tdCause').textContent=t?t.cause:'Tergantung bentuk kurvanya.';
}

/* ================= VOKAL ================= */
const VBANDS={
  all:['Semua',20,20000,'Seluruh pita, suara aslinya.'],
  body:['Tubuh',80,400,'80–400 Hz: tubuh dan kehangatan vokal. Terlalu banyak jadi muddy, terlalu sedikit vokal terdengar kurus.'],
  nasal:['Hidung',400,1000,'400 Hz–1 kHz: bagian "hidung". Terlalu banyak jadi boxy.'],
  art:['Artikulasi',1000,3000,'1–3 kHz: bagian yang membuat kata mudah dimengerti.'],
  pres:['Presence',3000,5000,'3–5 kHz: vokal terasa dekat dan hidup. Terlalu banyak jadi shouty.'],
  sib:['Sibilan',5000,9000,'5–9 kHz: desis s dan t. Terlalu banyak jadi sibilance dan piercing. Hanya terdengar saat bagian "s" diputar.'],
  air:['Udara',9000,16000,'9–16 kHz: napas dan udara di sekitar vokal. Jika hilang, suara terasa tumpul.']
};
const Vox={on:false,vowel:'a',who:'m',band:'all',id:null,live:[],hp:[],lp:[],inn:null};
const plotVox=new FreqPlot($('#plotVox'),{range:[0,1],axis:false,hi:[],marks:[],hint:'Tekan Putar vokal'});
chipRow($('#voxVowels'),[['a','A'],['e','E'],['i','I'],['o','O'],['u','U']],k=>{Vox.vowel=k;voxSync();if(Vox.on)voxRestart()});
chipRow($('#voxWho'),[['m','Pria, ±120 Hz'],['f','Wanita, ±220 Hz']],k=>{Vox.who=k;voxSync();if(Vox.on)voxRestart()});
chipRow($('#voxBands'),Object.entries(VBANDS).map(([k,v])=>[k,v[0]]),k=>{Vox.band=k;voxSync();voxFilters()});
function voxSync(){
  markChip($('#voxVowels'),Vox.vowel);markChip($('#voxWho'),Vox.who);markChip($('#voxBands'),Vox.band);
  const fs=Vox.who==='f'?1.17:1,F=VOWELS[Vox.vowel];
  plotVox.o.marks=F.map((f,i)=>({f:f*fs,label:'F'+(i+1)}));
  const b=VBANDS[Vox.band];plotVox.o.hi=Vox.band==='all'?[]:[[b[1],b[2]]];
  $('#voxBandInfo').textContent=b[3];
}
function voxFilters(){
  if(!Vox.hp.length)return;
  const b=VBANDS[Vox.band],t=ctx.currentTime;
  Vox.hp.forEach(f=>f.frequency.setTargetAtTime(b[1],t,.02));Vox.lp.forEach(f=>f.frequency.setTargetAtTime(b[2],t,.02));
}
function voxCycle(){
  const t=ctx.currentTime+.05,f=Vox.who==='f'?220:120,fs=Vox.who==='f'?1.17:1;
  Vox.live.push(voiceNote(ctx,Vox.inn,t,1.15,f,Vox.vowel,MIX.vox*1.2,fs));
  sBurst(ctx,Vox.inn,t+1.12,.3,MIX.sib*1.6);
  if(Vox.live.length>6)Vox.live.shift();
}
function voxStart(){
  claim('vox');ensureAudio();
  Vox.inn=ctx.createGain();
  const mk=(type)=>{const f=ctx.createBiquadFilter();f.type=type;f.Q.value=BUTTER_Q;return f};
  Vox.hp=[mk('highpass'),mk('highpass')];Vox.lp=[mk('lowpass'),mk('lowpass')];
  Vox.inn.connect(Vox.hp[0]);Vox.hp[0].connect(Vox.hp[1]);Vox.hp[1].connect(Vox.lp[0]);Vox.lp[0].connect(Vox.lp[1]);Vox.lp[1].connect(G.util);
  voxFilters();Vox.on=true;busy.add('vox');
  voxCycle();Vox.id=setInterval(voxCycle,2000);
  $('#voxPlay').setAttribute('aria-pressed','true');$('#voxPlay').textContent='Hentikan vokal';
}
function voxRestart(){const t=ctx.currentTime;Vox.live.forEach(v=>v.kill(t));Vox.live=[];clearInterval(Vox.id);voxCycle();Vox.id=setInterval(voxCycle,2000)}
function voxStop(){
  if(!Vox.on)return;Vox.on=false;clearInterval(Vox.id);busy.delete('vox');
  const t=ctx.currentTime;Vox.live.forEach(v=>v.kill(t));Vox.live=[];
  const inn=Vox.inn;if(inn){inn.gain.setTargetAtTime(0,t,.02);setTimeout(()=>{try{inn.disconnect()}catch(e){}},400)}
  $('#voxPlay').setAttribute('aria-pressed','false');$('#voxPlay').textContent='Putar vokal';
}
stoppers.set('vox',voxStop);
$('#voxPlay').addEventListener('click',()=>Vox.on?voxStop():voxStart());
voxSync();

/* ================= TIMBRE ================= */
const NH=12;
const Tim={amps:[1,.5,.33,.25,.2,.17,.14,.12,.11,.1,.09,.08],f0:220,peak:false,peakF:1500,osc:null,on:false};
const TPRE={
  sin:['Sinus',[1,0,0,0,0,0,0,0,0,0,0,0]],
  tri:['Segitiga',[1,0,.11,0,.04,0,.02,0,.012,0,.008,0]],
  saw:['Gergaji',Array.from({length:NH},(_,i)=>1/(i+1))],
  sq:['Persegi',Array.from({length:NH},(_,i)=>(i%2===0)?1/(i+1):0)],
  clar:['Klarinet',[1,.02,.75,.03,.5,.04,.3,.03,.15,.02,.08,0]],
  flute:['Seruling',[1,.35,.12,.06,.03,.02,.01,0,0,0,0,0]],
  brass:['Trompet',[1,.9,.8,.7,.55,.4,.3,.2,.12,.08,.05,.03]]
};
chipRow($('#timPresets'),Object.entries(TPRE).map(([k,v])=>[k,v[0]]),k=>{Tim.amps=[...TPRE[k][1]];timSync();timUpdate()});
chipRow($('#timNotes'),[['110','A2, 110 Hz'],['220','A3, 220 Hz'],['440','A4, 440 Hz']],k=>{Tim.f0=+k;timSync();timUpdate()});
const hb=$('#harmBank');
for(let i=0;i<NH;i++){
  const col=document.createElement('div');col.className='eqcol';
  col.innerHTML='<input class="vs" style="height:90px;width:20px" id="hs'+i+'" type="range" min="0" max="100" value="0" orient="vertical" aria-label="Harmonik ke-'+(i+1)+'"><span>'+(i+1)+'</span>';
  hb.appendChild(col);
  $('#hs'+i).addEventListener('input',e=>{Tim.amps[i]=e.target.value/100;timSync(true);timUpdate()});
}
function peakMag(freqs){
  if(!Tim.peak||!shadow)return freqs.map(()=>1);
  shadow.pk.frequency.value=Tim.peakF;const f=Float32Array.from(freqs),r=resp(shadow.pk,f);return [...r.m];
}
function timEff(){const mags=peakMag(Tim.amps.map((_,i)=>Tim.f0*(i+1)));return Tim.amps.map((a,i)=>a*mags[i])}
const drawWave=autoCanvas($('#cvWave'),(c,w,h)=>{
  const T=theme,orig=Tim.amps,eff=timEff();
  c.strokeStyle=T.line;c.lineWidth=1;c.beginPath();c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke();
  const wave=a=>{const N=360,ys=[];let mx=1e-6;for(let s=0;s<N;s++){const x=s/N*2;let y=0;for(let k=0;k<NH;k++)y+=a[k]*Math.sin(2*Math.PI*(k+1)*x);ys.push(y);mx=Math.max(mx,Math.abs(y))}return {ys,mx}};
  const A=wave(orig),B=wave(eff),mx=Math.max(A.mx,B.mx);
  const path=(W,col,wd,dash)=>{c.beginPath();W.ys.forEach((y,s)=>{const X=s/(W.ys.length-1)*w,Y=h/2-y/mx*(h/2-8);s?c.lineTo(X,Y):c.moveTo(X,Y)});c.strokeStyle=col;c.lineWidth=wd;c.setLineDash(dash);c.stroke();c.setLineDash([])};
  if(Tim.peak)path(A,T.ink2,1.2,[4,4]);
  path(B,T.accent,2.2,[]);
  c.fillStyle=T.ink2;c.font='500 10px "JetBrains Mono",monospace';c.textAlign='left';c.fillText('bentuk gelombang, 2 periode',8,12);
});
const drawHarm=autoCanvas($('#cvHarm'),(c,w,h)=>{
  const T=theme,orig=Tim.amps,eff=timEff(),mx=Math.max(1,...eff)*1.08,pad=8,bw=(w-pad*2)/NH,bot=h-18;
  c.font='500 10px "JetBrains Mono",monospace';c.textAlign='center';
  for(let i=0;i<NH;i++){
    const x=pad+i*bw+bw*.18,ww=bw*.64,ho=orig[i]/mx*(bot-14),he=eff[i]/mx*(bot-14);
    c.fillStyle=T.accent;c.fillRect(x,bot-he,ww,he);
    if(Tim.peak){c.strokeStyle=T.ink2;c.lineWidth=1.2;c.setLineDash([3,3]);c.strokeRect(x,bot-ho,ww,ho);c.setLineDash([])}
    c.fillStyle=T.ink2;c.fillText(String(i+1),x+ww/2,h-5);
  }
  if(Tim.peak){const px=pad+(Math.log(Tim.peakF/Tim.f0)/Math.log(NH)*0+0)}
  c.textAlign='left';c.fillText(Tim.f0+' Hz x harmonik',8,12);
});
function timSync(fromSlider){
  if(!fromSlider)Tim.amps.forEach((a,i)=>{$('#hs'+i).value=Math.round(a*100)});
  markChip($('#timNotes'),Tim.f0);
  const k=Object.keys(TPRE).find(k=>TPRE[k][1].every((v,i)=>Math.abs(v-Tim.amps[i])<.005));markChip($('#timPresets'),k||'');
  $('#timPeakFo').textContent=Tim.peakF+' Hz';
  drawWave();drawHarm();
}
function timWave(){
  const re=new Float32Array(NH+1),im=new Float32Array(NH+1);
  Tim.amps.forEach((a,i)=>im[i+1]=a);
  if(Tim.amps.every(a=>a===0))im[1]=.0001;
  return ctx.createPeriodicWave(re,im);
}
function timUpdate(){
  if(!Tim.on||!Tim.osc)return;
  const t=ctx.currentTime;
  Tim.osc.setPeriodicWave(timWave());Tim.osc.frequency.setTargetAtTime(Tim.f0,t,.01);
  Tim.pk.frequency.setTargetAtTime(Tim.peakF,t,.02);Tim.pk.gain.setTargetAtTime(Tim.peak?9:0,t,.02);
}
function timStart(){
  claim('tim');ensureAudio();
  Tim.osc=ctx.createOscillator();Tim.osc.setPeriodicWave(timWave());Tim.osc.frequency.value=Tim.f0;
  Tim.pk=ctx.createBiquadFilter();Tim.pk.type='peaking';Tim.pk.Q.value=2.5;Tim.pk.frequency.value=Tim.peakF;Tim.pk.gain.value=Tim.peak?9:0;
  Tim.g=ctx.createGain();Tim.g.gain.setValueAtTime(0,ctx.currentTime);Tim.g.gain.linearRampToValueAtTime(.12,ctx.currentTime+.06);
  Tim.osc.connect(Tim.pk);Tim.pk.connect(Tim.g);Tim.g.connect(G.util);Tim.osc.start();
  Tim.on=true;busy.add('tim');$('#timPlay').setAttribute('aria-pressed','true');$('#timPlay').textContent='Hentikan nada';
}
function timStop(){
  if(!Tim.on)return;Tim.on=false;busy.delete('tim');
  const t=ctx.currentTime,o=Tim.osc,g=Tim.g;g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(0,t,.02);
  setTimeout(()=>{try{o.stop();o.disconnect();g.disconnect()}catch(e){}},200);
  $('#timPlay').setAttribute('aria-pressed','false');$('#timPlay').textContent='Putar nada';
}
stoppers.set('tim',timStop);
$('#timPlay').addEventListener('click',()=>Tim.on?timStop():timStart());
$('#timPeak').addEventListener('change',e=>{Tim.peak=e.target.checked;timSync(true);timUpdate()});
$('#timPeakF').addEventListener('input',e=>{Tim.peakF=+e.target.value;timSync(true);timUpdate()});
timSync();
