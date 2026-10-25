'use strict';
/* ================= transport ================= */
const tPlay=$('#tPlay'),heroPlay=$('#heroPlay');
function togglePlay(){playing()?stopTrack():startTrack()}
tPlay.addEventListener('click',togglePlay);heroPlay.addEventListener('click',togglePlay);
$('#tVol').addEventListener('input',e=>{P.vol=e.target.value/100;applyParams()});
$$('[data-mute]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.mute;P.mute[k]=!P.mute[k];b.setAttribute('aria-pressed',String(!P.mute[k]));applyParams()}));
$('#tReset').addEventListener('click',resetAll);
function syncTransport(){
  const on=playing();
  [tPlay,heroPlay].forEach(b=>{b.setAttribute('aria-pressed',String(on));b.textContent=on?'Hentikan lagu demo':'Putar lagu demo'});
  let m=P.owner?'Demo aktif: <b>'+MODES[P.owner]+'</b>':'Pengaturan netral (flat)';
  if(Real.pending)m='Memuat lagu demo...';
  $('#tMode').innerHTML=m;
  $$('.lab-play').forEach(b=>{b.setAttribute('aria-pressed',String(on));b.textContent=on?'Jeda lagu':'Putar lagu'});
  applyParams();
  const sb=$('#tSong');
  sb.textContent=Song.use?'Kembali ke lagu bawaan':Song.buf?'Pakai lagu sendiri: '+Song.name.slice(0,18):'Pakai lagu sendiri';
  $$('[data-mute]').forEach(b=>b.disabled=pickSource()!=='synth');
  $('#seekBox').hidden=pickSource()==='synth';
}
/* tombol putar/jeda di tiap lab yang memakai lagu */
['#plotEq','#stageMap','#encFig','#plotXo'].forEach(id=>{
  const lab=$(id).closest('.lab'),b=document.createElement('button');
  b.className='btn primary lab-play';b.style.justifySelf='start';b.setAttribute('aria-pressed','false');b.textContent='Putar lagu';
  b.addEventListener('click',id==='#stageMap'?()=>{playing()?stopTrack():engage('stage')}:togglePlay);
  const t=$(':scope > .lab-t',lab);lab.insertBefore(b,t?t.nextSibling:lab.firstChild);
});
function useSong(v){
  const was=playing();stopTrack();Song.use=v;
  if(was||v)startTrack();else syncTransport();
}
$('#tSong').addEventListener('click',()=>{
  if(Song.use)useSong(false);
  else if(Song.buf)useSong(true);
  else $('#tFile').click();
});
$('#tFile').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    ensureAudio();
    Song.buf=await ctx.decodeAudioData(await f.arrayBuffer());Song.name=f.name;useSong(true);
  }catch(err){$('#tMode').textContent='File tidak bisa dibaca. Coba MP3, WAV, atau M4A lain.'}
  e.target.value='';
});
const wake=()=>{if(ctx&&ctx.state!=='running'&&ctx.state!=='closed')ctx.resume().catch(()=>{})};
document.addEventListener('pointerdown',wake,true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&playing())wake()});
/* rekaman bawaan: dimuat dari file di samping halaman. Jika tidak ada, lab memakai lagu sintetis. */
const SONG_URL='Dazie%20Mae%20-%20Two-Timing%20Lady.mp3';
async function loadReal(){
  Real.state='loading';
  try{
    const r=await fetch(SONG_URL);if(!r.ok)throw new Error('http '+r.status);
    Real.buf=await new OfflineAudioContext(2,1,44100).decodeAudioData(await r.arrayBuffer());Real.state='ok';
    $$('.song-credit').forEach(e=>e.hidden=false);
  }catch(e){Real.state='err'}
  if(Real.pending){Real.pending=false;if(!playing())startTrack()}
  syncTransport();
}
loadReal();

/* posisi lagu: geser untuk melompat, jeda lalu putar melanjutkan dari posisi terakhir */
const seek=$('#tSeek');let seeking=false;
const songBuf=()=>{const s=pickSource();return s==='user'?Song.buf:s==='real'?Real.buf:null};
function songPos(buf){const o=offs.get(buf)||0;return Song.on&&Song.cur===buf?(o+ctx.currentTime-Song.t0)%buf.duration:o}
function songSeek(frac){
  const buf=songBuf();if(!buf)return;
  const was=Song.on;if(was)songStop();
  offs.set(buf,clamp(frac,0,.999)*buf.duration);
  if(was)startTrack();
}
['pointerdown','keydown'].forEach(ev=>seek.addEventListener(ev,()=>{seeking=true}));
seek.addEventListener('change',()=>{songSeek(+seek.value/1000);seeking=false});
setInterval(()=>{
  const buf=songBuf();if(!buf||$('#seekBox').hidden||seeking)return;
  const p=songPos(buf);seek.value=Math.round(p/buf.duration*1000);
  $('#tTime').textContent=fmtTime(p)+' / '+fmtTime(buf.duration);
},300);
