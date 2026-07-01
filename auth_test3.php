<?php
echo "=== Login Test with CSRF ===\n\n";

$cookieJar = tempnam(sys_get_temp_dir(), 'cookie_');

// Step 1: GET /siteman/ to get cookies + form
$ch = curl_init('http://localhost/opensid/siteman/');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => false,  // Don't include headers in output
    CURLOPT_COOKIEJAR => $cookieJar,
    CURLOPT_COOKIEFILE => $cookieJar,
    CURLOPT_FOLLOWLOCATION => false,
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "1) GET /siteman/ -> $code, body length: " . strlen($body) . "\n";

// Save body for inspection
file_put_contents('C:/wamp64/www/opensid/dbg_form.html', $body);

// Find CSRF token
$csrf = null;
if (preg_match('/name="(?:csrf[^\"]*|sidcsrf)\"\s+value=\"([^\"]+)\"/i', $body, $m)) {
    $csrf = $m[1];
    echo "   CSRF (in form): $csrf\n";
} else {
    // Look for any hidden input
    if (preg_match_all('/<input[^>]+type=\"hidden\"[^>]+>/i', $body, $matches)) {
        echo "   Hidden inputs found:\n";
        foreach ($matches[0] as $inp) {
            echo "     $inp\n";
            if (preg_match('/name=\"([^\"]+)\"\s+value=\"([^\"]+)\"/i', $inp, $mm)) {
                if (stripos($mm[1], 'csrf') !== false || stripos($mm[1], 'token') !== false || stripos($mm[1], 'sidcsrf') !== false) {
                    $csrf = $mm[2];
                    echo "     -> CSRF detected: $csrf\n";
                }
            }
        }
    }
}

// Step 2: Read sidcsrf cookie (CodeIgniter CSRF)
$cookies = file_get_contents($cookieJar);
echo "   Cookie file content:\n$cookies\n";

// Extract sidcsrf cookie value
if (preg_match('/sidcsrf\s+([a-f0-9]+)/', $cookies, $cm)) {
    $sidcsrf = $cm[1];
    echo "   sidcsrf cookie: $sidcsrf\n";
}

// Step 3: POST with credentials + CSRF
$postData = [
    'username' => 'admin',
    'password' => 'admin',
];
if ($csrf) $postData['csrf_token_name'] = $csrf;

curl_setopt_array($ch, [
    CURLOPT_URL => 'http://localhost/opensid/siteman/auth',
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($postData),
    CURLOPT_HTTPHEADER => [
        'X-Requested-With: XMLHttpRequest',
    ],
    CURLOPT_HEADER => false,
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "\n2) POST /siteman/auth -> $code\n";
echo "   Response (first 500 chars):\n" . substr(strip_tags($body), 0, 500) . "\n";

curl_close($ch);
unlink($cookieJar);