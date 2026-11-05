# Arsenal Call of Duty - Sistem Terdistribusi (VM 1 dan VM 3)

```
Host Win 11 (VirtualBox, Postman)
   |  HTTP :3000
   v
VM 1 Win10  --- SQL :3306 --->  VM 2 Win10 (MySQL, CoD_db)
 web customer + Main API
   |  HTTP :3001 (pull + token)
   v
VM 3 Proxmox (Linux) - Seller API + form seller
```

Aturan: hanya VM 1 yang bicara ke VM 2. VM 3 dan host tidak menyentuh database.

## Alur data
1. Seller mengisi form di VM 3, data masuk antrean (`pending`) dengan `submission_id` unik.
2. VM 1 menarik `GET /api/pending` (otomatis tiap 15 detik atau tombol "Tarik data seller").
3. VM 1 menyimpan ke VM 2 memakai `INSERT IGNORE`; kolom `submission_id` UNIQUE sehingga tarik ulang tidak membuat data ganda.
4. VM 1 mengirim `POST /api/ack` ke VM 3, status berubah menjadi `synced`.
5. Customer melihat game baru di web VM 1.

## Contoh IP (ubah sesuai jaringan Anda)
Host 192.168.56.1, VM 1 192.168.56.101, VM 2 192.168.56.102, VM 3 192.168.56.103.
Gunakan IP statis, atau matikan DHCP Host-Only agar tidak bentrok.

## Urutan setup
**A. VM 2 (database)**: pasang MySQL, jalankan `vm1-web-api/sql/schema.sql`, lalu buat user terbatas ke IP VM 1:
```sql
CREATE USER 'cod_app'@'192.168.56.101' IDENTIFIED BY 'GANTI_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON CoD_db.* TO 'cod_app'@'192.168.56.101';
```
Atur `bind-address` MySQL agar menerima koneksi jaringan dan buat rule firewall port 3306 hanya dari IP VM 1.

**B. VM 3 (Linux)**
```bash
# Node.js 20 LTS, lalu:
cd vm3-seller-api && cp .env.example .env     # isi SELLER_TOKEN (acak, panjang)
npm install && npm start
```
Buka `http://IP-VM3:3001/` untuk form seller. Izinkan port 3001 dari IP VM 1 dan host (mis. `ufw allow from 192.168.56.101 to any port 3001`).

**C. VM 1 (Windows)**
```powershell
# pasang Node.js 20 LTS, lalu:
cd vm1-web-api; copy .env.example .env      # isi DB_*, SELLER_URL, SELLER_TOKEN (sama dengan VM 3)
npm install; npm start
netsh advfirewall firewall add rule name="CoD Web 3000" dir=in action=allow protocol=TCP localport=3000
```
Buka `http://IP-VM1:3000/` dari host. Panel status harus menunjukkan VM 2 dan VM 3 "Terhubung".

## Endpoint VM 1 (untuk Postman dari host)
| Method | URL | Fungsi |
|---|---|---|
| GET | /api/games | Daftar game |
| GET | /api/games/:id | Detail game |
| POST | /api/games | Tambah (JSON: game_name, size, category, rating, image_url opsional) |
| PUT | /api/games/:id | Ubah (semua field wajib) |
| DELETE | /api/games/:id | Hapus |
| GET | /api/status | Status VM 1, VM 2, VM 3 |
| POST | /api/sync | Tarik data seller sekarang |

## Endpoint VM 3
`POST /api/submissions`, `GET /api/submissions`, `DELETE /api/submissions/:id` (hanya yang masih pending), `GET /api/health`. Untuk VM 1 (wajib header `x-api-key`): `GET /api/pending`, `POST /api/ack`.

## Uji yang sudah dijalankan
CRUD, validasi (400/404), alur seller ke VM 1 ke database, tarik ulang tanpa data ganda, VM 3 mati (status VM 1 tetap hidup dan melaporkan error), dan tampilan desktop/mobile. Pengujian memakai MariaDB lokal, bukan jaringan VirtualBox, jadi tes IP, firewall, dan Proxmox tetap perlu Anda lakukan.

## Catatan
- Tanpa internet, font dan gambar Steam tidak tampil; halaman tetap berfungsi.
- ID game bisa melompat (mis. 7 ke 9) karena `INSERT IGNORE`; ini normal di MySQL.
- Endpoint CRUD VM 1 belum memakai login; cukup untuk praktikum jaringan tertutup.
- Jangan commit file `.env` (sudah ada di `.gitignore`).
