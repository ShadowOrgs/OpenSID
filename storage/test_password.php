<?php
$db = mysqli_connect('localhost', 'root', '', 'opensid');
if (!$db) { die('Cannot connect: ' . mysqli_connect_error() . PHP_EOL); }
$user = mysqli_query($db, "SELECT username, email, password, active FROM user WHERE username='admin'");
if (!$user) { die('Query error: ' . mysqli_error($db) . PHP_EOL); }
$u = mysqli_fetch_assoc($user);
echo 'Username: ' . $u['username'] . PHP_EOL;
echo 'Email: ' . $u['email'] . PHP_EOL;
echo 'Active: ' . $u['active'] . PHP_EOL;
echo 'Password hash: ' . $u['password'] . PHP_EOL;
echo 'Password length: ' . strlen($u['password']) . PHP_EOL;
echo PHP_EOL . 'Testing bcrypt hash: password' . PHP_EOL;
echo 'Result: ' . (password_verify('password', $u['password']) ? 'MATCH' : 'NO MATCH') . PHP_EOL;
echo PHP_EOL . 'Testing common passwords:' . PHP_EOL;
foreach (['admin', 'opensid', 'opensid123', 'admin123', 'Admin123', 'OpenSID2026', 'admin@123', 'password123'] as $p) {
    echo "  '$p': " . (password_verify($p, $u['password']) ? 'MATCH' : 'NO') . PHP_EOL;
}