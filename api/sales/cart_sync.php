<?php
/**
 * Cart Sync API — UUID session-based
 * 
 * POST:   Save cart data for a session UUID
 * GET:    Retrieve cart data for a session UUID
 * DELETE: Remove a session
 */
require_once '../../config/database.php';
require_once '../../config/constants.php';
require_once '../../includes/Database.class.php';
require_once '../../includes/Response.class.php';
require_once '../../includes/Auth.class.php';

require_once __DIR__ . '/../../includes/CORS.class.php';
setupCORS();
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = new Database();
$auth = new Auth($db);

$dir = __DIR__ . '/../../temp/sessions';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

/**
 * Generate a UUID v4
 */
function generateUUID() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Validate a UUID v4 format
 */
function isValidUUID($uuid) {
    return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid) === 1;
}

/**
 * Get session file path
 */
function sessionPath($dir, $uuid) {
    return $dir . '/cart_' . $uuid . '.json';
}

// --- POST: save cart ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$auth->isLoggedIn()) {
        Response::unauthorized();
    }

    $user = $auth->getCurrentUser();
    $store_id = $user['store_id'];

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        Response::error('Datos inválidos', 400);
    }

    // If no session UUID provided, generate one
    $session = isset($input['session']) ? $input['session'] : null;
    if ($session && !isValidUUID($session)) {
        Response::error('UUID inválido', 400);
    }
    if (!$session) {
        $session = generateUUID();
    }

    $data = [
        'session' => $session,
        'store_id' => $store_id,
        'cart' => $input['cart'] ?? [],
        'totals' => $input['totals'] ?? [],
        'storeInfo' => $input['storeInfo'] ?? ['name' => 'Tomodachi', 'logo' => ''],
        'activeTab' => $input['activeTab'] ?? null,
        'updated_at' => time()
    ];

    file_put_contents(sessionPath($dir, $session), json_encode($data));

    Response::success([
        'session' => $session,
        'saved' => true
    ]);
}

// --- GET: read cart ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $session = isset($_GET['session']) ? $_GET['session'] : null;

    if (!$session || !isValidUUID($session)) {
        Response::error('session UUID requerido y debe ser válido', 400);
    }

    $file = sessionPath($dir, $session);

    if (!file_exists($file)) {
        // Clean empty response — no data yet
        Response::success([
            'session' => $session,
            'cart' => [],
            'totals' => ['subtotal' => 0, 'discount' => 0, 'tax' => 0, 'total' => 0],
            'storeInfo' => ['name' => '', 'logo' => ''],
            'activeTab' => null,
            'updated_at' => null
        ]);
        exit;
    }

    // Expire after 2 hours of inactivity
    if (time() - filemtime($file) > 7200) {
        unlink($file);
        Response::success([
            'session' => $session,
            'cart' => [],
            'totals' => ['subtotal' => 0, 'discount' => 0, 'tax' => 0, 'total' => 0],
            'storeInfo' => ['name' => '', 'logo' => ''],
            'activeTab' => null,
            'updated_at' => null
        ]);
        exit;
    }

    $data = json_decode(file_get_contents($file), true);
    // Strip store_id from response for security
    unset($data['store_id']);

    Response::success($data);
}

// --- DELETE: remove session ---
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $session = isset($_GET['session']) ? $_GET['session'] : null;
    if (!$session || !isValidUUID($session)) {
        Response::error('session UUID requerido', 400);
    }

    $file = sessionPath($dir, $session);
    if (file_exists($file)) {
        unlink($file);
    }
    Response::success(['cleared' => true]);
}
