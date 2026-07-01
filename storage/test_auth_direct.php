<?php
require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Test Laravel auth directly
$user = \App\Models\User::where('username', 'admin')->first();
echo "User found: " . ($user ? 'YES' : 'NO') . "\n";
if ($user) {
    echo "ID: " . $user->id . "\n";
    echo "Username: " . $user->username . "\n";
    echo "Hash: " . $user->password . "\n";
    echo "Active: " . $user->active . "\n";
    
    // Direct password verify
    $direct = password_verify('admin123', $user->password);
    echo "Direct password_verify: " . ($direct ? 'YES' : 'NO') . "\n";
    
    // Laravel guard
    $guard = \Illuminate\Support\Facades\Auth::guard('admin');
    echo "Guard: " . get_class($guard) . "\n";
    
    // Try attempt
    $attempt = $guard->attempt(['username' => 'admin', 'password' => 'admin123', 'active' => 1]);
    echo "Attempt with active=1: " . ($attempt ? 'YES' : 'NO') . "\n";
    
    // Try without active
    $attempt2 = $guard->attempt(['username' => 'admin', 'password' => 'admin123']);
    echo "Attempt without active: " . ($attempt2 ? 'YES' : 'NO') . "\n";
    
    // Check provider
    $provider = $guard->getProvider();
    echo "Provider: " . get_class($provider) . "\n";
    
    // Retrieve user
    $retrieved = $provider->retrieveByCredentials(['username' => 'admin']);
    echo "Retrieved: " . ($retrieved ? get_class($retrieved) : 'NULL') . "\n";
    if ($retrieved) {
        $valid = $provider->validateCredentials($retrieved, ['password' => 'admin123']);
        echo "Validate credentials: " . ($valid ? 'YES' : 'NO') . "\n";
    }
}
