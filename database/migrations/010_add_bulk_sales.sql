-- Migración para soportar venta a granel
-- Fecha: 2026-01-02

-- 1. Modificar tabla products
ALTER TABLE products
    MODIFY COLUMN current_stock DECIMAL(12,3) DEFAULT 0.000,
    MODIFY COLUMN min_stock DECIMAL(12,3) DEFAULT 0.000,
    ADD COLUMN is_bulk TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
    ADD COLUMN unit_type ENUM('unit', 'kg', 'g', 'l', 'ml', 'm') NOT NULL DEFAULT 'unit' AFTER is_bulk;

-- 2. Modificar tabla inventory_movements
ALTER TABLE inventory_movements
    MODIFY COLUMN quantity DECIMAL(12,3) NOT NULL,
    MODIFY COLUMN previous_stock DECIMAL(12,3) NOT NULL,
    MODIFY COLUMN new_stock DECIMAL(12,3) NOT NULL;

-- 3. Modificar tabla sale_details
ALTER TABLE sale_details
    MODIFY COLUMN quantity DECIMAL(12,3) NOT NULL;
