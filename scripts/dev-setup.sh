#!/usr/bin/env bash
set -euo pipefail
export MSYS_NO_PATHCONV=1

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEV_NETWORK="${DEV_NETWORK:-opensid-dev}"
WEB_IMAGE="${WEB_IMAGE:-opensid-php82}"
WEB_CONTAINER="${WEB_CONTAINER:-opensid-installer-php82}"
DB_CONTAINER="${DB_CONTAINER:-opensid-mariadb}"
DB_IMAGE="${DB_IMAGE:-mariadb:10.3}"
DB_NAME="${DB_NAME:-opensid}"
DB_USER="${DB_USER:-opensid}"
DB_PASSWORD="${DB_PASSWORD:-opensidpass}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-rootpass}"
DB_PORT="${DB_PORT:-3307}"
WEB_PORT="${WEB_PORT:-8081}"
WEB_BIND_IP="${WEB_BIND_IP:-0.0.0.0}"
RESET_DB=0

usage() {
  cat <<USAGE
Usage: scripts/dev-setup.sh [--reset-db]

Setup development lokal untuk PC baru:
  - build image PHP dev jika belum ada
  - buat/start MariaDB lokal jika belum ada
  - import database dummy jika database kosong
  - tulis config DB lokal ke desa/config/database.php
  - buat/start container OpenSID web
  - install dependency mobile jika node_modules belum ada

Options:
  --reset-db  Hapus dan buat ulang container DB, lalu import ulang dummy DB.

Environment override:
  WEB_CONTAINER=${WEB_CONTAINER}
  DB_CONTAINER=${DB_CONTAINER}
  WEB_PORT=${WEB_PORT}
  WEB_BIND_IP=${WEB_BIND_IP}
  DB_PORT=${DB_PORT}
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --reset-db)
      RESET_DB=1
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

image_exists() {
  docker image inspect "$1" >/dev/null 2>&1
}

container_exists() {
  docker ps -a --format '{{.Names}}' | grep -Fxq "$1"
}

container_running() {
  docker ps --format '{{.Names}}' | grep -Fxq "$1"
}

ensure_network() {
  if ! docker network inspect "$DEV_NETWORK" >/dev/null 2>&1; then
    echo "Buat Docker network $DEV_NETWORK..."
    docker network create "$DEV_NETWORK" >/dev/null
  fi
}

ensure_container_network() {
  local name="$1"

  if ! container_exists "$name"; then
    return
  fi

  if docker inspect "$name" --format '{{json .NetworkSettings.Networks}}' | grep -q "\"${DEV_NETWORK}\""; then
    return
  fi

  echo "Hubungkan container $name ke network $DEV_NETWORK..."
  docker network connect "$DEV_NETWORK" "$name" >/dev/null
}

ensure_web_image() {
  if image_exists "$WEB_IMAGE"; then
    echo "Image $WEB_IMAGE sudah ada."
    return
  fi

  echo "Build image $WEB_IMAGE..."
  docker build -t "$WEB_IMAGE" -f "$ROOT_DIR/docker/dev/Dockerfile" "$ROOT_DIR"
}

wait_for_db() {
  echo "Menunggu MariaDB siap..."
  for _ in $(seq 1 90); do
    if docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" "$DB_CONTAINER" mysql -uroot -e "SELECT 1" >/dev/null 2>&1; then
      echo "MariaDB siap."
      return
    fi
    sleep 1
  done

  echo "MariaDB belum siap." >&2
  exit 1
}

ensure_db_container() {
  if [[ "$RESET_DB" -eq 1 ]] && container_exists "$DB_CONTAINER"; then
    echo "Reset DB container $DB_CONTAINER..."
    docker rm -f "$DB_CONTAINER" >/dev/null
  fi

  if container_exists "$DB_CONTAINER"; then
    if container_running "$DB_CONTAINER"; then
      echo "Container $DB_CONTAINER sudah berjalan."
    else
      echo "Start container $DB_CONTAINER..."
      docker start "$DB_CONTAINER" >/dev/null
    fi
  else
    echo "Buat container $DB_CONTAINER..."
    docker run -d \
      --name "$DB_CONTAINER" \
      --network "$DEV_NETWORK" \
      -p "127.0.0.1:${DB_PORT}:3306" \
      -e MYSQL_DATABASE="$DB_NAME" \
      -e MYSQL_USER="$DB_USER" \
      -e MYSQL_PASSWORD="$DB_PASSWORD" \
      -e MYSQL_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
      "$DB_IMAGE" >/dev/null
  fi

  ensure_container_network "$DB_CONTAINER"
  wait_for_db
}

import_dummy_db_if_empty() {
  local dump_file="$ROOT_DIR/database/dummy/opensid-dummy.sql"

  if [[ ! -f "$dump_file" ]]; then
    echo "Dummy DB tidak ditemukan: $dump_file" >&2
    exit 1
  fi

  local table_count
  table_count="$(docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" "$DB_CONTAINER" mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")"

  if [[ "$table_count" != "0" ]]; then
    echo "Database $DB_NAME sudah berisi $table_count tabel, import dummy dilewati."
    return
  fi

  echo "Import dummy database ke $DB_NAME..."
  docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" "$DB_CONTAINER" mysql -uroot -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
  sed "/enable the sandbox mode/d; s|USE \`opensid\`|USE \`${DB_NAME}\`|g; s|CREATE DATABASE .* \`opensid\`|CREATE DATABASE /*!32312 IF NOT EXISTS*/ \`${DB_NAME}\`|g" "$dump_file" \
    | docker exec -i -e MYSQL_PWD="$DB_ROOT_PASSWORD" "$DB_CONTAINER" mysql -uroot --default-character-set=utf8mb4 "${DB_NAME}"

  docker exec -e MYSQL_PWD="$DB_ROOT_PASSWORD" "$DB_CONTAINER" mysql -uroot -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%'; FLUSH PRIVILEGES;"
}

write_local_env() {
  local env_file="$ROOT_DIR/.env"

  if [[ -f "$env_file" ]] && grep -q '^DATABASE_URL=mysql://opensid:opensidpass@127\.0\.0\.1:3307/opensid' "$env_file"; then
    echo ".env sudah memakai DB lokal dev."
    return
  fi

  if [[ -f "$env_file" ]]; then
    cp "$env_file" "$env_file.dev-backup"
    echo "Backup .env lama ke .env.dev-backup"
  fi

  cat > "$env_file" <<ENV
APP_NAME=OpenSID
APP_ENV=development
APP_DEBUG=true
APP_URL=http://127.0.0.1:${WEB_PORT}
TZ=Asia/Jakarta

DATABASE_URL=mysql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/${DB_NAME}?charset=utf8mb4&collation=utf8mb4_general_ci
DB_STRICT_MODE=true

TRUSTED_HOSTS=127.0.0.1,localhost
TRAEFIK_HOST=desa.commitflow.space
TRAEFIK_ENTRYPOINT=websecure
TRAEFIK_CERT_RESOLVER=letsencrypt
ENV
  echo "Tulis .env lokal dev."
}

write_database_config() {
  mkdir -p "$ROOT_DIR/desa/config"

  cat > "$ROOT_DIR/desa/config/database.php" <<PHP
<?php
// File ini dibuat otomatis oleh scripts/dev-setup.sh untuk development lokal.

\$active_group = 'default';
\$query_builder = true;

\$db['default']['hostname']     = '${DB_CONTAINER}';
\$db['default']['username']     = '${DB_USER}';
\$db['default']['password']     = '${DB_PASSWORD}';
\$db['default']['database']     = '${DB_NAME}';
\$db['default']['port']         = 3306;
\$db['default']['stricton']     = true;
\$db['default']['dbdriver']     = 'mysqli';
\$db['default']['dbprefix']     = '';
\$db['default']['pconnect']     = false;
\$db['default']['db_debug']     = true;
\$db['default']['cache_on']     = false;
\$db['default']['cachedir']     = '';
\$db['default']['char_set']     = 'utf8mb4';
\$db['default']['dbcollat']     = 'utf8mb4_general_ci';
\$db['default']['swap_pre']     = '';
\$db['default']['autoinit']     = false;
\$db['default']['encrypt']      = false;
\$db['default']['compress']     = false;
\$db['default']['failover']     = [];
\$db['default']['save_queries'] = true;
\$db['default']['options']      = [
    // PDO::ATTR_EMULATE_PREPARES => true,
];
PHP

  if [[ ! -f "$ROOT_DIR/desa/config/config.php" ]]; then
    cat > "$ROOT_DIR/desa/config/config.php" <<'PHP'
<?php

$config['user_admin'] = 0;
$config['trusted_hosts'] = ['127.0.0.1', 'localhost'];
PHP
  fi

  echo "Tulis desa/config/database.php untuk DB container lokal."
}

ensure_php_dependencies() {
  if [[ -f "$ROOT_DIR/vendor/autoload.php" ]]; then
    echo "Vendor PHP sudah ada."
    return
  fi

  echo "Install dependency PHP dengan Composer di container..."
  docker run --rm \
    --network "$DEV_NETWORK" \
    -v "$ROOT_DIR:/app" \
    -w /app \
    "$WEB_IMAGE" \
    composer install --prefer-dist --no-interaction
}

ensure_mobile_dependencies() {
  if [[ -d "$ROOT_DIR/mobile/node_modules" ]]; then
    echo "Dependency mobile sudah ada."
    return
  fi

  if [[ ! -f "$ROOT_DIR/mobile/package.json" ]]; then
    echo "Folder mobile tidak ditemukan, dependency mobile dilewati."
    return
  fi

  require_cmd npm
  echo "Install dependency mobile..."
  (cd "$ROOT_DIR/mobile" && npm install)
}

ensure_web_container() {
  local router='printf "%s\n" "<?php" "\$path = parse_url(\$_SERVER[\"REQUEST_URI\"], PHP_URL_PATH);" "\$file = \"/app\" . \$path;" "if (\$path !== \"/\" && is_file(\$file)) { return false; }" "require \"/app/index.php\";" > /tmp/opensid-router.php && php -S 0.0.0.0:8080 -t /app /tmp/opensid-router.php'

  if container_exists "$WEB_CONTAINER"; then
    local current_binding
    current_binding="$(docker inspect "$WEB_CONTAINER" --format '{{range $containerPort, $bindings := .HostConfig.PortBindings}}{{range $bindings}}{{.HostIp}}:{{.HostPort}}{{end}}{{end}}' 2>/dev/null || true)"

    if [[ "${RECREATE_WEB:-0}" == "1" ]] || { [[ "$WEB_BIND_IP" != "127.0.0.1" ]] && [[ "$current_binding" == 127.0.0.1:* ]]; }; then
      echo "Recreate container $WEB_CONTAINER agar bisa diakses dari LAN..."
      docker rm -f "$WEB_CONTAINER" >/dev/null
    else
      ensure_container_network "$WEB_CONTAINER"
      if container_running "$WEB_CONTAINER"; then
        echo "Container $WEB_CONTAINER sudah berjalan."
      else
        echo "Start container $WEB_CONTAINER..."
        docker start "$WEB_CONTAINER" >/dev/null
      fi
      return
    fi
  fi

  if container_exists "$WEB_CONTAINER"; then
    ensure_container_network "$WEB_CONTAINER"
    if container_running "$WEB_CONTAINER"; then
      echo "Container $WEB_CONTAINER sudah berjalan."
    else
      echo "Start container $WEB_CONTAINER..."
      docker start "$WEB_CONTAINER" >/dev/null
    fi
    return
  fi

  echo "Buat container $WEB_CONTAINER..."
  docker run -d \
    --name "$WEB_CONTAINER" \
    --network "$DEV_NETWORK" \
    -p "${WEB_BIND_IP}:${WEB_PORT}:8080" \
    -v "$ROOT_DIR:/app" \
    -w /app \
    -e APP_ENV=development \
    -e APP_DEBUG=true \
    -e APP_URL="http://127.0.0.1:${WEB_PORT}" \
    -e DB_HOST="$DB_CONTAINER" \
    -e DB_PORT=3306 \
    -e DB_USERNAME="$DB_USER" \
    -e DB_PASSWORD="$DB_PASSWORD" \
    -e DB_DATABASE="$DB_NAME" \
    "$WEB_IMAGE" \
    sh -lc "$router" >/dev/null
}

wait_for_web() {
  local url="http://127.0.0.1:${WEB_PORT}/"
  echo "Menunggu OpenSID web siap..."

  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "OpenSID siap: $url"
      return
    fi
    sleep 1
  done

  echo "OpenSID belum siap. Log container web:" >&2
  docker logs --tail 80 "$WEB_CONTAINER" >&2 || true
  exit 1
}

main() {
  require_cmd docker
  require_cmd curl

  ensure_network
  ensure_web_image
  ensure_db_container
  import_dummy_db_if_empty
  write_local_env
  write_database_config
  ensure_php_dependencies
  ensure_mobile_dependencies
  ensure_web_container
  wait_for_web
}

main
