<?php
// Step 1: GET login page
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => 'http://localhost/opensid/siteman',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_COOKIEJAR => 'C:/wamp64/tmp/cookies.txt',
    CURLOPT_COOKIEFILE => 'C:/wamp64/tmp/cookies.txt',
    CURLOPT_TIMEOUT => 10,
]);
$response = curl_exec($ch);
$httpCode1 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Headers separated by \r\n\r\n
$parts = explode("\r\n\r\n", $response);
echo "=== Step 1: GET /siteman ===\n";
echo "Status: $httpCode1\n";
echo "Headers:\n" . $parts[0] . "\n";

// Try to extract csrf from JS variable instead
preg_match('/var csrfVal = "([^"]+)"/', $parts[1] ?? '', $jsMatches);
$jsCsrf = $jsMatches[1] ?? '';
echo "JS csrf: $jsCsrf\n";

// Extract from Set-Cookie header
preg_match_all('/^Set-Cookie:\s*([^=]+)=([^;]+)/mi', $parts[0], $cookieMatches);
$cookieJar = [];
foreach ($cookieMatches[1] as $i => $name) {
    $cookieJar[$name] = $cookieMatches[2][$i];
}
echo "Cookies received: " . json_encode($cookieJar) . "\n";

// Read back cookie file
echo "Cookie file content: " . file_get_contents('C:/wamp64/tmp/cookies.txt') . "\n";