<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$cfg = require __DIR__ . '/config.php';
$host = gethostname();

function fail($msg, $host) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'message' => $msg, 'host' => $host), JSON_UNESCAPED_UNICODE);
    exit;
}

mysqli_report(MYSQLI_REPORT_OFF);
$db = @new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
if ($db->connect_errno) {
    fail('Koneksi database gagal. Periksa DB_HOST, DB_USER, DB_PASSWORD, dan DB_NAME.', $host);
}
$db->set_charset('utf8mb4');

// ID Steam untuk gambar sampul dan tautan toko (tabel games tidak punya kolom gambar).
$steam = array(
    'Call of Duty: Modern Warfare II (2022)'=> 3595230,
    'Call of Duty: Modern Warfare (2019)'=> 2000950,
    'Call of Duty: Black Ops Cold War'=> 1985810,
    'Call of Duty: Modern Warfare IV (2026)'=> 4435490,
    'Call of Duty: WWII'=> 476600,
    'Call of Duty: Ghosts'=> 209160,
);

$res = $db->query('SELECT id, game_name, size, category, rating FROM games ORDER BY id');
if (!$res) {
    fail('Tabel games tidak ditemukan. Jalankan sql/database.sql di phpMyAdmin.', $host);
}

$games = array();
while ($row = $res->fetch_assoc()) {
    $sid = isset($steam[$row['game_name']]) ? $steam[$row['game_name']] : null;
    $row['id']    = (int) $row['id'];
    $row['image'] = $sid ? "https://cdn.cloudflare.steamstatic.com/steam/apps/$sid/header.jpg" : null;
    $row['link']  = $sid ? "https://store.steampowered.com/app/$sid" : null;
    $games[] = $row;
}

echo json_encode(array('ok' => true, 'host' => $host, 'count' => count($games), 'games' => $games), JSON_UNESCAPED_UNICODE);
