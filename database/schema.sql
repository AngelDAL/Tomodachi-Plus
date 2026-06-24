-- Base de datos Tomodachi POS System
-- Schema completo (productivo) — generado desde el estado actual de la BD
-- Incluye: stores, users, categories, products, inventory_movements,
--          terminals, cash_registers, sales, sale_details, cash_movements,
--          promotions, promotion_targets

CREATE DATABASE IF NOT EXISTS tomodachi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tomodachi_db;

-- ============================================================
-- Tabla: stores (Tiendas)
-- ============================================================
CREATE TABLE stores (
    store_id INT AUTO_INCREMENT PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(20),
    theme_config TEXT NULL,
    settings TEXT NULL,
    logo_url VARCHAR(255) NULL,
    subscription_plan ENUM('free', 'premium') DEFAULT 'free',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_subscription_plan (subscription_plan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: users (Usuarios)
-- ============================================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20) NULL,
    role ENUM('super_admin', 'admin', 'manager', 'cashier') NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    show_onboarding TINYINT(1) DEFAULT 1,
    reset_token_hash VARCHAR(255) NULL,
    reset_token_expires_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    UNIQUE KEY username (username),
    INDEX idx_username (username),
    INDEX idx_store (store_id),
    INDEX idx_status (status),
    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: categories (Categorías de productos)
-- ============================================================
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL DEFAULT 1,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_class VARCHAR(80) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_store (store_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: products (Productos)
-- ============================================================
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    category_id INT DEFAULT NULL,
    product_name VARCHAR(150) NOT NULL,
    description TEXT,
    image_path VARCHAR(255) NULL,
    barcode VARCHAR(50),
    qr_code VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0.00,
    current_stock DECIMAL(12,3) DEFAULT 0.000,
    min_stock DECIMAL(12,3) DEFAULT 0.000,
    status ENUM('active', 'inactive') DEFAULT 'active',
    is_bulk TINYINT(1) NOT NULL DEFAULT 0,
    unit_type ENUM('unit', 'kg', 'g', 'l', 'ml', 'm') NOT NULL DEFAULT 'unit',
    bulk_unit VARCHAR(20) DEFAULT 'kg',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_store_barcode (store_id, barcode),
    UNIQUE KEY unique_store_qr_code (store_id, qr_code),
    INDEX idx_product_name (product_name),
    INDEX idx_status (status),
    INDEX idx_store (store_id),
    INDEX idx_category (category_id),
    INDEX idx_is_bulk (is_bulk),
    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: inventory_movements (Movimientos de inventario)
-- ============================================================
CREATE TABLE inventory_movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    movement_type ENUM('entry', 'exit', 'adjustment', 'sale', 'return') NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    previous_stock DECIMAL(12,3) NOT NULL,
    new_stock DECIMAL(12,3) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_store_date (store_id, created_at),
    INDEX idx_product (product_id),
    INDEX idx_movement_type (movement_type),
    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: terminals (Terminales / Puntos de Venta)
-- ============================================================
CREATE TABLE terminals (
    terminal_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    terminal_name VARCHAR(50) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_store (store_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: cash_registers (Cajas registradoras)
-- ============================================================
CREATE TABLE cash_registers (
    register_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    terminal_id INT DEFAULT NULL,
    user_id INT NOT NULL,
    opening_date DATETIME NOT NULL,
    closing_date DATETIME,
    initial_amount DECIMAL(10,2) NOT NULL,
    final_amount DECIMAL(10,2),
    expected_amount DECIMAL(10,2),
    difference DECIMAL(10,2),
    status ENUM('open', 'closed') DEFAULT 'open',
    notes TEXT,
    INDEX idx_store_status (store_id, status),
    INDEX idx_opening_date (opening_date),
    INDEX idx_terminal (terminal_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE RESTRICT,
    FOREIGN KEY (terminal_id) REFERENCES terminals(terminal_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: sales (Ventas)
-- ============================================================
CREATE TABLE sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    user_id INT NOT NULL,
    register_id INT NOT NULL,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'transfer', 'mixed') NOT NULL,
    status ENUM('completed', 'cancelled', 'refunded') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_store_date (store_id, sale_date),
    INDEX idx_status (status),
    INDEX idx_register (register_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (register_id) REFERENCES cash_registers(register_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: sale_details (Detalle de ventas)
-- ============================================================
CREATE TABLE sale_details (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    INDEX idx_sale (sale_id),
    INDEX idx_product (product_id),
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: cash_movements (Movimientos de caja)
-- ============================================================
CREATE TABLE cash_movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    register_id INT NOT NULL,
    user_id INT NOT NULL,
    movement_type ENUM('entry', 'withdrawal', 'sale') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_register_date (register_id, created_at),
    INDEX idx_movement_type (movement_type),
    FOREIGN KEY (register_id) REFERENCES cash_registers(register_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: promotions (Promociones)
-- ============================================================
CREATE TABLE promotions (
    promotion_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    type ENUM('simple_discount', 'bulk_discount', 'bundle', 'bill_discount') NOT NULL,
    discount_type ENUM('percentage', 'fixed_amount', 'fixed_price') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_purchase_amount DECIMAL(10,2) DEFAULT 0.00,
    min_quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_store (store_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Tabla: promotion_targets (Objetivos de promociones)
-- ============================================================
CREATE TABLE promotion_targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    product_id INT NULL,
    category_id INT NULL,
    INDEX idx_promotion (promotion_id),
    INDEX idx_product (product_id),
    INDEX idx_category (category_id),
    FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Datos iniciales de ejemplo
-- ============================================================

-- Tienda principal
INSERT INTO stores (store_name, address, phone, status) VALUES
('Tienda Principal', 'Calle Principal #123, Ciudad', '555-1234', 'active');

-- Terminal por defecto
INSERT INTO terminals (store_id, terminal_name) VALUES
(1, 'Caja Principal');

-- Categorías de ejemplo
INSERT INTO categories (store_id, category_name, description, icon_class) VALUES
(1, 'Bebidas', 'Bebidas frías y calientes', 'fa-mug-hot'),
(1, 'Snacks', 'Botanas y dulces', 'fa-cookie-bite'),
(1, 'Abarrotes', 'Productos de despensa', 'fa-basket-shopping'),
(1, 'Lácteos', 'Productos lácteos y derivados', 'fa-cheese');

-- Usuario administrador (password: admin123)
INSERT INTO users (store_id, username, password_hash, full_name, email, role, status) VALUES
(1, 'admin', '$2y$10$rDGCkOinf6RJ2ywtMU6QYeeTNkqq4/soMpsxdF4wO9lqIRTrjfP2a', 'Administrador', 'admin@tomodachi.com', 'admin', 'active');

-- Productos de ejemplo
INSERT INTO products (store_id, category_id, product_name, description, barcode, price, cost, current_stock, min_stock, status, is_bulk, unit_type, bulk_unit) VALUES
(1, 1, 'Coca Cola 600ml', 'Refresco de cola', '7501234567890', 15.50, 10.00, 48.000, 20.000, 'active', 0, 'unit', 'kg'),
(1, 1, 'Agua Natural 1L', 'Agua purificada', '7501234567891', 10.00, 6.00, 50.000, 30.000, 'active', 0, 'unit', 'kg'),
(1, 2, 'Sabritas Original 45g', 'Papas fritas', '7501234567892', 18.00, 12.00, 39.000, 25.000, 'active', 0, 'unit', 'kg'),
(1, 2, 'Galletas Marías', 'Galletas tradicionales', '7501234567893', 12.00, 8.00, 30.000, 20.000, 'active', 0, 'unit', 'kg'),
(1, 3, 'Arroz 1kg', 'Arroz blanco', '7501234567894', 25.00, 18.00, 28.000, 15.000, 'active', 0, 'unit', 'kg'),
(1, 4, 'Leche Entera 1L', 'Leche pasteurizada', '7501234567895', 22.00, 16.00, 42.000, 20.000, 'active', 0, 'unit', 'kg');
