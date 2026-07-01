<?php
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => 'http://localhost/opensid/test_sidcsrf.php',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => "username=admin&sidcsrf=mytoken1234567890abcdef",
    CURLOPT_COOKIE => "sidcsrf=mycookie1234567890abcdef; ci_session=test123",
    CURLOPT_TIMEOUT => 10,
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;