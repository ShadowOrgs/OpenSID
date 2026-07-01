<?php
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => "http://localhost/opensid/test_sapi.php",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => "username=admin&sidcsrf=testtoken",
    CURLOPT_HEADER => true,
]);
$r = curl_exec($ch);
echo $r;
curl_close($ch);