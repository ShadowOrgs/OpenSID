<?php
// Direct Laravel auth test via web
echo "=== Laravel Auth Guard Test ===\n\n";

define('LARAVEL_START', microtime(true));

// Bootstrap Laravel properly
$loader = require __DIR__ . '/vendor/autoload.php';

$app = new Illuminate\Foundation\Application(__DIR__);
$app->singleton(
    Illuminate\Contracts\Http\Kernel::class,
    App\Http\Kernel::class
);
$app->singleton(
    Illuminate\Contracts\Console\Kernel::class,
    App\Console\Kernel::class
);
$app->singleton(
    Illuminate\Contracts\Debug\ExceptionHandler::class,
    App\Exceptions\Handler::class
);

// Load env
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Register core Laravel services
$app->instance('request', Illuminate\Http\Request::capture());

$app->register(App\Providers\AppServiceProvider::class);
$app->register(App\Providers\AuthServiceProvider::class);
$app->register(Illuminate\Auth\AuthServiceProvider::class);
$app->register(Illuminate\Cookie\CookieServiceProvider::class);
$app->register(Illuminate\Database\DatabaseServiceProvider::class);
$app->register(Illuminate\Session\SessionServiceProvider::class);

// Bootstrap Eloquent
$container = $app->make('Illuminate\Database\Eloquent\Factory');
$container->loadViewsFrom(__DIR__ . '/resources/views', 'admin');

echo "1. Connecting to database...\n";
$pdo = new PDO(
    'mysql:host=localhost;dbname=opensid;charset=utf8mb4',
    'root',
    '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$stmt = $pdo->query("SELECT * FROM user WHERE username='admin'");
$userRow = $stmt->fetch(PDO::FETCH_ASSOC);
echo "   Found: " . ($userRow ? 'YES' : 'NO') . "\n";
if ($userRow) {
    echo "   id={$userRow['id']}, username={$userRow['username']}, active={$userRow['active']}\n";
    echo "   password_hash: {$userRow['password']}\n";
}

echo "\n2. Testing bcrypt...\n";
if ($userRow) {
    $match = password_verify('admin', $userRow['password']);
    echo "   password_verify('admin'): " . ($match ? 'MATCH' : 'NO MATCH') . "\n";
}

echo "\n3. Testing Laravel Auth guard...\n";
try {
    // Use the Laravel app that OpenSID already boots
    $guard = \Illuminate\Support\Facades\Auth::guard('admin');
    echo "   Guard driver: " . $guard->getDriverName() . "\n";
    
    $user = $guard->getProvider()->retrieveByCredentials(['username' => 'admin']);
    echo "   User from provider: " . ($user ? $user->username : 'NULL') . "\n";
    
    if ($user) {
        $valid = $guard->getProvider()->validateCredentials($user, ['password' => 'admin']);
        echo "   validateCredentials: " . ($valid ? 'VALID' : 'INVALID') . "\n";
    }
    
    $attempt = $guard->attempt(['username' => 'admin', 'password' => 'admin', 'active' => 1]);
    echo "   attempt(['username','password','active']): " . ($attempt ? 'SUCCESS' : 'FAIL') . "\n";
    
    $attempt2 = $guard->attempt(['username' => 'admin', 'password' => 'admin']);
    echo "   attempt(['username','password']): " . ($attempt2 ? 'SUCCESS' : 'FAIL') . "\n";
    
} catch (Exception $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
    echo "   Trace: " . $e->getTraceAsString() . "\n";
}

echo "\n=== Done ===\n";