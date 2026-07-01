<?php
// Get full Laravel auth attempt + detailed error logging
header('Content-Type: text/plain; charset=utf-8');

$envFile = __DIR__ . '/.env';
$env = [];
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || $line[0] === '#') continue;
    if (strpos($line, '=') === false) continue;
    [$k, $v] = explode('=', $line, 2);
    $env[trim($k)] = trim($v, " \t\"'");
}

$dbHost = $env['DB_HOSTNAME'] ?? 'localhost';
$dbName = $env['DB_DATABASE'] ?? 'opensid';
$dbUser = $env['DB_USERNAME'] ?? 'root';
$dbPass = $env['DB_PASSWORD'] ?? '';

$conn = mysqli_connect($dbHost, $dbUser, $dbPass, $dbName);
$res = mysqli_query($conn, "SELECT id, username, password, active, two_factor_enabled, otp_enabled, config_id, id_grup FROM user WHERE username='admin'");
$row = mysqli_fetch_assoc($res);

echo "=== User DB Record ===\n";
print_r($row);

$storedHash = $row['password'];
echo "password_verify('admin'): " . (password_verify('admin', $storedHash) ? 'TRUE' : 'FALSE') . "\n";
echo "Hash info: " . password_get_info($storedHash)['algoName'] . "\n\n";

require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Auth::guard('admin') test ===\n";
$auth = app('auth');
$guard = $auth->guard('admin');

// Simulate login attempt
$attempt = $guard->attempt(['username' => 'admin', 'password' => 'admin', 'active' => 1]);
echo "attempt result: " . ($attempt ? 'TRUE (login OK)' : 'FALSE (login FAILED)') . "\n";

if ($attempt) {
    $u = $guard->user();
    echo "Logged in user: id={$u->id} username={$u->username} active={$u->active}\n";
}

echo "\n=== Check rate limit ===\n";
$throttleKey = 'admin|127.0.0.1';
echo "tooManyAttempts for '{$throttleKey}': " . (Illuminate\Support\Facades\RateLimiter::tooManyAttempts($throttleKey, 5) ? 'YES (LOCKED OUT)' : 'NO') . "\n";
echo "attempts: " . Illuminate\Support\Facades\RateLimiter::attempts($throttleKey) . "\n";
