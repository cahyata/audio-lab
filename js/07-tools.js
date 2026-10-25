'use strict';
/* ================= ALAT UJI ================= */
const plotSw=new FreqPlot($('#plotSweep'),{range:[0,1],axis:false,marks:[{f:1000,label:'1,0 kHz'}],hint:'Tekan Putar nada'});
const Sw={on:false,auto:false,osc:null,g:null,t0:0,f:1000};
const swFreq=v=>20*Math.pow(1000,v/1000);
function zoneOf(f){const z=ZONES.find(z=>f>=z[1]&&f<z[2])||ZONES[ZONES.length-1];return z[0]}
function swComp(f){return .03*clamp(Math.pow(300/f,.8),1,6)*(f>9000?1.8:1)}
function swSet(f){
  Sw.f=f;
  $('#swFO').textContent=(f>=1000?fmt(f/1000,2)+' kHz':Math.round(f)+' Hz')+' ('+zoneOf(f).toLowerCase()+')';
  plotSw.o.marks=[{f,label:f>=1000?fmt(f/1000,2)+' kHz':Math.round(f)+' Hz'}];
  if(Sw.on){const t=ctx.currentTime;Sw.osc.frequency.setTargetAtTime(f,t,.02);Sw.g.gain.setTargetAtTime(swComp(f),t,.05)}
}
function swStart(auto){
  claim('sw');ensureAudio();
  Sw.osc=ctx.createOscillator();Sw.osc.type='sine';Sw.osc.frequency.value=Sw.f;
  Sw.g=ctx.createGain();Sw.g.gain.setValueAtTime(0,ctx.currentTime);Sw.g.gain.linearRampToValueAtTime(swComp(Sw.f),ctx.currentTime+.08);
  Sw.osc.connect(Sw.g);Sw.g.connect(G.util);Sw.osc.start();Sw.on=true;busy.add('sw');
  Sw.auto=!!auto;Sw.t0=performance.now();if(auto)Sw.startV=0;
  swBtns();if(auto)swTick();
}
function swTick(){
  if(!Sw.on||!Sw.auto)return;
  const p=(performance.now()-Sw.t0)/25000;
  if(p>=1){swStop();return}
  const v=p*1000;$('#swF').value=v;swSet(swFreq(v));requestAnimationFrame(swTick);
}
function swStop(){
  if(!Sw.on)return;Sw.on=false;Sw.auto=false;busy.delete('sw');
  const t=ctx.currentTime,o=Sw.osc,g=Sw.g;g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(0,t,.03);
  setTimeout(()=>{try{o.stop();o.disconnect();g.disconnect()}catch(e){}},250);swBtns();
}
function swBtns(){
  $('#swPlay').setAttribute('aria-pressed',String(Sw.on&&!Sw.auto));$('#swPlay').textContent=Sw.on&&!Sw.auto?'Hentikan nada':'Putar nada';
  $('#swAuto').setAttribute('aria-pressed',String(Sw.on&&Sw.auto));$('#swAuto').textContent=Sw.on&&Sw.auto?'Hentikan sapuan':'Sapu otomatis, 25 detik';
}
stoppers.set('sw',swStop);
$('#swF').addEventListener('input',e=>{if(Sw.auto){Sw.auto=false;swBtns()}swSet(swFreq(+e.target.value))});
$('#swPlay').addEventListener('click',()=>{if(Sw.on&&!Sw.auto)swStop();else{if(Sw.on)swStop();swStart(false)}});
$('#swAuto').addEventListener('click',()=>{if(Sw.on&&Sw.auto)swStop();else{if(Sw.on)swStop();$('#swF').value=0;swSet(20);swStart(true)}});
swSet(swFreq(333));

/* tes kanal */
function pinkBuffer(c,sec){
  const n=Math.floor(c.sampleRate*sec),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for(let i=0;i<n;i++){const w=Math.random()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}
  return b;
}
function chanTest(kind){
  claim('chan');ensureAudio();
  const src=ctx.createBufferSource();src.buffer=pinkBuffer(ctx,.5);
  const env=ctx.createGain();env.gain.value=.25;
  let t=ctx.currentTime+.05;
  if(kind==='P'){
    const sp=ctx.createChannelSplitter(1),mg=ctx.createChannelMerger(2),inv=ctx.createGain();inv.gain.value=-1;
    src.connect(mg,0,0);src.connect(inv);inv.connect(mg,0,1);mg.connect(env);
  }else{
    const p=ctx.createStereoPanner();p.pan.value=kind==='L'?-1:kind==='R'?1:0;src.connect(p);p.connect(env);
  }
  env.connect(G.util);
  /* tiga semburan lewat penjadwalan gain */
  env.gain.setValueAtTime(0,t);
  [0,.8,1.6].forEach(o=>{env.gain.setValueAtTime(0,t+o);env.gain.linearRampToValueAtTime(.25,t+o+.02);env.gain.setValueAtTime(.25,t+o+.4);env.gain.linearRampToValueAtTime(0,t+o+.45)});
  src.loop=true;src.start(t);src.stop(t+2.1);
  busy.add('chan');setTimeout(()=>busy.delete('chan'),2200);
}
stoppers.set('chan',()=>{});
$$('#chanBtns [data-c]').forEach(b=>b.addEventListener('click',()=>chanTest(b.dataset.c)));

/* lembar uji */
const CK=[
  'Bass: kick punya benturan awal yang jelas lalu berhenti cepat, bukan dengung (punch, bukan muddy atau boomy).',
  'Low-mid: garis bass dan pad bisa dibedakan satu sama lain (separation).',
  'Mid: vokal terbuka, tidak seperti dalam kotak (boxy) dan tidak agresif (shouty).',
  'Treble: hi-hat dan desis "s" terdengar halus, tidak menusuk (piercing) atau mendesis keras (sibilance).',
  'Detail: ekor hi-hat dan hal halus lain terdengar tanpa menaikkan volume (detail dan clarity).',
  'Panggung: instrumen tersebar kiri-kanan dan ada kesan jarak (soundstage).',
  'Timbre: nada vokal dan pad terdengar wajar, tidak metalik atau plastik.',
  'Koheren: vokal, kick, dan hi-hat terasa satu sumber (terutama pada IEM multi-driver).',
  'Nyaman: tidak terasa lelah setelah mendengar 30 menit.'
];
const ckState=store.get('lab-audio-ck',{c:Array(CK.length).fill(false),name:'',note:''});
const ckList=$('#ckList');
CK.forEach((t,i)=>{const l=document.createElement('label');l.className='check';l.innerHTML='<input type="checkbox" id="ck'+i+'"><span>'+t+'</span>';ckList.appendChild(l)});
function ckSync(){const n=ckState.c.filter(Boolean).length;$('#ckSum').textContent=n+' dari '+CK.length+' poin terdengar baik pada perangkat ini.'}
CK.forEach((_,i)=>{const el=$('#ck'+i);el.checked=!!ckState.c[i];el.addEventListener('change',()=>{ckState.c[i]=el.checked;store.set('lab-audio-ck',ckState);ckSync()})});
$('#ckName').value=ckState.name||'';$('#ckNote').value=ckState.note||'';
$('#ckName').addEventListener('input',e=>{ckState.name=e.target.value;store.set('lab-audio-ck',ckState)});
$('#ckNote').addEventListener('input',e=>{ckState.note=e.target.value;store.set('lab-audio-ck',ckState)});
ckSync();

/* ringkasan */
const GL=[
  ['Vokal','Suara manusia dalam lagu. Natural jika tubuh, artikulasi, presence, dan sibilan seimbang.','85 Hz–9 kHz','#vokal'],
  ['Sibilance','Desis tajam pada huruf s, t, c. Berlebih jika ada puncak di treble.','6–9 kHz','#peta'],
  ['Soundstage','Ukuran ruang yang terbentuk: lebar, dalam, dan jarak.','Tuning dan desain cup','#ruang'],
  ['Separation','Kemampuan membedakan tiap lapisan instrumen yang bermain bersamaan.','Semua pita','#ruang'],
  ['Timbre','Warna suara yang membedakan alat musik, ditentukan komposisi harmonik.','Semua pita','#timbre'],
  ['Punch','Dentuman yang memukul: serangan awal cepat dan bass cepat berhenti.','50–120 Hz dan 2–4 kHz','#punch'],
  ['Transient','Pola sebuah nada: attack lalu decay. Sering disebut kecepatan driver.','Semua pita','#punch'],
  ['Attack','Seberapa lama titik awal nada diseret. Makin singkat makin bersih, yang panjang terdengar tumpul.','Semua pita','#punch'],
  ['Decay','Seberapa lama nada melingkar sesudah dibunyikan. Terlalu panjang jadi muddy, terlalu pendek terdengar tidak natural.','Semua pita','#punch'],
  ['Tekstur','Halus atau berbutir, berasal dari bentuk attack dan panjang decay.','Semua pita','#punch'],
  ['Timbre plastik','Terdengar hampa dan tanpa bobot: decay terlalu cepat dan tonality terang.','Treble','#timbre'],
  ['Timbre metalik','Decay berdenyut atau puncak treble yang salah tempat.','Treble','#timbre'],
  ['Hangat (warm)','Kehangatan dari bass dan low-mid yang sedikit naik plus decay yang cukup. Beda dari muddy.','60–500 Hz','#peta'],
  ['Gelap / terang','Gelap: condong ke frekuensi rendah. Terang: condong ke frekuensi tinggi.','Bass atau treble','#peta'],
  ['THD (distorsi harmonik)','Angka distorsi harmonik. Korelasinya dengan selera pendengar lemah, jadi bukan penentu kualitas.','Semua pita','#harga'],
  ['Detail / clarity','Terdengarnya hal halus dan kesan tiap elemen terpisah jelas. Resolusi sejati adalah technicality, treble terang hanya memberi kesannya.','3–14 kHz','#peta'],
  ['Driver','Komponen yang mengubah sinyal listrik jadi getaran: DD, BA, planar, EST.','-','#driver'],
  ['Open-back','Cup terbuka di belakang: lebih lega dan ringan di bass, tetapi bocor dan kurang isolasi.','-','#bukatutup'],
  ['Closed-back','Cup tertutup: isolasi baik dan bass tebal, panggung cenderung lebih sempit.','-','#bukatutup'],
  ['Multipoint connection','Satu headset Bluetooth terhubung ke dua perangkat sekaligus.','-','#multipoint'],
  ['Piercing','Treble menusuk dan menyakitkan, lebih tajam daripada shouty.','4–7 kHz','#peta'],
  ['Shouty','Vokal dan mid maju agresif seperti berteriak, melelahkan.','2–4 kHz','#peta'],
  ['Muddy','Berkabut: bass dan low-mid menumpuk sehingga instrumen sulit dibedakan.','150–400 Hz','#peta'],
  ['Boxy','Seperti bicara dari dalam kotak: tertutup dan hidung.','400–900 Hz','#peta'],
  ['Koheren','Beberapa driver terdengar seperti satu sumber, selaras waktu dan fase.','Sekitar crossover','#koheren'],
  ['Imaging','Ketepatan posisi tiap sumber suara di dalam panggung.','2–5 kHz dan fase','#ruang']
];
const glBody=$('#glTable tbody');
const TON=['Vokal','Sibilance','Piercing','Shouty','Muddy','Boxy','Gelap / terang'];
const OVL=['Timbre','Timbre plastik','Timbre metalik','Hangat (warm)','Tekstur'];
function glBold(s){
  const i=s.indexOf('. ');
  if(i>0)return '<b>'+s.slice(0,i+1)+'</b>'+s.slice(i+1);
  const j=s.search(/[:,]/);
  return j>0?'<b>'+s.slice(0,j)+'</b>'+s.slice(j):'<b>'+s+'</b>';
}
function glRender(q){
  q=(q||'').toLowerCase().trim();
  const cat=n=>TON.includes(n)?'Tonality':OVL.includes(n)?'Irisan':'Technicality';
  const order={Tonality:0,Irisan:1,Technicality:2};
  const rows=GL.map(r=>[cat(r[0]),...r]);
  rows.sort((a,b)=>order[a[0]]-order[b[0]]);
  glBody.innerHTML=rows.filter(r=>!q||r.join(' ').toLowerCase().includes(q)).map(r=>'<tr><td>'+r[1]+'</td><td class="mono" style="font-size:.76rem;color:var(--signal)">'+r[0]+'</td><td>'+glBold(r[2])+'</td><td class="mono num" style="font-size:.82rem">'+r[3]+'</td><td><a href="'+r[4]+'">Buka</a></td></tr>').join('')||'<tr><td colspan="5">Tidak ada istilah yang cocok.</td></tr>';
}
$('#glSearch').addEventListener('input',e=>glRender(e.target.value));
glRender('');
