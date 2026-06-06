# OpenSID Dummy Database

File `opensid-dummy.sql` adalah seed database dummy yang sudah disanitasi dari database lokal.

Isi yang dibersihkan:
- log aktivitas, notifikasi, OTP, token, dan riwayat request
- data transaksi layanan mandiri, pengaduan, pesan, dokumen, dan pelapak
- identitas desa dan penduduk lokal diganti menjadi data demo

Import ke database baru:

```bash
mysql -u <user> -p < database/dummy/opensid-dummy.sql
```

Dump ini membuat database `opensid` jika belum ada. Untuk nama database lain, ubah nama database di dump sebelum import.

Data demo utama:
- desa: Desa Demo
- penduduk: WARGA DEMO
- admin: `admin`

Password admin mengikuti hash dari dummy lokal saat seed dibuat. Jika password tidak diketahui, reset password admin setelah import.
