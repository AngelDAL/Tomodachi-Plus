-- Tabla de Promociones
CREATE TABLE IF NOT EXISTS promotions (
    promotion_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    
    -- Tipo de promoción
    -- simple_discount: Descuento directo en productos específicos o categorías
    -- bulk_discount: Descuento por cantidad (ej. lleva 3 paga 2, o 3 con 10% desc)
    -- bundle: Paquete de productos específicos juntos
    -- bill_discount: Descuento al total de la cuenta
    type ENUM('simple_discount', 'bulk_discount', 'bundle', 'bill_discount') NOT NULL,
    
    -- Cómo se aplica el descuento
    discount_type ENUM('percentage', 'fixed_amount', 'fixed_price') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    
    -- Condiciones
    min_purchase_amount DECIMAL(10,2) DEFAULT 0, -- Para bill_discount
    min_quantity INT DEFAULT 1, -- Para bulk_discount
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(store_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Items/Objetivos de la Promoción
CREATE TABLE IF NOT EXISTS promotion_targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id INT NOT NULL,
    product_id INT NULL,
    category_id INT NULL,
    
    -- Para bundles, podríamos necesitar saber si es un item requerido
    -- Por ahora asumimos que todos los targets son requeridos para el bundle
    
    FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
