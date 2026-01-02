<?php
require_once '../../config/database.php';
require_once '../../includes/Database.class.php';
require_once '../../includes/Response.class.php';
require_once '../../includes/Validator.class.php';
require_once '../../api/auth/verify_session.php';

// Verificar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Método no permitido', 405);
}

// Obtener datos
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    Response::error('Datos inválidos', 400);
}

// Validar campos requeridos
$required = ['name', 'start_date', 'end_date', 'type', 'discount_type', 'discount_value'];
foreach ($required as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        Response::error("El campo $field es requerido", 400);
    }
}

$store_id = $_SESSION['store_id'];
$name = Validator::sanitizeString($data['name']);
$description = isset($data['description']) ? Validator::sanitizeString($data['description']) : '';
$start_date = $data['start_date'];
$end_date = $data['end_date'];
$type = $data['type'];
$discount_type = $data['discount_type'];
$discount_value = $data['discount_value'];
$min_purchase_amount = isset($data['min_purchase_amount']) ? $data['min_purchase_amount'] : 0;
$min_quantity = isset($data['min_quantity']) ? $data['min_quantity'] : 1;
$targets = isset($data['targets']) ? $data['targets'] : [];

try {
    $db = new Database();
    $conn = $db->getConnection();
    $conn->beginTransaction();

    // Insertar promoción
    $stmt = $conn->prepare("
        INSERT INTO promotions (
            store_id, name, description, start_date, end_date, 
            type, discount_type, discount_value, 
            min_purchase_amount, min_quantity
        ) VALUES (
            :store_id, :name, :description, :start_date, :end_date,
            :type, :discount_type, :discount_value,
            :min_purchase_amount, :min_quantity
        )
    ");

    $stmt->execute([
        ':store_id' => $store_id,
        ':name' => $name,
        ':description' => $description,
        ':start_date' => $start_date,
        ':end_date' => $end_date,
        ':type' => $type,
        ':discount_type' => $discount_type,
        ':discount_value' => $discount_value,
        ':min_purchase_amount' => $min_purchase_amount,
        ':min_quantity' => $min_quantity
    ]);

    $promotion_id = $conn->lastInsertId();

    // Insertar targets
    if (!empty($targets)) {
        $stmtTarget = $conn->prepare("
            INSERT INTO promotion_targets (promotion_id, product_id, category_id)
            VALUES (:promotion_id, :product_id, :category_id)
        ");

        foreach ($targets as $target) {
            $product_id = ($target['type'] === 'product') ? $target['id'] : null;
            $category_id = ($target['type'] === 'category') ? $target['id'] : null;

            $stmtTarget->execute([
                ':promotion_id' => $promotion_id,
                ':product_id' => $product_id,
                ':category_id' => $category_id
            ]);
        }
    }

    $conn->commit();
    Response::success(['promotion_id' => $promotion_id], 'Promoción creada exitosamente', 201);

} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollBack();
    }
    Response::error('Error al crear la promoción: ' . $e->getMessage(), 500);
}
