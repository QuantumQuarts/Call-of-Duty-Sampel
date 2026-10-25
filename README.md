# Arsenal Call of Duty (dummy PHP + MySQL)

Struktur:
```
cod-games/
  index.html      halaman utama
  css/style.css   tampilan responsif bertema militer
  js/app.js       ambil data dari api.php, render tabel, filter
  api.php         query MySQL, keluaran JSON
  config.php      kredensial dari Environment Variables
  sql/database.sql
```

## Deploy ke DewaCloud
1. New Environment: **Apache (PHP 8.x)** + **MySQL**.
2. phpMyAdmin (node MySQL): tab SQL, jalankan isi `sql/database.sql`.
3. Node Apache > Settings > Variables, tambahkan:
   `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (= `CoD_db`).
   Gunakan IP private / hostname node MySQL untuk `DB_HOST`.
4. Deploy repo (GitHub/GitLab) ke context **ROOT** lewat Deployment Manager.
5. Buka URL environment. Status "Koneksi berhasil" dan hostname server tampil di panel atas.

## Tes lokal (XAMPP)
Salin folder ke `htdocs`, impor `sql/database.sql`, buka `http://localhost/cod-games/`.
