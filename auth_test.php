<?php
// Direct login test via web - bypasses Puppeteer issues
header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== Laravel Auth Guard Test ===\n\n";

$guard = app('auth')->guard('admin');

// Test 1: Retrieve user
echo "1. Retrieving user by username...\n";
$user = $guard->getProvider()->retrieveByCredentials(['username' => 'admin']);
if (!$user) {
    echo "   FAIL: User not found!\n";
    exit;
}
echo "   Found: id={$user->id}, username={$user->username}, active={$user->active}\n\n";

// Test 2: Attempt login WITH extra conditions
echo "2. Attempting login with ['username','password','active'=>1]...\n";
$result = $guard->attempt(['username' => 'admin', 'password' => 'admin', 'active' => 1]);
echo "   Result: " . ($result ? 'SUCCESS' : 'FAILED') . "\n\n";

// Test 3: Attempt login WITHOUT extra conditions  
echo "3. Attempting login with ['username','password'] only...\n";
$result2 = $guard->attempt(['username' => 'admin', 'password' => 'admin']);
echo "   Result: " . ($result2 ? 'SUCCESS' : 'FAILED') . "\n\n";

// Test 4: Check what credentials the provider expects
echo "4. Checking user credentials...\n";
$credentials = $guard->getProvider()->validateCredentials($user, ['password' => 'admin']);
echo "   validateCredentials: " . ($credentials ? 'MATCH' : 'NO MATCH') . "\n\n";

// Test 5: Manual bcrypt check
echo "5. Manual bcrypt check...\n";
$storedHash = $user->password;
echo "   Stored hash: $storedHash\n";
echo "   bcrypt check: " . (password_verify('admin', $storedHash) ? 'MATCH' : 'NO MATCH') . "\n\n";

// Test 6: Check guard config
echo "6. Guard configuration:\n";
$guards = config('auth.guards');
echo "   admin guard driver: " . ($guards['admin']['driver'] ?? 'N/A') . "\n";
echo "   admin guard provider: " . ($guards['admin']['provider'] ?? 'N/A') . "\n";

$providers = config('auth.providers');
echo "   admin provider model: " . ($providers['admin']['model'] ?? 'N/A') . "\n";

echo "\n=== Done ===\n";
