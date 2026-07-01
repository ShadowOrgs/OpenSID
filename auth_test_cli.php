<?php
define('LARAVEL_START', microtime(true));
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
define('BASEPATH', __DIR__ . DIRECTORY_SEPARATOR);
define('APPPATH', __DIR__ . 'donjo-app' . DIRECTORY_SEPARATOR);
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Auth Test ===\n";

$guard = app('auth')->guard('admin');
$user = $guard->getProvider()->retrieveByCredentials(['username' => 'admin']);
echo "User: " . ($user ? $user->username : 'NO') . PHP_EOL;
echo "Active: " . ($user ? $user->active : 'N/A') . PHP_EOL;
echo "validate: " . ($guard->getProvider()->validateCredentials($user, ['password' => 'admin']) ? 'YES' : 'NO') . PHP_EOL;
$r1 = $guard->attempt(['username' => 'admin', 'password' => 'admin', 'active' => 1]);
echo "attempt with active: " . ($r1 ? 'SUCCESS' : 'FAIL') . PHP_EOL;
$r2 = $guard->attempt(['username' => 'admin', 'password' => 'admin']);
echo "attempt w/o active: " . ($r2 ? 'SUCCESS' : 'FAIL') . PHP_EOL;

// Also check what the User model expects
echo "\nUser model: " . get_class($user) . PHP_EOL;
echo "GetAuthPassword: " . $user->getAuthPassword() . PHP_EOL;
echo "GetAuthIdentifierName: " . $user->getAuthIdentifierName() . PHP_EOL;