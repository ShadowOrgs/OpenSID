# Deploy OpenSID ke Hosting cPanel

Panduan ini untuk deploy production OpenSID ke shared hosting/cPanel. Mobile app tidak termasuk paket ini.

## Kebutuhan Hosting

Pastikan hosting mendukung:

- PHP 8.2
- MySQL atau MariaDB
- Apache dengan `mod_rewrite`
- phpMyAdmin atau akses import database
- extension PHP:
  - `mysqli`
  - `pdo_mysql`
  - `gd`
  - `intl`
  - `mbstring`
  - `zip`
  - `exif`
  - `fileinfo`
  - `curl`
  - `openssl`

Rekomendasi setting PHP:

- `memory_limit`: minimal `256M`, lebih baik `512M`
- `upload_max_filesize`: minimal `20M`
- `post_max_size`: minimal `20M`
- `max_execution_time`: minimal `120`

## Membuat Release Zip

Dari repo lokal:

```bash
npm run build:cpanel
```

Hasil zip akan dibuat di:

```text
dist/opensid-cpanel-YYYYMMDD-HHMMSS.zip
```

Paket zip ini tidak menyertakan:

- `.git`
- `.env`
- Docker config
- folder `mobile`
- `node_modules`
- file development/test
- backup SQL lokal

Paket tetap menyertakan:

- source OpenSID
- `vendor`
- `.htaccess`
- `database/dummy/opensid-dummy.sql`
- README hosting ini

## Upload ke cPanel

1. Login cPanel.
2. Buka File Manager.
3. Masuk ke folder domain, biasanya:

   ```text
   public_html
   ```

   atau folder addon domain/subdomain.

4. Upload file zip release.
5. Extract zip.
6. Pastikan file `index.php`, folder `app`, `donjo-app`, `desa`, `vendor`, dan `.htaccess` berada langsung di document root domain.

## Database

1. Di cPanel, buka MySQL Databases.
2. Buat database baru.
3. Buat user database.
4. Assign user ke database dengan `ALL PRIVILEGES`.
5. Buka phpMyAdmin.
6. Import database:

   Untuk desa baru, gunakan:

   ```text
   database/dummy/opensid-dummy.sql
   ```

   Untuk desa existing, gunakan dump database desa tersebut.

## Konfigurasi Database

Edit file:

```text
desa/config/database.php
```

Isi koneksi database cPanel:

```php
<?php

$db['default']['hostname'] = 'localhost';
$db['default']['username'] = 'cpaneluser_dbuser';
$db['default']['password'] = 'password_database';
$db['default']['database'] = 'cpaneluser_dbname';
$db['default']['port']     = 3306;
$db['default']['dbcollat'] = 'utf8mb4_general_ci';
$db['default']['stricton'] = true;
```

Jika file tersebut belum lengkap, buat dari template `donjo-app/config/database.php`, lalu sesuaikan bagian koneksi database.

## .htaccess

Paket release sudah menyertakan `.htaccess` dari `htaccess.apache.txt`.

Jika halaman tampil tapi CSS/JS tidak terbaca atau URL seperti `/theme_asset/...` 404, biasanya `mod_rewrite` belum aktif atau `.htaccess` tidak dibaca oleh hosting.

Yang perlu dicek:

- file `.htaccess` ada di document root
- hosting memakai Apache/LiteSpeed yang support rewrite
- domain mengarah ke folder yang benar

## Permission Folder

Pastikan folder berikut writable:

```text
desa/
desa/cache/
desa/upload/
storage/
storage/logs/
storage/framework/cache/
storage/framework/sessions/
storage/framework/views/
```

Umumnya:

- folder: `755`
- file: `644`

Jika upload/cache masih gagal di hosting tertentu, coba folder writable menjadi `775`.

## Setelah Deploy

1. Buka domain desa.
2. Login admin:

   ```text
   https://domain-desa.id/siteman
   ```

3. Ubah identitas desa.
4. Ubah password admin.
5. Cek halaman layanan mandiri.
6. Cek upload logo/foto.
7. Cek generate/cetak dokumen PDF.

## Troubleshooting

Jika tampilan polos tanpa CSS:

- cek `.htaccess`
- cek `mod_rewrite`
- cek URL `/theme_asset/...`
- pastikan file theme ikut terupload

Jika error database:

- cek username database
- cek password database
- cek nama database lengkap dengan prefix cPanel
- cek host database, biasanya `localhost`

Jika upload gagal:

- cek permission folder `desa/upload`
- cek `upload_max_filesize`
- cek `post_max_size`

Jika blank page/error 500:

- aktifkan log error di cPanel
- cek `storage/logs`
- cek versi PHP dan extension

## Catatan Multi Desa

Untuk banyak desa, paling rapi gunakan satu database per desa dan satu folder/domain per desa.

Contoh:

```text
desagodog.id       -> database cpanel_desagodog
desasukamaju.id    -> database cpanel_desasukamaju
desa.example.com   -> database cpanel_desa_example
```

Setiap desa harus punya konfigurasi `desa/config/database.php` masing-masing.
