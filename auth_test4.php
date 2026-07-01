<?php
echo "=== Login Test (proper CSRF) ===\n\n";

$cookieJar = tempnam(sys_get_temp_dir(), 'cookie_');

// Step 1: GET /siteman/ to initialize cookies
$ch = curl_init('http://localhost/opensid/siteman/');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_COOKIEJAR => $cookieJar,
    CURLOPT_COOKIEFILE => $cookieJar,
    CURLOPT_FOLLOWLOCATION => false,
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "1) GET /siteman/ -> $code\n";

// Extract CSRF token from page
preg_match('/csrfVal\s*=\s*"([^"]+)"/', $body, $m);
$csrfVal = $m[1] ?? '';
echo "   CSRF value: $csrfVal\n";

// Step 2: POST /siteman/auth with csrf
$postData = http_build_query([
    'username' => 'admin',
    'password' => 'admin',
    'sidcsrf'  => $csrfVal,
]);

echo "\n   Posting data: username=admin&password=admin&sidcsrf=$csrfVal\n";

curl_setopt_array($ch, [
    CURLOPT_URL => 'http://localhost/opensid/siteman/auth',
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postData,
    CURLOPT_HTTPHEADER => [
        'X-Requested-With: XMLHttpRequest',
    ],
    CURLOPT_FOLLOWLOCATION => false,
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "\n2) POST /siteman/auth -> $code\n";

// Check if redirected (302)
$redirect = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
echo "   Redirect: $redirect\n";

// Get response headers
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_NOBODY => false,
]);
$body2 = curl_exec($ch);
echo "   Headers:\n" . substr($body2, 0, 1500) . "\n";

// Try following redirect
echo "\n3) Following redirect (GET the redirect URL)...\n";
curl_setopt_array($ch, [
    CURLOPT_URL => $redirect ?: 'http://localhost/opensid/main',
    CURLOPT_HTTPGET => true,
    CURLOPT_POSTFIELDS => null,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HEADER => true,
]);
$body3 = curl_exec($ch);
$code3 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "   Status: $code3\n";
echo "   Headers:\n" . substr($body3, 0, 1500) . "\n";

curl_close($ch);
unlink($cookieJar);