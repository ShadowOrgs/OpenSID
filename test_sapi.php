<?php
echo "POST: " . count($_POST) . "\n";
echo "COOKIE: " . count($_COOKIE) . "\n";
echo "REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD'] . "\n";
echo "php://input: " . file_get_contents('php://input') . "\n";