# Build & Push Docker Image

Script `scripts/docker-build-push.sh` untuk build image OpenSID lalu push ke Docker Hub.

## Setup Awal (sekali saja)

1. **Login Docker Hub** (pilih salah satu):

   ```bash
   # Cara 1: interaktif (lebih aman)
   docker login -u username-kamu

   # Cara 2: pakai token (untuk CI/CD)
   export DOCKERHUB_USERNAME="username-kamu"
   export DOCKERHUB_TOKEN="dckr_pat_xxxxxxxxx"
   ```

2. **Pastikan `buildx` aktif** (untuk multi-arch):
   ```bash
   docker buildx version
   # kalau error, install QEMU:
   docker run --privileged --rm tonistiigi/binfmt --install all
   ```

## Build & Push

```bash
# Default: otomatis deteksi versi dari source code
chmod +x scripts/docker-build-push.sh
./scripts/docker-build-push.sh
```

Output yang di-push:
- `username/opensid:2606.0.0` (versi dari source)
- `username/opensid:latest`

## Override Versi / Platform

```bash
# Versi custom
IMAGE_TAG=2607.0.0 ./scripts/docker-build-push.sh

# Single platform (build lebih cepat)
PLATFORMS=linux/amd64 ./scripts/docker-build-push.sh

# Cuma build lokal, tidak push
PUSH=false ./scripts/docker-build-push.sh
```

## Deploy di Server

Setelah image ter-push, di server tinggal pull & run:

```bash
docker pull username/opensid:2606.0.0
docker run -d \
  --name opensid \
  --restart unless-stopped \
  -p 80:80 \
  -e APP_URL=https://desa.commitflow.space \
  -e DATABASE_URL='mysql://user:pass@db:3306/opensid?charset=utf8mb4' \
  -e TRUSTED_HOSTS=desa.commitflow.space \
  -e TZ=Asia/Jakarta \
  -v opensid_desa:/var/www/html/desa \
  -v opensid_storage:/var/www/html/storage \
  username/opensid:2606.0.0
```

Atau pakai `docker-compose.yml` sederhana:

```yaml
services:
  opensid:
    image: username/opensid:2606.0.0
    container_name: opensid
    restart: unless-stopped
    ports:
      - "80:80"
    environment:
      APP_URL: https://desa.commitflow.space
      DATABASE_URL: mysql://user:pass@db:3306/opensid?charset=utf8mb4
      TRUSTED_HOSTS: desa.commitflow.space
      TZ: Asia/Jakarta
    volumes:
      - opensid_desa:/var/www/html/desa
      - opensid_storage:/var/www/html/storage

volumes:
  opensid_desa:
  opensid_storage:
```

## Catatan Penting

- Image **tidak perlu di-rebuild** untuk perubahan kecil kode, kecuali
  perubahan ada di folder `/desa` atau `/storage` (karena di-mount
  sebagai volume di runtime).
- Folder `/desa` & `/storage` adalah **runtime volume** — data di sana
  tidak akan hilang saat image di-pull ulang.
- Setiap naik versi source, ulangi `./scripts/docker-build-push.sh`.
