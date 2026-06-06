#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$DIST_DIR/cpanel-build"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ZIP_NAME="${ZIP_NAME:-opensid-cpanel-${TIMESTAMP}.zip}"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

cleanup() {
  rm -rf "$BUILD_DIR"
}

trap cleanup EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Command '$1' tidak ditemukan." >&2
    exit 1
  fi
}

prepare_vendor() {
  if [[ -f "$ROOT_DIR/vendor/autoload.php" ]]; then
    return
  fi

  require_cmd composer
  echo "vendor belum ada, menjalankan composer install..."
  (cd "$ROOT_DIR" && composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction)
}

copy_release_files() {
  rm -rf "$BUILD_DIR"
  mkdir -p "$BUILD_DIR"

  rsync -a "$ROOT_DIR/" "$BUILD_DIR/" \
    --include 'database/dummy/opensid-dummy.sql' \
    --include 'database/dummy/README.md' \
    --exclude '.git/' \
    --exclude '.github/' \
    --exclude '.idea/' \
    --exclude '.vscode/' \
    --exclude '.cache-rector/' \
    --exclude '.expo/' \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude '.envrc' \
    --exclude '.e2e.env.example' \
    --exclude '.gitattributes' \
    --exclude '.gitignore' \
    --exclude '.dockerignore' \
    --exclude '.prettierrc.json' \
    --exclude 'Dockerfile' \
    --exclude 'docker/' \
    --exclude 'docker-compose.yml' \
    --exclude 'bin/Dockerfile' \
    --exclude 'bin/docker-compose.yml' \
    --exclude 'README-DEVELOPMENT.md' \
    --exclude 'scripts/' \
    --exclude 'mobile/' \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude 'backup_inkremental/' \
    --exclude 'tests/' \
    --exclude 'test-results/' \
    --exclude 'playwright.config.ts' \
    --exclude 'phpunit.xml' \
    --exclude 'rector.php' \
    --exclude '.php-cs-fixer.php' \
    --exclude '.php-cs-fixer.cache' \
    --exclude '.phpunit.result.cache' \
    --exclude '*.log' \
    --exclude '*.sql' \
    --exclude '*.sql.gz'

  cp "$ROOT_DIR/htaccess.apache.txt" "$BUILD_DIR/.htaccess"
  cp "$ROOT_DIR/README-HOSTING-CPANEL.md" "$BUILD_DIR/README-HOSTING-CPANEL.md"
}

remove_dev_database_config() {
  rm -f "$BUILD_DIR/desa/config/database.php"

  cat > "$BUILD_DIR/desa/config/database.php.example" <<'PHP'
<?php

// Salin file ini menjadi database.php, lalu sesuaikan koneksi database cPanel.

$db['default']['hostname'] = 'localhost';
$db['default']['username'] = 'cpaneluser_dbuser';
$db['default']['password'] = 'password_database';
$db['default']['database'] = 'cpaneluser_dbname';
$db['default']['port']     = 3306;
$db['default']['dbcollat'] = 'utf8mb4_general_ci';
$db['default']['stricton'] = true;
PHP
}

create_zip() {
  rm -f "$ZIP_PATH"

  (
    cd "$BUILD_DIR"
    zip -qr "$ZIP_PATH" .
  )

  echo "Release cPanel dibuat:"
  echo "$ZIP_PATH"
  du -h "$ZIP_PATH"
}

main() {
  require_cmd rsync
  require_cmd zip

  prepare_vendor
  copy_release_files
  remove_dev_database_config
  create_zip
}

main
