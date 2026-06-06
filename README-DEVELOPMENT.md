# OpenSID Development

Panduan ini untuk menjalankan OpenSID web lokal dan mobile Expo setelah restart PC.

## PC Baru

Setelah clone repository di PC baru:

```bash
cd /home/adens/OpenSID
npm install
npm run dev:mobile
```

Jika container development belum pernah dibuat, `npm run dev:mobile` akan otomatis menjalankan bootstrap terlebih dahulu:

- build image PHP dev
- buat container MariaDB lokal
- import `database/dummy/opensid-dummy.sql`
- buat config DB lokal di `desa/config/database.php`
- install dependency mobile jika `mobile/node_modules` belum ada
- buat container web lokal
- lanjut menjalankan Expo dev client

Bootstrap tidak reset database jika database sudah berisi tabel. Untuk reset manual:

```bash
npm run dev:setup:reset
```

## Web Lokal

Container yang digunakan untuk development lokal:

- `opensid-mariadb`
- `opensid-installer-php82`

URL web lokal:

```text
http://127.0.0.1:8081
```

Untuk menjalankan ulang container secara manual:

```bash
docker start opensid-mariadb opensid-installer-php82
```

## Mobile Expo

Cara paling mudah untuk development mobile:

```bash
cd /home/adens/OpenSID
npm run dev:mobile
```

Command ini akan:

- bootstrap container dev otomatis jika container belum pernah dibuat
- start container database dan web jika belum berjalan
- menunggu OpenSID siap di `http://127.0.0.1:8081`
- mengisi `mobile/.env` dengan `EXPO_PUBLIC_API_URL` lokal
- menjalankan Expo dev client di port `8082`

Setelah itu buka aplikasi development build di HP.

Untuk setup manual di PC baru tanpa menjalankan Expo:

```bash
cd /home/adens/OpenSID
npm install
npm run dev:setup
```

Jika ingin reset database lokal dan import ulang dummy DB:

```bash
npm run dev:setup:reset
```

## Development via USB

Jika HP terhubung dengan USB debugging, gunakan:

```bash
cd /home/adens/OpenSID
npm run dev:mobile:usb
```

Mode ini memakai `adb reverse` untuk port:

- `8081` untuk OpenSID API
- `8082` untuk Expo Metro

API mobile akan diarahkan ke:

```text
http://127.0.0.1:8081/api/mobile/v1
```

Syarat:

- USB debugging aktif di HP
- device sudah authorize ADB
- command `adb devices` menampilkan device

## Development dari Folder Mobile

Alternatif dari folder `mobile`:

```bash
cd /home/adens/OpenSID/mobile
npm run dev:opensid
```

Untuk USB:

```bash
npm run dev:opensid:usb
```

## Build Android

Login EAS:

```bash
cd /home/adens/OpenSID/mobile
npx eas login
```

Build development client:

```bash
npm run build:android:dev
```

Build APK preview untuk testing internal:

```bash
npm run build:android:preview
```

Build AAB untuk Play Store:

```bash
npm run build:android:aab
```

Jika ingin build lokal:

```bash
npm run build:android:dev:local
npm run build:android:preview:local
npm run build:android:aab:local
```

## Override Konfigurasi Dev

Script `scripts/dev-mobile.sh` mendukung override environment:

```bash
DEV_API_HOST=192.168.1.10 npm run dev:mobile
```

Variabel yang tersedia:

- `DEV_API_HOST`: IP atau hostname laptop yang dipakai HP
- `WEB_CONTAINER`: nama container OpenSID web
- `DB_CONTAINER`: nama container database
- `WEB_PORT`: port OpenSID lokal, default `8081`
- `EXPO_PORT`: port Expo Metro, default `8082`
- `API_PATH`: path API mobile, default `/api/mobile/v1`

Contoh:

```bash
WEB_PORT=8081 EXPO_PORT=8082 npm run dev:mobile
```

## Troubleshooting

Jika mobile tidak bisa connect API:

1. Pastikan web lokal bisa dibuka:

   ```bash
   curl http://127.0.0.1:8081
   ```

2. Pastikan HP dan laptop berada di jaringan Wi-Fi yang sama jika memakai mode LAN.

3. Jika memakai USB, cek device:

   ```bash
   adb devices
   ```

4. Jalankan ulang mode USB:

   ```bash
   npm run dev:mobile:usb
   ```

5. Pastikan `mobile/.env` berisi URL API yang benar:

   ```bash
   cat mobile/.env
   ```

Jika port Expo bentrok, ubah port:

```bash
EXPO_PORT=8083 npm run dev:mobile
```
