-- Migración: Soporte para venta a granel
-- Permite configurar productos que se venden por peso o unidad

USE tomodachi_pos;

-- Agregar campos para venta a granel en la tabla products
ALTER TABLE products
ADD COLUMN is_bulk TINYINT(1) DEFAULT 0 COMMENT 'Indica si el producto se vende a granel (por peso/volumen)' AFTER status,
ADD COLUMN bulk_unit VARCHAR(20) DEFAULT 'kg' COMMENT 'Unidad de medida para granel: kg, g, L, mL, etc.' AFTER is_bulk,
ADD INDEX idx_is_bulk (is_bulk);

-- Modificar columna quantity en sale_details para permitir decimales
ALTER TABLE sale_details
MODIFY COLUMN quantity DECIMAL(10,3) NOT NULL COMMENT 'Cantidad vendida (permite decimales para granel)';

-- Modificar columna quantity en inventory_movements para permitir decimales  
ALTER TABLE inventory_movements
MODIFY COLUMN quantity DECIMAL(10,3) NOT NULL COMMENT 'Cantidad del movimiento (permite decimales para granel)';

-- Comentarios explicativos
-- is_bulk = 0: Producto por unidad (predeterminado)
-- is_bulk = 1: Producto a granel (por peso/volumen)
-- bulk_unit: unidad de medida (kg, g, L, mL, pza, etc.)
-- Cuando is_bulk = 1, el precio representa el precio por unidad de medida
-- Ejemplo: $50/kg de manzanas, se vende 0.5 kg = $25
