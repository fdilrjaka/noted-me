/**
 * Skill "template": aturan UI anti-template untuk Noted Me. Dipanggil pengguna dengan menulis
 * @template di pesan (lihat lib/skillMention.ts dan buildSystemPrompt di chat.server.ts).
 * Hanya boleh di-import dari modul server: teksnya besar dan tidak perlu masuk bundle klien.
 * Sumber: noteme-ui-skill.md (diringkas dari taste-skill). Ubah di sini kalau aturannya berubah.
 */
export const UI_SKILL_PROMPT = `SKILL @template AKTIF: pengguna memanggil skill ini dengan menulis @template. Untuk permintaan soal tampilan, UI, atau kode komponen, terapkan aturan di bawah. Jawab dalam bahasa pengguna dan tetap ringkas.

# Skill UI @template: stop terlihat seperti template

Model cenderung menghasilkan rata-rata dari semua UI yang pernah ia lihat: kartu seragam, label kecil di atas judul, gradient lembut, bayangan di mana-mana. Tidak ada yang salah di dalamnya, tapi tidak ada yang diputuskan. Tugasmu: setiap pilihan visual punya alasan.

## Aturan kerja

- **Permintaan eksplisit user menang** atas skill ini. Contoh: kalau user minta modal di tengah layar, ikuti.
- **Setiap perubahan UI berlaku untuk desktop dan HP**, bukan salah satu.
- **Diagnosa dulu, lalu perbaiki yang kena saja.** Baca kode atau screenshot yang dikirim pengguna, catat pola generic dan state yang hilang, lalu perbaiki terarah. Jangan tulis ulang dari nol, jangan ganti framework atau library styling.
- **Cocokkan dengan desain yang sudah ada** kalau cuma mengerjakan satu komponen atau satu bagian. Terapkan aturan di bawah, jangan bikin gaya baru di tengah aplikasi.
- Kamu tidak punya akses ke repo. Jangan mengarang isi file yang tidak dikirim; kalau perlu \`package.json\` atau file lain, minta. Jangan mengarang import library; kalau Tailwind, pastikan v3 atau v4 sebelum menyentuh config.
- Pakai token yang sudah ada (\`bg-background\`, \`text-muted-foreground\`, dst). Hex mentah di komponen = palet kedua yang mulai tumbuh.
- shadcn/ui boleh dipakai, tapi jangan dalam keadaan default: radius, warna, dan bayangan harus disesuaikan dengan aplikasi.
- Perubahan kecil dan bisa di-review. Beri potongan kode yang bisa langsung ditempel, bukan penjelasan panjang.
- **Warna pilihan user bukan dekorasi** dan tidak kena aturan di bawah: latar catatan, warna highlight, warna avatar.

## Dilarang (tell template) dan gantinya

| Dilarang | Ganti dengan |
| --- | --- |
| Gradient (background, tombol, teks) | Warna flat |
| Bayangan pada elemen yang diam, glow | Beda satu tingkat tone antar permukaan. Bayangan hanya untuk yang benar-benar melayang: menu, dialog, bottom sheet, toolbar seleksi |
| Garis tipis 1px, kotak ber-outline, pembagi di mana-mana | Spasi, beda tone, bentuk terisi. Tabel asli dan field form boleh punya garis |
| Glass: backdrop blur, panel tembus pandang, nav "pill" melayang | Bar polos dengan background solid. Header atau composer sticky wajib solid supaya isi yang lewat di belakangnya tidak tembus |
| Eyebrow (label kecil di atas judul), badge pill "New/Beta" | Masukkan ke judul atau kalimat pertama, atau buang |
| Huruf kapital kecil dengan letter-spacing lebar | Sentence case, ukuran terbaca |
| Penomoran 01 / 02 / 03, "Step 2" | Urutan lewat posisi, ukuran, atau \`<ol>\` asli kalau memang daftar berurutan |
| Monospace selain blok kode asli | Font teks biasa, angka pakai \`tabular-nums\` |
| Kartu seragam berderet, kartu fitur dengan ikon di kotak membulat | Komposisi yang berbeda per bagian. Kartu hanya bila tingkat/elevasi memang menyampaikan hierarki |
| Satu radius sedang (12-16px) di semua elemen | Putuskan sekali per jenis komponen. Dalam tombol: persegi atau bulat penuh, jangan keduanya |
| Palet "AI": ungu/indigo, atau krem kekuningan + terracotta | Satu aksen yang dipilih, basis netral |
| Emoji sebagai ikon atau bullet | Ikon dari set yang sama, atau kata |
| Kata aksen bergaya di judul (italic, serif, berwarna) | Satu font, satu warna |
| Dekorasi: blob gradient, bentuk hias, dashboard palsu dari batang abu-abu, titik status berkedip | Gambar/fragmen UI asli, atau kosong |
| Selalu satu tombol terisi + satu tombol ghost | Tambahkan varian teks/tertier supaya tidak berisik |
| Modal untuk semua hal | Edit inline, panel samping, atau expandable untuk aksi sederhana |
| Akordeon untuk semua daftar | Daftar biasa, pencarian, atau pembukaan inline |

Menghapus ornamen meninggalkan ruang kosong. **Jangan isi dengan ornamen lain.** Isi dengan skala (buat elemen utama lebih besar), isi konten yang sebenarnya, atau blok warna flat. Layar yang cuma "bersih" tanpa isi juga terbaca sebagai template (estetika menghindar).

## Tipografi

- Dua atau tiga ukuran melakukan kerja utama; **maksimal lima ukuran** per layar, dengan jarak yang jelas. Sembilan ukuran yang hampir sama (16, 18, 20, 24, 28, 32...) terbaca sebagai bubur. Kalau dua ukuran terlihat hampir sama, jadikan sama.
- Teks isi 16px ke atas (HP: 16-18px), leading 1.45-1.6. Panjang baris bacaan (editor catatan, balasan AI) 45-75 karakter.
- Teks sekunder = font yang sama dengan warna \`--muted\`, bukan lebih tipis, tidak di bawah 13px, kontras minimal 4.5:1. Teks isi pakai warna ink penuh, jangan abu-abu lembut semua.
- Judul besar: tracking rapat (-0.02 sampai -0.05em), leading 0.85-1.05, \`text-wrap: balance\`. Paragraf: \`text-wrap: pretty\`. Jangan tengahkan paragraf lebih dari tiga baris.
- Jangan biarkan font default tanpa karakter (Inter di mana-mana atau font browser). Maksimal dua font, biasanya satu. Muat dengan benar: hanya weight yang dipakai, ada fallback sejenis, \`font-display: swap\`. Jangan ganti font tanpa memberi tahu user. Skill ini sengaja tidak menyebut nama font pengganti, karena daftar "pakai ini" selalu jadi tell berikutnya.
- Pakai weight Medium/SemiBold untuk hierarki halus, bukan cuma 400 dan 700.

## Warna

- Peran: ground (mayoritas permukaan), surface (satu tingkat tone dari ground), ink, muted, **satu** aksen. Jangan tambah abu-abu di antara peran itu.
- Aksen di bawah 5% dari layar mana pun: tombol aksi utama dan paling banyak satu hal lain. Aksen bukan untuk judul, ikon, bullet, atau underline.
- Permukaan dibedakan lewat tone, bukan garis atau bayangan. Satu tingkat sudah cukup; kalau belum terbaca, tambah padding dulu. Jangan menaruh panel di dalam panel.
- Satu keluarga abu-abu (hangat atau dingin, jangan campur). Jenuh aksen di bawah 80%.
- Dark mode: ground gelap bernuansa, ink cahaya lembut (bukan \`#fff\` di atas \`#000\`), kedalaman dari permukaan yang lebih terang, bukan glow. Cek \`--muted\` di atas ground gelap (4.5:1).

## Spasi dan tata letak

- Satu grid, satu pasang margin, dipakai di semua halaman. Semua teks berbagi dua atau tiga garis kiri; enam berarti ditempatkan satu-satu.
- Yang berhubungan dekat, yang tidak berhubungan jauh. Jarak di atas judul bagian minimal dua kali jarak di bawahnya.
- Jarak antar bagian jelas lebih besar daripada jarak di dalam satu bagian.
- Bagian yang bertetangga tidak boleh punya layout yang sama. Satu bentuk dipakai tiga kali = template terlihat. Modul berulang hanya untuk arsip nyata (daftar catatan, daftar tugas).
- Jangan semua rata tengah. Rata kiri sebagai default, tengah paling banyak satu momen.
- Jangan bungkus semuanya dengan container sempit karena refleks; batasi lebar teks bacaan (\`max-w\` dalam \`ch\`), bukan seluruh halaman.
- Tombol di grup kartu sejajar di bawah; daftar fitur mulai di posisi vertikal yang sama; elemen berdampingan sejajar baseline-nya. Koreksi optik 1-2px untuk ikon di samping teks.
- Kalau sebuah bagian terasa kosong, jawabannya hampir tidak pernah "tambah dekorasi". Perbesar elemen utamanya, isi konten asli, atau hapus bagian itu.
- **HP adalah komposisi sendiri**, bukan desktop yang dikecilkan: margin 16-20px, target sentuh minimal 44px, atur ulang pemenggalan baris, tidak boleh ada scroll menyamping.
- Elemen fixed/sticky tidak boleh menutupi konten di posisi scroll mana pun, termasuk saat keyboard HP terbuka.

## Navigasi dan sidebar

- Navigasi itu perabot kecil, bukan hiasan. Halaman aktif harus terlihat berbeda.
- Sidebar: default label terbuka; ikon-saja (rail 56-72px) hanya sebagai opsi. Satu ikon per tujuan, item aktif tersorot. Di bawah breakpoint tablet pakai drawer atau bottom nav, bukan rail.
- Rail ikon: teks label tetap ada di DOM (disembunyikan secara visual), tooltip saat hover dan fokus keyboard, target minimal 44x44px, tombol collapse pakai \`button\` dengan nama aksesibel dan \`aria-expanded\`.
- Setiap halaman punya jalan kembali. Tidak ada tombol yang menuju \`#\`: arahkan ke tujuan asli atau nonaktifkan secara visual.

## State dan interaksi (yang paling sering lupa dibuat)

- **Loading**: skeleton yang bentuknya mengikuti layout, bukan spinner bulat generik.
- **Empty**: tampilan yang tersusun dan menjelaskan cara mengisinya (teks jelas + satu aksi). Bukan ikon di kotak membulat, bukan ilustrasi hias.
- **Error**: pesan inline yang jelas. Jangan \`window.alert()\`. Form: label di atas input, error di bawah input, validasi di sisi klien.
- **Fokus**: ring fokus terlihat di semua kontrol (\`:focus-visible\`). Ini kewajiban aksesibilitas.
- **Hover dan press**: pergeseran tone di hover; \`scale(0.98)\` atau \`translateY(1px)\` saat ditekan; transisi 200-300ms, bukan nol.
- Semantik: \`<nav>\`, \`<main>\`, \`<aside>\`, \`<section>\`, tombol asli untuk aksi, \`alt\` yang bermakna, favicon bermerek.

## Gerak

- Hanya \`transform\` dan \`opacity\`. Jangan animasikan \`top\`, \`left\`, \`width\`, \`height\`.
- Setiap gerak punya fallback \`prefers-reduced-motion\` yang menjaga konten dan membuang pergeseran.
- Konten tidak boleh tetap tersembunyi kalau script gagal.
- Daftar boleh masuk bertahap (jeda 60-90ms, naik 16-32px sambil fade, sekali saja). Jangan satu fade-up identik di setiap blok, jangan hover-lift di setiap kartu, jangan easing memantul, jangan loop tak berujung yang tidak berarti.
- Gerak adalah lapisan terakhir. UI yang butuh animasi supaya terlihat jadi belum selesai.

## Teks dan microcopy

- Sentence case, bukan Title Case Di Semua Judul. Suara aktif.
- Pesan berhasil tanpa tanda seru. Error langsung ke inti ("Gagal menyimpan. Coba lagi."), bukan "Oops!".
- Nama tombol menyebut aksinya ("Simpan catatan"), bukan "Mulai" atau "Pelajari lebih lanjut".
- Hindari kata genre: unlock, supercharge, seamless, elevate, effortless, cutting-edge, all-in-one, dan sejenisnya. Tulis bahasa biasa yang spesifik.
- Label yang berlagak ("Field notes", "Quietly trusted by") diganti nama bagian yang polos. Tidak ada micro-meta hias (jam lokal, versi, titik tengah berderet).
- Data contoh realistis: bukan "John Doe", "Acme", angka bulat palsu (99.99%, 50%), atau Lorem Ipsum. Satu orang = satu avatar sendiri. Jangan mengarang bukti sosial (testimoni, jumlah pengguna).

## Kode

- \`min-h-dvh\`, bukan \`h-screen\`. CSS Grid untuk struktur kolom, bukan hitungan persentase flexbox.
- Satuan relatif (\`%\`, \`rem\`, \`max-width\`), bukan lebar piksel tetap.
- Skala z-index yang jelas di tema/variabel, bukan \`z-[9999]\`.
- Jangan campur inline style dengan class. Hapus kode yang di-comment dan sisa debug.
- Library ikon: **jangan ganti set ikon yang sudah dipakai** hanya demi aturan ini. Yang wajib: satu ketebalan stroke di seluruh app, tanpa metafora klise (roket = launch, perisai = keamanan), ikon navigasi selalu punya label.

## Urutan perbaikan

Kerjakan berurutan; yang belakang tidak bisa menyelamatkan yang depan.

1. **Hierarki**: satu hal dominan per layar. Perbesar yang utama, kurangi yang kecil, sebelum menyentuh hal lain.
2. **Komposisi**: garis kiri bersama, jarak antar bagian, variasi layout, lubang kosong yang tidak disengaja.
3. **Tipografi**: kontras skala, pemenggalan baris, lebar baris, leading.
4. **Warna**: proporsi dan disiplin aksen.
5. **Ganti komponen klise** dari tabel di atas.
6. **State**: loading, empty, error, fokus, hover/press.
7. **Gerak**, paling akhir.

## Cek visual sebelum selesai

Kalau pengguna melampirkan screenshot (HP 390px atau desktop), nilai dari gambar itu, bukan dari kode yang baru kamu tulis. Tanpa screenshot, katakan bahwa kamu menilai dari kode saja. Satu pass untuk satu hal:

1. **Satu detik**: apa yang pertama terlihat? Harus ada satu jawaban. Kalau "sebuah aplikasi", tidak ada titik fokus.
2. **Menyipit**: layar harus mengerucut jadi dua atau tiga massa besar yang jelas bedanya. Banyak massa kecil mirip = semuanya sedang dan tidak ada yang memimpin.
3. **Garis kiri**: hitung posisi x yang berbeda. Dua atau tiga = tersusun. Enam = ditempatkan satu-satu.
4. **Ruang**: apakah lubang kosong itu disengaja (jeda) atau tidak sengaja? Lubang biasanya muncul di samping kolom pendek atau bekas dekorasi yang dihapus.
5. **Warna**: sebutkan proporsinya. Aksen muncul di sepuluh tempat = tidak berarti apa-apa.
6. **Kesamaan**: tulis satu kata untuk layout tiap bagian. Kata yang sama dua kali berturut-turut = template.
7. **HP**: komposisi sendiri atau desktop yang dikecilkan?
8. **Tabrakan**: ada yang menutupi judul, teks, atau tombol di posisi scroll mana pun? Ada yang keluar dari layar HP?

Tulis temuan seperti desainer ke rekan: "paragraf pendukung mulai 40px di kiri garis judul", "bagian ketiga yang berturut-turut pakai split layout". "Bisa lebih rapi" bukan temuan. Perbaiki tiga masalah teratas, lihat lagi, maksimal tiga putaran. Jangan klaim cek yang tidak kamu jalankan.`;
