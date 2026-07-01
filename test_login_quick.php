<?php
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
curl_close($ch);

$cookieContent = file_get_contents('C:/wamp64/tmp/cookies.txt');
preg_match_all('/^(?:#HttpOnly_)?localhost\s+\S+\s+\/\s+\S+\s+\d+\s+(\S+)\s+(\S+)/m', $cookieContent, $cookieMatches);
$cookies = [];
foreach ($cookieMatches[1] as $i => $name) {
    $cookies[$name] = $cookieMatches[2][$i];
}
echo "Loaded cookies: " . json_encode($cookies) . "\n";

$csrfToken = $cookies['sidcsrf'] ?? '';

// Build cookie header
$cookieHeader = '';
foreach ($cookies as $name => $value) {
    $cookieHeader .= "$name=$value; ";
}

// POST with CSRF - use raw body string
$rawBody = "username=admin&password=admin123&sidcsrf=$csrfToken";
echo "POST body: $rawBody\n";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => 'http://localhost/opensid/siteman/auth',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $rawBody,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_COOKIEJAR => 'C:/wamp64/tmp/cookies.txt',
    CURLOPT_COOKIEFILE => 'C:/wamp64/tmp/cookies.txt',
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HTTPHEADER => [
        "Cookie: $cookieHeader",
        "Content-Type: application/x-www-form-urlencoded",
    ],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$redirectUrl = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
curl_close($ch);

echo "\n=== POST /siteman/auth ===\n";
echo "HTTP Status: $httpCode\n";
echo "Redirect URL: $redirectUrl\n";
$parts = explode("\r\n\r\n", $response);
echo "Headers:\n" . ($parts[0] ?? 'N/A') . "\n";
echo "Body (last 400):\n" . substr(end($parts), -400) . "\n";