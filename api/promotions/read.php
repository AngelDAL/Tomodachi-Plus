<?php
require_once '../../config/database.php';
require_once '../../config/constants.php';
require_once '../../includes/Database.class.php';
require_once '../../includes/Response.class.php';
require_once '../../includes/Auth.class.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Método no permitido', 405);
}

$db = new Database();
$auth = new Auth($db);

if (!$auth->isLoggedIn()) {
    Response::unauthorized();
}

$store_id = $auth->getCurrentUser()['store_id'];
$only_active = isset($_GET['active']) && $_GET['active'] === 'true';

try {
    $conn = $db->getConnection();

    $sql = "SELECT * FROM promotions WHERE store_id = :store_id";
    
    if ($only_active) {
        $sql .= " AND is_active = 1 AND start_date <= NOW() AND end_date >= NOW()";
    }
    
    $sql .= " ORDER BY created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute([':store_id' => $store_id]);
    $promotions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Obtener targets para cada promoción
    foreach ($promotions as &$promo) {
        $stmtTargets = $conn->prepare("
            SELECT pt.*, p.product_name, c.category_name 
            FROM promotion_targets pt
            LEFT JOIN products p ON pt.product_id = p.product_id
            LEFT JOIN categories c ON pt.category_id = c.category_id
            WHERE pt.promotion_id = :promotion_id
        ");
        $stmtTargets->execute([':promotion_id' => $promo['promotion_id']]);
        $promo['targets'] = $stmtTargets->fetchAll(PDO::FETCH_ASSOC);
    }

    Response::success($promotions);

} catch (Exception $e) {
    Response::error('Error al obtener promociones: ' . $e->getMessage(), 500);
}
