<?php
// Test direct without Laravel boot - just hit the controller
echo "=== Direct POST Test to /siteman/auth ===\n\n";

// Simulate browser POST with proper cookies
$cookieJar = tempnam(sys_get_temp_dir(), 'cookie_');

$ch = curl_init('http://localhost/opensid/siteman/');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_COOKIEJAR => $cookieJar,
    CURLOPT_COOKIEFILE => $cookieJar,
    CURLOPT_FOLLOWLOCATION => false,
]);
$response = curl_exec($ch);
echo "GET /siteman/ Status: " . curl_getinfo($ch, CURLINFO_HTTP_CODE) . "\n";

// Extract CSRF if present
if (preg_match('/name="_token"\s+value="([^"]+)"/', $response, $m)) {
    $csrf = $m[1];
    echo "CSRF Token found: $csrf\n";
} elseif (preg_match('/csrf-token"\s+content="([^"]+)"/', $response, $m)) {
    $csrf = $m[1];
    echo "Meta CSRF Token found: $csrf\n";
} else {
    echo "No CSRF Token found in response\n";
    $csrf = '';
    echo "--- First 500 chars of response ---\n";
    echo substr(strip_tags($response), 0, 500) . "\n";
    echo "--- End ---\n";
}

// POST with credentials
curl_setopt_array($ch, [
    CURLOPT_URL => 'http://localhost/opensid/siteman/auth',
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query([
        'username' => 'admin',
        'password' => 'admin',
        '_token'   => $csrf,
    ]),
    CURLOPT_HTTPHEADER => [
        'X-Requested-With: XMLHttpRequest',
        'Accept: application/json',
    ],
]);
$response = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "\nPOST /siteman/auth Status: $code\n";
echo "Response:\n$response\n";

curl_close($ch);
unlink($cookieJar);