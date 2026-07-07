#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "--------------------------------------------------------"
echo " Menyiapkan Build Android APK (Preview) di Expo Cloud"
echo "--------------------------------------------------------"

# Pindah ke folder mobile
cd "$ROOT_DIR/mobile"

# Memastikan EAS CLI terinstall secara lokal/npx
echo "Memeriksa status login EAS..."
if ! npx eas-cli whoami >/dev/null 2>&1; then
  echo "Anda belum login ke Expo. Silakan login terlebih dahulu:"
  npx eas-cli login
fi

echo "Memulai proses build APK ke Expo Cloud..."
echo "Build profile: preview (menghasilkan file .apk yang siap di-install)"
echo "--------------------------------------------------------"

npx eas-cli build --platform android --profile preview
