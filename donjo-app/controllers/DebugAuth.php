<?php
defined('BASEPATH') || exit('No direct script access allowed');

// This is a debug endpoint to test Laravel Auth
class DebugAuth extends CI_Controller {
    public function __construct() {
        parent::__construct();
    }

    public function test() {
        header('Content-Type: text/plain');
        echo "=== Laravel Auth Debug ===\n\n";

        // Get user from DB directly
        $user = \App\Models\User::where('username', 'admin')->first();
        echo "1. User from DB: " . ($user ? $user->username : 'NULL') . "\n";
        if ($user) {
            echo "   id={$user->id}, active={$user->active}, email={$user->email}\n";
            echo "   password_hash=" . substr($user->password, 0, 20) . "...\n";
        }

        // Check getAuthPassword
        if ($user) {
            echo "\n2. Authenticatable methods:\n";
            echo "   getAuthIdentifierName: " . $user->getAuthIdentifierName() . "\n";
            echo "   getAuthIdentifier: " . $user->getAuthIdentifier() . "\n";
            echo "   getAuthPassword: " . $user->getAuthPassword() . "\n";
            echo "   getAuthPasswordName: " . $user->getAuthPasswordName() . "\n";
            
            // Verify
            echo "   password_verify('admin'): " . (\Illuminate\Support\Facades\Hash::check('admin', $user->password) ? 'YES' : 'NO') . "\n";
            echo "   password_verify raw: " . (password_verify('admin', $user->password) ? 'YES' : 'NO') . "\n";
        }

        // Test guard provider
        echo "\n3. Guard admin provider:\n";
        try {
            $guard = \Illuminate\Support\Facades\Auth::guard('admin');
            echo "   Guard driver: " . $guard->getDriverName() . "\n";
            $provider = $guard->getProvider();
            echo "   Provider class: " . get_class($provider) . "\n";
            
            $foundUser = $provider->retrieveByCredentials(['username' => 'admin']);
            echo "   retrieveByCredentials('admin'): " . ($foundUser ? $foundUser->username : 'NULL') . "\n";
            
            if ($foundUser) {
                $valid = $provider->validateCredentials($foundUser, ['password' => 'admin']);
                echo "   validateCredentials: " . ($valid ? 'VALID' : 'INVALID') . "\n";
            }
            
            $attempt = $guard->attempt(['username' => 'admin', 'password' => 'admin', 'active' => 1]);
            echo "   attempt full: " . ($attempt ? 'SUCCESS' : 'FAIL') . "\n";
            if (!$attempt) {
                $attempt2 = $guard->attempt(['username' => 'admin', 'password' => 'admin']);
                echo "   attempt no active: " . ($attempt2 ? 'SUCCESS' : 'FAIL') . "\n";
            }
        } catch (\Throwable $e) {
            echo "   ERROR: " . $e->getMessage() . "\n";
            echo "   In: " . $e->getFile() . ':' . $e->getLine() . "\n";
        }

        echo "\n=== Done ===\n";
    }
}