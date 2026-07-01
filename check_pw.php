<?php
$hash = '$2y$10$kyBk2uXLN28S6556eqPcfemC6eSQWHhD/FB03FvLeZaSouKepol62';
$result = password_verify('admin', $hash);
echo ($result ? 'PASSWORD MATCHES "admin"' : 'PASSWORD DOES NOT MATCH "admin"') . "\n";

// Also check what the actual password might be
$hashes = [
    'admin' => 'admin',
    '123456' => '123456',
    'password' => 'password',
    'OpenSID' => 'OpenSID',
    'root' => 'root',
];

foreach ($hashes as $pass => $check) {
    $match = password_verify($check, $hash);
    echo "  '$pass': " . ($match ? 'MATCH!' : 'no') . "\n";
}

// Also check if the hash itself might be wrong
echo "\nHash length: " . strlen($hash) . "\n";
echo "Hash: $hash\n";