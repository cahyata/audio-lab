# Lab Audio IEM

Lab dengar interaktif untuk IEM dan headset: teori singkat dan percobaan suara untuk istilah seperti muddy, boxy, shouty, piercing, soundstage, separation, koheren, open-back, dan multipoint. Semua efek dibuat dengan Web Audio API di browser.

## Menjalankan

Halaman memuat file lagu lewat `fetch`, jadi harus dibuka lewat server, bukan klik dua kali `index.html`.

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000/` (pakai `http://`, bukan `https://`).

## Tes otomatis

Buka `http://localhost:8000/tests.html`. Halaman itu memuat aplikasi di iframe tersembunyi lalu menjalankan tes terhadap fungsi aslinya: kurva EQ, crossover, level campuran lagu sintetis, pemilihan sumber lagu, konsistensi langkah belajar, keutuhan DOM, dan tautan. Hasilnya tampil sebagai daftar lolos atau gagal.

## Struktur

| File | Isi |
| --- | --- |
| `index.html` | Markup semua bagian |
| `style.css` | Seluruh gaya, dengan token warna terang dan gelap |
| `js/01-core.js` | Fungsi bantu, tema, dan state bersama (`P`) |
| `js/02-audio.js` | Graf audio, sintesis lagu, penjadwal, pemilihan sumber lagu |
| `js/03-plot.js` | Grafik frekuensi (`FreqPlot`) dan respons filter bayangan |
| `js/04-transport.js` | Pemutar bawah, lagu bawaan, lagu sendiri, posisi lagu |
| `js/05-tonality.js` | Peta frekuensi, vokal, timbre |
| `js/06-technicality.js` | Punch, ruang, open/closed, driver, koheren, multipoint |
| `js/07-tools.js` | Sapuan nada, tes kiri-kanan, lembar uji, tabel istilah |
| `js/08-course.js` | Mode belajar bertahap |
| `js/09-ui.js` | Sidebar, scroll-spy, tautan `#bagian` tanpa mengubah URL |

Skrip dimuat berurutan sebagai skrip biasa dan berbagi satu lingkup global, jadi urutan di `index.html` penting.

### Cara kerja audio

- Satu graf: bus tiap instrumen, lalu pembagi crossover, lalu EQ 9 band, lalu penyaring tipe cup, lalu pembatas.
- Satu pemilik demo pada satu waktu (`P.owner`): EQ, ruang, open/closed, atau koheren. `engage()` mengembalikan pengaturan pemilik lain ke netral.
- Sumber lagu (`pickSource()`): lab ruang selalu memakai lagu sintetis agar instrumen bisa digeser. Lab lain memakai lagu sendiri, lalu rekaman bawaan, lalu lagu sintetis bila file tidak ada.
- Penjadwal lagu sintetis memakai Web Worker sebagai pencatat waktu supaya tidak tersendat saat tab berada di latar belakang.

## Sumber konsep

Pembagian **tonality**, **technicality**, dan **irisan** (timbre, hangat, tekstur), serta kerangka transient (attack dan decay), dirangkum dengan kata-kata sendiri dari ["The Tonal-Technical Dichotomy: The IEF Evaluation System"](https://crinacle.com/2021/06/04/the-tonal-technical-dichotomy-the-ief-evaluation-system/) oleh Crinacle (In-Ear Fidelity, 2021). Penulisnya menyebut bagian technicality sebagai pengamatan pribadi yang belum diteliti secara ilmiah, dan halaman ini mencantumkan catatan yang sama. Tanya jawab tentang distorsi (THD) mengikuti argumen artikel itu sekaligus mencatat bahwa tidak semua orang sependapat.

## Lagu bawaan

“Two-Timing Lady” oleh Dazie Mae, lisensi [CC BY-NC-SA 3.0 US](https://creativecommons.org/licenses/by-nc-sa/3.0/us/). Penggunaan harus non-komersial, dengan atribusi, dan file lagunya tidak boleh diubah lalu disebarkan. Jika file `Dazie Mae - Two-Timing Lady.mp3` tidak ada, halaman memakai lagu sintetis.
