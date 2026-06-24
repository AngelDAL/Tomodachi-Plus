// =============================================
// Promotions - Extraído de sales.js
// =============================================

// ==========================================
// SISTEMA DE PROMOCIONES
// ==========================================

let ACTIVE_PROMOTIONS = [];
let CURRENT_BILL_DISCOUNT = 0;

async function loadActivePromotions() {
    try {
        const res = await fetch('../api/promotions/read.php?active=true');
        const data = await res.json();
        if (data.success) {
            ACTIVE_PROMOTIONS = data.data;
            console.log('Promociones cargadas:', ACTIVE_PROMOTIONS.length);
        }
    } catch (e) {
        console.error('Error loading promotions', e);
    }
}

function applyPromotions() {
    if (!ACTIVE_PROMOTIONS.length) return;

    // Reset item prices to original (unless manually edited)
    CART.forEach(item => {
        if (!item.manual_edit) {
             item.unit_price = item.original_price;
             item.subtotal = item.quantity * item.unit_price;
             item.promo_applied = null;
             item.bundle_data = null;
        }
    });

    CURRENT_BILL_DISCOUNT = 0;
    let totalBillDiscount = 0;

    // 1. Apply Item-level promotions (Simple, Bulk)
    ACTIVE_PROMOTIONS.forEach(promo => {
        if (promo.type === 'simple_discount') {
            applySimpleDiscount(promo);
        } else if (promo.type === 'bulk_discount') {
            applyBulkDiscount(promo);
        } else if (promo.type === 'bundle') {
            applyBundleDiscount(promo);
        }
    });

    // Recalcular subtotals después de aplicar promos
    CART.forEach(item => {
        item.subtotal = item.quantity * item.unit_price;
    });

    // 2. Apply Bill-level promotions
    let subtotal = CART.reduce((sum, item) => sum + item.subtotal, 0);
    
    ACTIVE_PROMOTIONS.forEach(promo => {
        if (promo.type === 'bill_discount') {
            if (subtotal >= parseFloat(promo.min_purchase_amount)) {
                if (promo.discount_type === 'percentage') {
                    totalBillDiscount += subtotal * (parseFloat(promo.discount_value) / 100);
                } else {
                    totalBillDiscount += parseFloat(promo.discount_value);
                }
            }
        }
    });
    
    CURRENT_BILL_DISCOUNT = totalBillDiscount;
}

function applySimpleDiscount(promo) {
    CART.forEach(item => {
        if (isTarget(item, promo)) {
            let discount = 0;
            if (promo.discount_type === 'percentage') {
                discount = item.original_price * (parseFloat(promo.discount_value) / 100);
            } else {
                discount = parseFloat(promo.discount_value);
            }
            
            let newPrice = item.original_price - discount;
            if (newPrice < 0) newPrice = 0;
            
            if (!item.manual_edit && newPrice < item.unit_price) {
                item.unit_price = newPrice;
                item.promo_applied = promo.name;
            }
        }
    });
}

function applyBulkDiscount(promo) {
    let eligibleItems = CART.filter(item => isTarget(item, promo));
    let totalQty = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQty >= parseInt(promo.min_quantity)) {
        eligibleItems.forEach(item => {
             let discount = 0;
            if (promo.discount_type === 'percentage') {
                discount = item.original_price * (parseFloat(promo.discount_value) / 100);
            } else {
                discount = parseFloat(promo.discount_value);
            }
            
            let newPrice = item.original_price - discount;
            if (newPrice < 0) newPrice = 0;
            
            if (!item.manual_edit && newPrice < item.unit_price) {
                item.unit_price = newPrice;
                item.promo_applied = promo.name;
            }
        });
    }
}

function applyBundleDiscount(promo) {
    const requiredTargets = promo.targets; 
    if (!requiredTargets || requiredTargets.length === 0) return;

    // Lógica STRICT SET (Conjunto Completo):
    // El bundle solo aplica si están presentes TODOS los items definidos en los targets.
    // Asumimos que se requiere 1 unidad de cada target para formar 1 bundle.
    
    // 1. Calcular cuántos "Sets" completos podemos formar
    let potentialBundles = Number.MAX_SAFE_INTEGER;
    
    // Mapa para saber qué items del carrito cumplen qué target
    // target_index -> [ { item_ref, qty_available } ]
    let usageMap = [];

    // Verificación de cobertura de targets
    for (let i = 0; i < requiredTargets.length; i++) {
        let t = requiredTargets[i];
        
        // Encontrar items en el carrito que coincidan con este target
        let matches = CART.filter(item => {
            if (t.product_id && item.product_id == t.product_id) return true;
            if (t.category_id && item.category_id == t.category_id) return true;
            return false;
        });
        
        let totalQtyForTarget = matches.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalQtyForTarget === 0) {
            potentialBundles = 0; // Faltan componentes del bundle
            break;
        }
        
        potentialBundles = Math.min(potentialBundles, totalQtyForTarget);
        usageMap[i] = matches; 
    }

    let numBundles = potentialBundles;
    
    // Si no se puede formar ningún paquete completo, salir
    if (numBundles === 0 || numBundles === Number.MAX_SAFE_INTEGER) return;

    // 2. Calcular costos
    let bundlePrice = parseFloat(promo.discount_value);
    let totalBundleCost = numBundles * bundlePrice;

    // 3. Identificar las unidades físicas que participan en los bundles
    // Para calcular el precio original de esas unidades y determinar el ratio de descuento.
    let participatingUnits = []; // { item: ref, qty: number, originalAmount: number }

    for (let i = 0; i < requiredTargets.length; i++) {
        let matches = usageMap[i]; // Items del carrito que sirven para este target
        let countNeeded = numBundles; // Necesitamos 'numBundles' unidades de este target

        // Ordenamos por precio para maximizar el descuento (o estandarizar).
        // En este caso, tomamos simplemente las disponibles.
        for (let item of matches) {
            if (countNeeded <= 0) break;
            
            let taking = Math.min(item.quantity, countNeeded);
            
            participatingUnits.push({
                item: item,
                qty: taking,
                originalAmount: taking * item.original_price
            });
            
            countNeeded -= taking;
        }
    }

    // 4. Calcular Ratio de Descuento
    let totalOriginalPrice = participatingUnits.reduce((sum, u) => sum + u.originalAmount, 0);
    // Evitar target > original protecciones si el usuario quiere bundle fijo.
    // Simplemente distribuimos el precio del bundle entre los items.
    let ratio = totalOriginalPrice > 0 ? totalBundleCost / totalOriginalPrice : 1;

    // 5. Aplicar precios al Carrito (Weighted Average)
    // Un item puede tener 5 unidades, pero solo 2 son parte de bundles. 
    // Precio Final = ((2 * PrecioDescuento) + (3 * PrecioOriginal)) / 5
    
    // Agrupar impacto por item
    let itemImpact = new Map(); // item -> { bundledQty: 0, bundledRevenue: 0 }

    participatingUnits.forEach(u => {
        if (!itemImpact.has(u.item)) {
            itemImpact.set(u.item, { bundledQty: 0, bundledRevenue: 0 });
        }
        let info = itemImpact.get(u.item);
        info.bundledQty += u.qty;
        info.bundledRevenue += (u.originalAmount * ratio);
    });

    itemImpact.forEach((info, item) => {
        if (item.manual_edit) return;

        let remainingQty = item.quantity - info.bundledQty;
        // El resto se cobra a precio original (u original_price puede ya tener desc. simple? 
        // Asumimos prioridad bundle > simple. applyPromotions resetea a original_price siempre al inicio).
        let remainingRevenue = remainingQty * item.original_price;
        
        let totalRevenue = info.bundledRevenue + remainingRevenue;
        let avgPrice = totalRevenue / item.quantity;
        
        // Aplicar
        item.unit_price = avgPrice;
        item.subtotal = totalRevenue;
        item.promo_applied = `${promo.name} (${numBundles} packs)`;

        // Guardar metadatos para visualización agrupada
        item.bundle_data = {
            name: promo.name,
            count: numBundles,
            in_bundle_qty: info.bundledQty,
            in_bundle_subtotal: info.bundledRevenue,
            out_bundle_qty: remainingQty, 
            out_bundle_subtotal: remainingRevenue
        };
    });
}

function isTarget(item, promo) {
    if (!promo.targets || promo.targets.length === 0) return false;
    return promo.targets.some(t => 
        (t.product_id && t.product_id == item.product_id) || 
        (t.category_id && t.category_id == item.category_id)
    );
}
