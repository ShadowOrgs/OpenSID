<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=opensid', 'root', '');
    echo 'OK' . PHP_EOL;
    $stmt = $pdo->query('SELECT id, username, password, active FROM user WHERE username = "admin"');
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Hash: " . ($row['password'] ?? 'null') . PHP_EOL;
    echo "Active: " . ($row['active'] ?? 'null') . PHP_EOL;
    
    // Test password
    if ($row['password']) {
        $test1 = password_verify('admin123', $row['password']) ? 'YES' : 'NO';
        echo "admin123: $test1" . PHP_EOL;
        $test2 = password_verify('admin', $row['password']) ? 'YES' : 'NO';
        echo "admin: $test2" . PHP_EOL;
    }
} catch (Exception $e) {
    echo 'ERR: ' . $e->getMessage();
}
