<?php
// Reset password user admin ke 'admin' (tanpa composer)

$envFile = __DIR__ . '/.env';
$env = [];
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        [$k, $v] = explode('=', $line, 2);
        $env[trim($k)] = trim($v, " \t\"'");
    }
}

$dbHost = $env['DB_HOSTNAME'] ?? 'localhost';
$dbName = $env['DB_DATABASE'] ?? 'opensid';
$dbUser = $env['DB_USERNAME'] ?? 'root';
$dbPass = $env['DB_PASSWORD'] ?? '';

$conn = @mysqli_connect($dbHost, $dbUser, $dbPass, $dbName);
if (! $conn) {
    echo "[ERROR] " . mysqli_connect_error() . "\n";
    exit(1);
}

// Generate hash di PHP (bukan hardcoded)
$newHash = password_hash('admin', PASSWORD_BCRYPT, ['cost' => 10]);

// Cek dulu user ada
$res = mysqli_query($conn, "SELECT id, username, password, active FROM user WHERE username='admin'");
$row = $res ? mysqli_fetch_assoc($res) : null;

if (!$row) {
    echo "[!] User 'admin' tidak ditemukan!\n";
    echo "[i] Daftar semua user:\n";
    $res2 = mysqli_query($conn, "SELECT id, username, nama, active FROM user");
    while ($r = mysqli_fetch_assoc($res2)) {
        echo "    - id={$r['id']}, username={$r['username']}, nama={$r['nama']}, active={$r['active']}\n";
    }
    exit(1);
}

echo "[i] User ditemukan: id={$row['id']}, username={$row['username']}, active={$row['active']}\n";
echo "[i] Hash lama: {$row['password']}\n";
echo "[i] Hash baru: $newHash\n";

// Update password
$sql = "UPDATE user SET password='" . mysqli_real_escape_string($conn, $newHash) . "', active=1 WHERE username='admin'";
mysqli_query($conn, $sql);

// Verify
$res = mysqli_query($conn, "SELECT password FROM user WHERE username='admin'");
$row = mysqli_fetch_assoc($res);
$valid = password_verify('admin', $row['password']);

echo $valid ? "[OK] Password 'admin' verified!\n" : "[FAIL] Password verification FAILED!\n";

mysqli_close($conn);
