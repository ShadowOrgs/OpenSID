#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile"

WEB_CONTAINER="${WEB_CONTAINER:-opensid-installer-php82}"
DB_CONTAINER="${DB_CONTAINER:-opensid-mariadb}"
WEB_PORT="${WEB_PORT:-8081}"
EXPO_PORT="${EXPO_PORT:-8082}"
API_PATH="${API_PATH:-/api/mobile/v1}"
MODE="lan"

usage() {
  cat <<USAGE
Usage: scripts/dev-mobile.sh [--lan|--usb|--no-expo]

Options:
  --lan      Gunakan IP LAN laptop untuk API mobile. Default.
  --usb      Gunakan adb reverse dan API http://127.0.0.1:${WEB_PORT}.
  --no-expo  Hanya start container dan update mobile/.env, tidak start Expo.
  --no-setup Jangan bootstrap otomatis saat container belum ada.

Environment override:
  WEB_CONTAINER=${WEB_CONTAINER}
  DB_CONTAINER=${DB_CONTAINER}
  WEB_PORT=${WEB_PORT}
  EXPO_PORT=${EXPO_PORT}
  DEV_API_HOST=<ip-or-host>
  EXPO_DEV_HOST=<ip-or-host>
USAGE
}

START_EXPO=1
AUTO_SETUP=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lan)
      MODE="lan"
      ;;
    --usb)
      MODE="usb"
      ;;
    --no-expo)
      START_EXPO=0
      ;;
    --no-setup)
      AUTO_SETUP=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Command '$1' tidak ditemukan." >&2
    exit 1
  fi
}

container_exists() {
  docker ps -a --format '{{.Names}}' | grep -Fxq "$1"
}

container_running() {
  docker ps --format '{{.Names}}' | grep -Fxq "$1"
}

start_container_if_exists() {
  local name="$1"
  if container_exists "$name"; then
    if container_running "$name"; then
      echo "Container $name sudah berjalan."
    else
      echo "Start container $name..."
      docker start "$name" >/dev/null
    fi
  else
    echo "Container $name tidak ditemukan, dilewati."
  fi
}

ensure_dev_setup() {
  if container_exists "$DB_CONTAINER" && container_exists "$WEB_CONTAINER"; then
    return
  fi

  if [[ "$AUTO_SETUP" -eq 0 ]]; then
    echo "Container dev belum lengkap dan auto setup dimatikan." >&2
    exit 1
  fi

  echo "Container dev belum lengkap. Jalankan bootstrap otomatis..."
  "$ROOT_DIR/scripts/dev-setup.sh"
}

detect_lan_ip() {
  if [[ -n "${DEV_API_HOST:-}" ]]; then
    echo "$DEV_API_HOST"
    return
  fi

  if command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "src") {print $(i+1); exit}}'
    return
  fi

  hostname -I 2>/dev/null | awk '{print $1}'
}

wait_for_web() {
  local url="http://127.0.0.1:${WEB_PORT}/"
  echo "Menunggu OpenSID di $url ..."

  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "OpenSID siap: $url"
      return
    fi
    sleep 1
  done

  echo "OpenSID belum merespons di $url." >&2
  echo "Cek container $WEB_CONTAINER atau port WEB_PORT=${WEB_PORT}." >&2
  exit 1
}

ensure_lan_web_access() {
  local api_host="$1"
  local url="http://${api_host}:${WEB_PORT}/"

  if curl -fsS "$url" >/dev/null 2>&1; then
    return
  fi

  echo "OpenSID belum bisa diakses dari LAN: $url"
  echo "Recreate container web agar port ${WEB_PORT} listen di 0.0.0.0..."
  WEB_BIND_IP=0.0.0.0 RECREATE_WEB=1 "$ROOT_DIR/scripts/dev-setup.sh"

  if ! curl -fsS "$url" >/dev/null 2>&1; then
    echo "Masih belum bisa akses $url dari laptop." >&2
    echo "Cek firewall atau pastikan HP dan laptop satu jaringan." >&2
    exit 1
  fi
}

write_mobile_env() {
  local api_url="$1"
  mkdir -p "$MOBILE_DIR"

  if [[ -f "$MOBILE_DIR/.env" ]]; then
    if grep -q '^EXPO_PUBLIC_API_URL=' "$MOBILE_DIR/.env"; then
      sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${api_url}|" "$MOBILE_DIR/.env"
    else
      printf '\nEXPO_PUBLIC_API_URL=%s\n' "$api_url" >> "$MOBILE_DIR/.env"
    fi
  else
    printf 'EXPO_PUBLIC_API_URL=%s\n' "$api_url" > "$MOBILE_DIR/.env"
  fi

  echo "mobile/.env -> EXPO_PUBLIC_API_URL=${api_url}"
}

setup_usb_reverse() {
  require_cmd adb

  if ! adb get-state >/dev/null 2>&1; then
    echo "ADB device tidak terdeteksi. Sambungkan HP, aktifkan USB debugging, lalu authorize." >&2
    exit 1
  fi

  adb reverse "tcp:${WEB_PORT}" "tcp:${WEB_PORT}" >/dev/null
  adb reverse "tcp:${EXPO_PORT}" "tcp:${EXPO_PORT}" >/dev/null
  echo "ADB reverse aktif: ${WEB_PORT} dan ${EXPO_PORT}"
}

urlencode() {
  node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$1"
}

dev_client_scheme() {
  node <<'NODE'
const fs = require('fs');
const path = require('path');
const app = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8')).expo || {};
if (typeof app.scheme === 'string' && app.scheme.length > 0) {
  console.log(app.scheme);
  process.exit(0);
}
const slug = String(app.slug || 'opensid-mobile')
  .replace(/[^A-Za-z0-9+\-.]/g, '')
  .toLowerCase();
console.log(`exp+${slug || 'opensid-mobile'}`);
NODE
}

main() {
  require_cmd docker
  require_cmd curl

  ensure_dev_setup
  start_container_if_exists "$DB_CONTAINER"
  start_container_if_exists "$WEB_CONTAINER"
  wait_for_web

  local api_host api_url expo_host_arg packager_host
  if [[ "$MODE" == "usb" ]]; then
    setup_usb_reverse
    api_host="127.0.0.1"
    expo_host_arg="--localhost"
    packager_host="127.0.0.1"
  else
    api_host="$(detect_lan_ip)"
    expo_host_arg="--lan"

    if [[ -z "$api_host" ]]; then
      echo "Gagal mendeteksi IP LAN. Jalankan dengan DEV_API_HOST=<ip-laptop>." >&2
      exit 1
    fi

    ensure_lan_web_access "$api_host"
    packager_host="${EXPO_DEV_HOST:-$api_host}"
  fi

  api_url="http://${api_host}:${WEB_PORT}${API_PATH}"
  write_mobile_env "$api_url"

  if [[ "$START_EXPO" -eq 0 ]]; then
    exit 0
  fi

  echo "Start Expo dev client di port ${EXPO_PORT}..."
  echo "Expo host: ${packager_host}:${EXPO_PORT}"
  cd "$MOBILE_DIR"

  local manifest_url dev_url scheme
  manifest_url="http://${packager_host}:${EXPO_PORT}"
  scheme="$(dev_client_scheme)"
  dev_url="${scheme}://expo-development-client/?url=$(urlencode "$manifest_url")"

  echo "Jika Expo tetap menulis localhost, pakai URL ini di HP/dev client:"
  echo "$dev_url"
  echo "Atau buka dev client lalu Enter URL: $manifest_url"

  REACT_NATIVE_PACKAGER_HOSTNAME="$packager_host" npx expo start --dev-client "$expo_host_arg" --port "$EXPO_PORT"
}

main
