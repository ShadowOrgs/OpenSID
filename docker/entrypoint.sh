#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/html
SEED_DIR=/usr/src/opensid-seed

seed_dir() {
    local source_dir="$1"
    local target_dir="$2"

    mkdir -p "$target_dir"

    if [ -d "$source_dir" ] && [ -z "$(find "$target_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
        cp -a "$source_dir"/. "$target_dir"/
    fi
}

if [ -n "${DATABASE_URL:-}" ]; then
    eval "$(
        php <<'PHP'
<?php
$url = getenv('DATABASE_URL');
$parts = parse_url($url);

if ($parts === false) {
    exit(0);
}

$query = [];
parse_str($parts['query'] ?? '', $query);

$values = [
    'DB_HOST'      => $parts['host'] ?? null,
    'DB_PORT'      => (string) ($parts['port'] ?? 3306),
    'DB_USERNAME'  => isset($parts['user']) ? urldecode($parts['user']) : null,
    'DB_PASSWORD'  => isset($parts['pass']) ? urldecode($parts['pass']) : '',
    'DB_DATABASE'  => isset($parts['path']) ? urldecode(ltrim($parts['path'], '/')) : null,
    'DB_CHARSET'   => $query['charset'] ?? null,
    'DB_COLLATION' => $query['collation'] ?? null,
];

foreach ($values as $name => $value) {
    if ($value !== null && $value !== '') {
        echo 'export ' . $name . '=' . escapeshellarg($value) . PHP_EOL;
    }
}
PHP
    )"
fi

seed_dir "$SEED_DIR/desa" "$APP_DIR/desa"
seed_dir "$SEED_DIR/storage" "$APP_DIR/storage"

mkdir -p \
    "$APP_DIR/desa/config" \
    "$APP_DIR/desa/cache" \
    "$APP_DIR/desa/upload" \
    "$APP_DIR/storage/framework/cache" \
    "$APP_DIR/storage/framework/sessions" \
    "$APP_DIR/storage/framework/views" \
    "$APP_DIR/storage/logs"

php <<'PHP'
<?php
$configDir = '/var/www/html/desa/config';

if (! is_dir($configDir)) {
    mkdir($configDir, 0775, true);
}

$host      = getenv('DB_HOST') ?: 'localhost';
$username  = getenv('DB_USERNAME') ?: 'root';
$password  = getenv('DB_PASSWORD') ?: '';
$port      = (int) (getenv('DB_PORT') ?: 3306);
$database  = getenv('DB_DATABASE') ?: 'opensid';
$collation = getenv('DB_COLLATION') ?: 'utf8mb4_general_ci';
$strict    = strtolower((string) (getenv('DB_STRICT_MODE') ?: 'true'));
$strict    = in_array($strict, ['1', 'true', 'yes', 'on'], true);

$databaseConfig = "<?php\n\n"
    . "// File ini dibuat otomatis dari environment Docker.\n"
    . "\$db['default']['hostname'] = " . var_export($host, true) . ";\n"
    . "\$db['default']['username'] = " . var_export($username, true) . ";\n"
    . "\$db['default']['password'] = " . var_export($password, true) . ";\n"
    . "\$db['default']['port']     = {$port};\n"
    . "\$db['default']['database'] = " . var_export($database, true) . ";\n"
    . "\$db['default']['dbcollat'] = " . var_export($collation, true) . ";\n"
    . "\$db['default']['stricton'] = " . ($strict ? 'true' : 'false') . ";\n"
    . "\$db['default']['options'] = [\n"
    . "    // PDO::ATTR_EMULATE_PREPARES => true,\n"
    . "];\n";

file_put_contents($configDir . '/database.php', $databaseConfig);

$appUrl = getenv('APP_URL') ?: '';
$trustedHosts = getenv('TRUSTED_HOSTS') ?: '';

if ($appUrl !== '' || $trustedHosts !== '') {
    $hosts = array_values(array_filter(array_map('trim', explode(',', $trustedHosts))));

    if ($appUrl !== '') {
        $urlHost = parse_url($appUrl, PHP_URL_HOST);
        if ($urlHost && ! in_array($urlHost, $hosts, true)) {
            $hosts[] = $urlHost;
        }
    }

    $configPath = $configDir . '/config.php';
    $config = file_exists($configPath) ? file_get_contents($configPath) : "<?php\n";

    if ($appUrl !== '') {
        $baseUrlLine = "\$config['base_url'] = " . var_export(rtrim($appUrl, '/') . '/', true) . ";\n";

        if (preg_match('/\$config\[[\'"]base_url[\'"]\]\s*=.*?;\s*/s', $config)) {
            $config = preg_replace('/\$config\[[\'"]base_url[\'"]\]\s*=.*?;\s*/s', $baseUrlLine, $config, 1);
        } else {
            $config .= "\n{$baseUrlLine}";
        }
    }

    if ($hosts !== []) {
        $trustedHostsLine = "\$config['trusted_hosts'] = " . var_export($hosts, true) . ";\n";

        if (preg_match('/\$config\[[\'"]trusted_hosts[\'"]\]\s*=.*?;\s*/s', $config)) {
            $config = preg_replace('/\$config\[[\'"]trusted_hosts[\'"]\]\s*=.*?;\s*/s', $trustedHostsLine, $config, 1);
        } else {
            $config .= "\n{$trustedHostsLine}";
        }
    }

    file_put_contents($configPath, $config);
}
PHP

chown -R www-data:www-data "$APP_DIR/desa" "$APP_DIR/storage"

exec "$@"
