<?php
echo "PHP Version: " . phpversion();
echo "\nLoaded PHP binary path: " . PHP_BINARY;
echo "\nBcrypt cost support: " . (defined('PASSWORD_BCRYPT') ? 'YES' : 'NO');
echo "\nCRYPT_BLOWFISH: " . (CRYPT_BLOWFISH ? 'YES' : 'NO');
echo "\npassword_verify test: ";
$hash = '$2y$10$kyBk2uXLN28S6556eqPcfemC6eSQWHhD/FB03FvLeZaSouKepol62';
echo password_verify('admin', $hash) ? 'OK' : 'FAIL';
echo "\n";