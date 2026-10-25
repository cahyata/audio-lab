'use strict';
/* ================= belajar bertahap ================= */
const STEPS=[
  {s:'Persiapan',t:'Siapkan perangkat',min:3,show:['alat'],focus:null,goal:'Pastikan suara yang kamu dengar apa adanya.',
   todo:['Pakai IEM atau headset, volume kecil.','Tekan <b>Kiri</b>, <b>Tengah</b>, <b>Kanan</b>. Suara harus datang dari sisi yang benar.','Pakai IEM? Ganti ear tips sampai bass terasa penuh.']},
  {s:'Peta frekuensi',t:'Kenali bass, mid, treble',min:3,show:['tonality','peta'],focus:['flat','vshape','dull'],goal:'Lihat di grafik di mana tiap suara berada.',
   todo:['Tekan <b>Putar lagu</b> dan lihat spektrum bergerak.','Bass di kiri, vokal di tengah, desis di kanan.','Coba <b>V-shape</b> dan <b>Tumpul</b>, lalu kembali ke <b>Flat</b>.']},
  {s:'Low-mid',t:'Muddy dan boxy',min:3,show:['peta'],focus:['flat','warm','muddy','boxy'],goal:'Bedakan hangat, muddy, dan boxy.',
   todo:['Pilih <b>Flat</b>, dengarkan vokal dan bass.','Pilih <b>Hangat</b>: tebal tapi tetap jelas. Lalu <b>Muddy</b>: berkabut.','Pilih <b>Boxy</b>: vokal seperti di dalam kotak.']},
  {s:'Treble',t:'Shouty, piercing, sibilance',min:4,show:['peta'],focus:['flat','shouty','piercing','sibilance','clear','dull'],goal:'Kenali suara tajam di treble.',
   todo:['<b>Shouty</b>: vokal terasa berteriak.','<b>Piercing</b>: hi-hat menusuk.','<b>Sibilance</b>: huruf s mendesis. Lalu coba <b>Detail</b> dan <b>Tumpul</b>.']},
  {s:'Vokal dan timbre',t:'Vokal dan timbre',min:4,show:['vokal','timbre'],focus:null,goal:'Dengar bagian-bagian suara dan warna nada.',
   todo:['Vokal: tekan <b>Putar vokal</b>, lalu pilih pita <b>Presence</b> dan <b>Sibilan</b>.','Timbre: pilih preset gelombang dan bandingkan bunyinya.','Nyalakan <b>puncak respons</b>, dengar nada berubah.']},
  {s:'Transient',t:'Punch dan transient',min:5,show:['technicality','punch'],focus:null,goal:'Bedakan serangan tajam dari tumpul, dan decay yang pas dari yang terlalu panjang.',
   todo:['Kick: bandingkan <b>Punchy</b> dan <b>Boomy</b>.','Lab transient: pilih <b>Attack tumpul</b>, lalu <b>Decay terlalu panjang</b>.','Coba <b>Decay terlalu pendek</b> dan <b>Decay berdenyut</b>.']},
  {s:'Ruang',t:'Soundstage dan separation',min:4,show:['ruang'],focus:null,goal:'Bedakan ruang yang luas dari instrumen yang jelas. Lab ini memakai lagu sintetis agar tiap instrumen bisa digeser.',
   todo:['Pilih <b>Konser luas</b>.','Pilih <b>Lebar tapi berantakan</b>.','Turunkan <b>Separation</b>, dengar vokal tertutup.']},
  {s:'Driver dan cup',t:'Driver dan tipe cup',min:5,show:['bukatutup','driver'],focus:null,goal:'Kenali apa yang membentuk karakter perangkat.',
   todo:['Pilih <b>Closed-back</b>, lalu <b>Open-back</b>, dengan kebisingan menyala.','Buka tiap jenis driver di bawah.']},
  {s:'Koheren',t:'Koheren',min:4,show:['koheren','multipoint'],focus:null,goal:'Dengar akibat driver yang tidak selaras.',
   todo:['Pilih <b>Terlambat 0,2 ms</b>: vokal berlubang.','Kembali ke <b>Selaras</b>.','Multipoint: coba tombol telepon masuk (opsional).']},
  {s:'Praktik',t:'Uji perangkatmu',min:5,show:['uji'],focus:null,goal:'Terapkan semuanya pada telingamu sendiri.',
   todo:['Pakai <b>lagu sendiri</b> yang kamu hafal.','Centang poin yang terdengar baik.','Lupa istilah? Keluar dan buka tabel istilah.']}
];
const SEC_IDS=['tonality','peta','vokal','timbre','technicality','punch','ruang','bukatutup','driver','koheren','multipoint','harga','alat','uji','istilah'];
const St=Object.assign({step:0,done:[]},store.get('lab-audio-steps',{}),{course:false});
if(!Array.isArray(St.done)||St.done.length!==STEPS.length)St.done=Array(STEPS.length).fill(false);
St.step=clamp(+St.step||0,0,STEPS.length-1);
const stSave=()=>store.set('lab-audio-steps',{step:St.step,done:St.done});
const stepOf=id=>{const i=STEPS.findIndex(s=>s.show.includes(id));return i<0?0:i};
const CHECK='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const strip=$('#stepStrip'),dots=$('#cbSteps');
STEPS.forEach((s,i)=>{
  const b=document.createElement('button');b.className='sp';b.setAttribute('role','listitem');
  b.innerHTML='<span class="n"></span><span class="l">'+s.s+'</span>';
  b.addEventListener('click',()=>stStart(i));strip.appendChild(b);
  const d=document.createElement('button');d.className='cb-dot';d.title='Langkah '+(i+1)+': '+s.s;d.setAttribute('aria-label','Langkah '+(i+1)+', '+s.s);
  d.innerHTML='<span></span>';d.addEventListener('click',()=>stGo(i));dots.appendChild(d);
});
let moved=[];
function mv(node,to){moved.push({node,parent:node.parentNode,next:node.nextSibling});to.appendChild(node)}
function restore(){while(moved.length){const m=moved.pop();m.parent.insertBefore(m.node,m.next&&m.next.parentNode===m.parent?m.next:null)}}
function buildCourse(s){
  const L=$('#cLeft'),R=$('#cRight');
  L.textContent='';R.textContent='';
  mv($('#stepCard'),L);
  const more=document.createElement('details');more.className='more';
  more.innerHTML='<summary>Baca penjelasan lengkap</summary>';
  L.appendChild(more);
  s.show.forEach(id=>{
    const sec=document.getElementById(id);
    if(sec.classList.contains('cat')){mv(sec,more);return}
    const labs=$$('.lab',sec);
    if(!labs.length){mv(sec,R);return}
    $$('.sec-head',sec).forEach(n=>mv(n,more));
    $$('.prose',sec).forEach(n=>mv(n,more));
    labs.forEach(n=>mv(n,R));
    sec.hidden=true;
  });
  [L,R].forEach(p=>p.scrollTop=0);
}
function sizes(){
  const r=document.documentElement.style;
  r.setProperty('--bar',($('#courseBar').hidden?64:$('#courseBar').offsetHeight)+'px');
  r.setProperty('--tp',$('.transport').offsetHeight+'px');
}
window.addEventListener('resize',sizes);
function stApply(){
  restore();$('#cLeft').textContent='';$('#cRight').textContent='';
  const s=STEPS[St.step],c=St.course;
  document.body.classList.toggle('course',c);
  SEC_IDS.forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=c&&!s.show.includes(id)});
  $$('#termChips .chip').forEach(b=>b.hidden=c&&!!s.focus&&!s.focus.includes(b.dataset.k));
  $('#courseBar').hidden=$('#stepCard').hidden=$('#stepFoot').hidden=!c;
  const n=St.done.filter(Boolean).length;
  $$('.sp',strip).forEach((b,i)=>{b.classList.toggle('done',!!St.done[i]);$('.n',b).innerHTML=St.done[i]?CHECK:String(i+1)});
  $('#stStart').textContent=n===0?'Mulai belajar bertahap':n>=STEPS.length?'Ulangi belajar bertahap':'Lanjutkan dari langkah '+(St.step+1);
  if(!c)return;
  $$('.cb-dot',dots).forEach((b,i)=>{b.classList.toggle('cur',i===St.step);b.classList.toggle('done',!!St.done[i]&&i!==St.step);$('span',b).innerHTML=St.done[i]&&i!==St.step?CHECK.replace(/18/g,'12'):String(i+1);if(i===St.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
  $('#cbTitle').textContent='Langkah '+(St.step+1)+' dari '+STEPS.length+': '+s.s;
  $('#cbProg').style.width=((St.step+1)/STEPS.length*100)+'%';
  const last=St.step===STEPS.length-1,nx=STEPS[St.step+1];
  $('#cbPrev').disabled=St.step===0;$('#cbNext').textContent=last?'Selesai':'Lanjut';
  $('#stepCard').innerHTML='<span class="meta">Langkah '+(St.step+1)+' dari '+STEPS.length+', sekitar '+s.min+' menit</span><h3>'+s.t+'</h3><p class="goal">'+s.goal+'</p><ol class="todo">'+s.todo.map(x=>'<li>'+x+'</li>').join('')+'</ol>';
  $('#stepFoot').innerHTML='<button class="btn" id="sfPrev"'+(St.step===0?' disabled':'')+'>Kembali</button><span class="sf-mid">Langkah '+(St.step+1)+' dari '+STEPS.length+'</span><button class="btn primary" id="sfNext">'+(last?'Selesai belajar bertahap':'Lanjut ke langkah '+(St.step+2))+'</button>';
  $('#sfPrev').addEventListener('click',stPrev);$('#sfNext').addEventListener('click',stNext);
  buildCourse(s);sizes();
}
function stPage(dir){
  window.scrollTo({top:0,behavior:'instant'});
  $$('.cpane').forEach(p=>p.scrollTop=0);
  const m=$('main');m.classList.remove('pgf','pgb');void m.offsetWidth;m.classList.add(dir<0?'pgb':'pgf');
}
function stStart(i){
  claim('__step');resetAll();
  if(typeof i==='number')St.step=i;
  St.course=true;stSave();stApply();stPage(1);
}
function stExit(){
  claim('__step');resetAll();St.course=false;stSave();stApply();
  $('#jalur').scrollIntoView({behavior:'instant'});
}
function stGo(i){
  const dir=i>=St.step?1:-1;
  claim('__step');resetAll();St.step=clamp(i,0,STEPS.length-1);stSave();stApply();stPage(dir);
}
function stPrev(){if(St.step>0)stGo(St.step-1)}
function stNext(){
  St.done[St.step]=true;
  if(St.step===STEPS.length-1){stSave();stExit()}else stGo(St.step+1);
}
$('#cbPrev').addEventListener('click',stPrev);$('#cbNext').addEventListener('click',stNext);$('#cbExit').addEventListener('click',stExit);
$('#stStart').addEventListener('click',()=>stStart());
$('#heroStart').addEventListener('click',()=>stStart());
/* tautan ke bagian yang sedang disembunyikan: pindah ke halaman yang memuatnya */
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');if(!a||!St.course)return;
  const id=a.getAttribute('href').slice(1),el=id&&document.getElementById(id);
  if(!el||!el.hidden)return;
  e.preventDefault();if(stepOf(id)!==St.step)stGo(stepOf(id));
});
stApply();
