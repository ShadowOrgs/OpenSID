<?php
echo "=== Login Test (full headers) ===\n\n";

$cookieJar = tempnam(sys_get_temp_dir(), 'cookie_');

$ch = curl_init('http://localhost/opensid/siteman/');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_COOKIEJAR => $cookieJar,
    CURLOPT_COOKIEFILE => $cookieJar,
    CURLOPT_FOLLOWLOCATION => false,
]);
$body = curl_exec($ch);
preg_match('/csrfVal\s*=\s*"([^"]+)"/', $body, $m);
$csrfVal = $m[1] ?? '';
echo "CSRF: $csrfVal\n\n";

// POST with proper headers
curl_setopt_array($ch, [
    CURLOPT_URL => 'http://localhost/opensid/siteman/auth',
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => 'username=admin&password=admin&sidcsrf=' . $csrfVal,
    CURLOPT_HTTPHEADER => [
        'X-Requested-With: XMLHttpRequest',
        'Referer: http://localhost/opensid/siteman/',
    ],
    CURLOPT_HEADER => true,
]);
$response = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "POST Status: $code\n";
echo "Full response:\n$response\n";

// Now follow redirect manually
$location = '';
if (preg_match('/Location:\s*(.+?)\r\n/i', $response, $lm)) {
    $location = trim($lm[1]);
}
echo "\nRedirect Location: $location\n";

if ($location) {
    echo "\n--- Following redirect ---\n";
    curl_setopt_array($ch, [
        CURLOPT_URL => $location,
        CURLOPT_HTTPGET => true,
        CURLOPT_HEADER => true,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    $resp2 = curl_exec($ch);
    $code2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    echo "Redirect Status: $code2\n";
    echo "Response:\n$resp2\n";
}

curl_close($ch);
unlink($cookieJar);