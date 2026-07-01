# Panduan Mudah Upload OpenSID ke Hosting (cPanel)

File arsip ZIP siap pakai untuk hosting telah berhasil dibuat di:
`dist/opensid-cpanel-20260702-031143.zip`

Arsip ini sudah bersih dari folder development seperti `.git`, file `.env` lokal, `node_modules`, serta telah mengamankan `.htaccess` bawaan.

Berikut adalah langkah-langkah mudah untuk meng-upload dan menyiapkannya di cPanel hosting Anda:

---

## Langkah 1: Upload dan Ekstrak File ZIP
1. Login ke **cPanel** hosting Anda.
2. Buka menu **File Manager**.
3. Masuk ke direktori web Anda:
   - Jika untuk domain utama: masuk ke folder **`public_html`**.
   - Jika untuk subdomain/addon domain: masuk ke folder direktori domain tersebut.
4. Klik tombol **Upload** di bagian atas, pilih file ZIP yang berada di laptop Anda:
   `dist/opensid-cpanel-20260702-031143.zip`
5. Setelah proses upload selesai (bar berwarna hijau 100%), kembali ke File Manager, klik kanan pada file ZIP tersebut dan pilih **Extract**.
6. Pastikan file `index.php`, `.htaccess`, serta folder `app`, `donjo-app`, `desa`, dan `vendor` berada **langsung** di dalam folder root domain (tidak bersarang di dalam folder lain).

---

## Langkah 2: Membuat Database Baru di cPanel
1. Kembali ke halaman utama cPanel, cari dan buka menu **MySQL® Database Wizard**.
2. **Langkah 1 (Create A Database):** Masukkan nama database baru (misal: `opensid`) lalu klik *Next Step*.
3. **Langkah 2 (Create Database Users):** Masukkan username database (misal: `dbuser`) dan buat password yang kuat. Catat username dan password ini. Klik *Create User*.
4. **Langkah 3 (Add User to the Database):** Centang pilihan **ALL PRIVILEGES** agar user database memiliki hak akses penuh, lalu klik *Make Changes*.

---

## Langkah 3: Import Database Awal (Schema & Data)
1. Buka menu **phpMyAdmin** dari halaman utama cPanel.
2. Pilih nama database yang baru saja Anda buat di panel sebelah kiri.
3. Klik tab **Import** di bagian atas.
4. Klik tombol **Choose File** (Pilih File) dan pilih database dummy bawaan OpenSID yang berada di folder hasil ekstrak:
   `database/dummy/opensid-dummy.sql`
5. Gulir ke bawah dan klik tombol **Import** (atau **Go**) untuk memulai proses import data. Tunggu hingga muncul notifikasi sukses.

---

## Langkah 4: Konfigurasi Koneksi Database
1. Buka kembali **File Manager** cPanel.
2. Masuk ke folder **`desa/config/`**.
3. Cari file bernama **`database.php.example`** lalu ubah namanya (Rename) menjadi **`database.php`**.
4. Klik kanan pada file **`database.php`** tersebut dan pilih **Edit**.
5. Sesuaikan baris kode berikut dengan informasi database cPanel yang telah Anda buat di Langkah 2:
   ```php
   $db['default']['hostname'] = 'localhost';
   $db['default']['username'] = 'username_cpanel_anda_dbuser'; // Sesuaikan prefix cPanel Anda
   $db['default']['password'] = 'password_database_anda';       // Password database Anda
   $db['default']['database'] = 'username_cpanel_anda_dbname'; // Nama database lengkap
   ```
6. Klik **Save Changes** di pojok kanan atas, lalu tutup editor.

---

## Langkah 5: Selesai & Pengujian
1. Buka domain website desa Anda di browser (misal: `http://domaindesa.id`). Halaman utama OpenSID akan terbuka dengan CSS dan aset lengkap.
2. Untuk masuk ke dashboard Admin, akses URL:
   `http://domaindesa.id/siteman`
3. Gunakan kredensial default bawaan database dummy untuk login pertama kali:
   - **Username:** `admin`
   - **Password:** `password`
4. **PENTING:** Setelah berhasil login, segera ganti password admin demi keamanan website Anda di menu pengaturan pengguna.
