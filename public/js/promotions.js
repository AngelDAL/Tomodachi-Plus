// Copiada de inventory.js
function getRelativeImagePath(imagePath) {
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') return '';
    if (/^https?:\/\//.test(imagePath)) return imagePath;
    if (imagePath.startsWith('assets/')) return imagePath;
    return 'assets/images/products/' + imagePath.replace(/^\/+/, '');
}
let selectedTargets = [];
let allProducts = [];
let promoModal;

function openPromoModal() {
    const form = document.getElementById("promoForm");
    if (form) form.reset();
    selectedTargets = [];

    // Fechas por defecto
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const startEl = document.querySelector('input[name="start_date"]');
    const endEl = document.querySelector('input[name="end_date"]');
    if (startEl) startEl.value = now.toISOString().slice(0, 16);
    if (endEl) endEl.value = nextMonth.toISOString().slice(0, 16);

    if (promoModal) {
        promoModal.classList.add("show");
        document.body.classList.add("modal-open");
        loadProductsForGrid();
        updateFormFields();
        calculateProfit();
        setTimeout(() => document.querySelector('#promoForm input[name="name"]')?.focus(), 100);
    }
}

function closePromoModal() {
    if (promoModal) {
        promoModal.classList.remove("show");
    }
    document.body.classList.remove("modal-open");
    const form = document.getElementById("promoForm");
    if (form) form.reset();
    selectedTargets = [];
}

document.addEventListener("DOMContentLoaded", () => {
    promoModal = document.getElementById("promoModal");
    const openBtn = document.getElementById("newPromoBtn");
    const closeBtn = document.getElementById("closePromoModalBtn");

    loadPromotions();
    setupEventListeners();

    if (openBtn) openBtn.addEventListener("click", (e) => { e.preventDefault(); openPromoModal(); });
    if (closeBtn) closeBtn.addEventListener("click", (e) => { e.preventDefault(); closePromoModal(); });
    if (promoModal) promoModal.addEventListener("click", (e) => { if (e.target === promoModal) closePromoModal(); });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && promoModal?.classList.contains("show")) {
            closePromoModal();
        }
    });
});

function setupEventListeners() {
    const gridSearch = document.getElementById("productGridSearch");
    if (gridSearch) gridSearch.addEventListener("input", (e) => filterProductsGrid(e.target.value));

    const promoForm = document.getElementById("promoForm");
    if (promoForm) promoForm.addEventListener("submit", savePromotion);
}

async function loadProductsForGrid() {
    const grid = document.getElementById("productsGrid");
    grid.innerHTML = "<div style='grid-column: 1/-1; text-align:center; padding: 20px;'>Cargando productos...</div>";

    try {
        const res = await fetch("../api/inventory/products.php");
        const data = await res.json();
        if (data.success) {
            allProducts = data.data;
            renderProductsGrid(allProducts);
        }
    } catch (e) {
        grid.innerHTML = "Error al cargar productos";
    }
}

function renderProductsGrid(products) {
    const grid = document.getElementById("productsGrid");
    if (products.length === 0) {
        grid.innerHTML = "<div style='grid-column: 1/-1; text-align:center; padding: 20px;'>No se encontraron productos</div>";
        return;
    }
    grid.innerHTML = products.map(p => {
        const isSelected = selectedTargets.some(t => t.id == p.product_id);
        let imgSrc = getRelativeImagePath(p.image_url || p.image_path || p.image || '');
        if (!imgSrc) {
            imgSrc = 'assets/images/products/default.png';
        }
        return `
            <div class="product-item-card ${isSelected ? "selected" : ""}" onclick="toggleProductSelection(${p.product_id})" style="position:relative;overflow:hidden;min-height:110px;display:flex;flex-direction:column;justify-content:flex-end;">
                <div class="product-img-bg" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;">
                    <img src="${imgSrc}" alt="${p.product_name}" class="product-img" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.src='assets/images/products/default.png'">
                    <div class="product-img-gradient" style="position:absolute;left:0;right:0;bottom:0;height:60%;background:linear-gradient(0deg,rgba(30,32,38,0.88) 0%,rgba(30,32,38,0.0) 60%);"></div>
                </div>
                <div style="position:relative;z-index:2;padding:10px 8px 6px 8px;text-align:left;">
                    <div class="product-item-name" style="color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.18);font-weight:700;">${p.product_name}</div>
                    <div class="product-item-price" style="color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.18);font-size:0.92em;">$${parseFloat(p.price).toFixed(2)}</div>
                </div>
            </div>
        `;
    }).join("");
    updateSelectedCount();
}

function filterProductsGrid(term) {
    const filtered = allProducts.filter(p =>
        p.product_name.toLowerCase().includes(term.toLowerCase()) ||
        (p.barcode && p.barcode.includes(term))
    );
    renderProductsGrid(filtered);
}

function toggleProductSelection(productId) {
    const index = selectedTargets.findIndex(t => t.id == productId);
    if (index > -1) {
        selectedTargets.splice(index, 1);
    } else {
        const product = allProducts.find(p => p.product_id == productId);
        selectedTargets.push({ type: "product", id: productId, name: product.product_name, price: product.price, cost: product.cost });
    }
    renderProductsGrid(allProducts);
    calculateProfit();
}

function updateSelectedCount() {
    const el = document.getElementById("selectedCount");
    if (el) el.innerText = `${selectedTargets.length} productos seleccionados`;
}

function updateFormFields() {
    const type = document.getElementById("promoType").value;
    const container = document.getElementById("conditionFields");
    const discountFields = document.getElementById("discountFields");
    const bundlePriceField = document.getElementById("bundlePriceField");

    container.innerHTML = "";

    if (type === "bundle") {
        discountFields.style.display = "none";
        bundlePriceField.style.display = "block";
    } else {
        discountFields.style.display = "flex";
        bundlePriceField.style.display = "none";

        if (type === "bill_discount") {
            container.innerHTML = `
                <div class="form-group">
                    <label>Monto M�nimo de Compra</label>
                    <input type="number" name="min_purchase_amount" class="form-control" value="0" oninput="calculateProfit()">
                </div>
            `;
        } else if (type === "bulk_discount") {
            container.innerHTML = `
                <div class="form-group">
                    <label>Cantidad M�nima (ej. 3 para 3x2)</label>
                    <input type="number" name="min_quantity" class="form-control" value="2" oninput="calculateProfit()">
                </div>
            `;
        }
    }
    calculateProfit();
}

function calculateProfit() {
    const type = document.getElementById("promoType").value;
    const form = document.getElementById("promoForm");
    const formData = new FormData(form);

    let currentTotalRevenue = 0;
    let currentTotalCost = 0;
    let newTotalRevenue = 0;

    selectedTargets.forEach(t => {
        const price = parseFloat(t.price) || 0;
        const cost = parseFloat(t.cost) || 0;
        currentTotalRevenue += price;
        currentTotalCost += cost;
    });

    if (type === "bundle") {
        newTotalRevenue = parseFloat(formData.get("bundle_price")) || 0;
    } else if (type === "simple_discount" || type === "bulk_discount") {
        const discType = formData.get("discount_type");
        const discVal = parseFloat(formData.get("discount_value")) || 0;

        selectedTargets.forEach(t => {
            const price = parseFloat(t.price) || 0;
            let discountedPrice = price;
            if (discType === "percentage") {
                discountedPrice = price * (1 - discVal / 100);
            } else {
                discountedPrice = price - discVal;
            }
            newTotalRevenue += Math.max(0, discountedPrice);
        });
    } else {
        // bill_discount is harder to estimate without a real ticket, 
        // but we can show it based on current selection if any
        const discType = formData.get("discount_type");
        const discVal = parseFloat(formData.get("discount_value")) || 0;
        if (discType === "percentage") {
            newTotalRevenue = currentTotalRevenue * (1 - discVal / 100);
        } else {
            newTotalRevenue = currentTotalRevenue - discVal;
        }
    }

    const currentProfit = currentTotalRevenue - currentTotalCost;
    const newProfit = newTotalRevenue - currentTotalCost;
    const diff = newProfit - currentProfit;

    document.getElementById("currentProfit").innerText = `$${currentProfit.toFixed(2)}`;
    document.getElementById("newProfit").innerText = `$${newProfit.toFixed(2)}`;

    const diffEl = document.getElementById("profitDiff");
    diffEl.innerText = `${diff >= 0 ? "+" : ""}$${diff.toFixed(2)}`;

    const diffRow = document.getElementById("profitDiffRow");
    diffRow.className = `profit-row profit-diff ${diff >= 0 ? "positive" : "negative"}`;
}

async function loadPromotions() {
    const list = document.getElementById("promotionsList");
    if (!list) return;
    try {
        const res = await fetch("../api/promotions/read.php");
        const data = await res.json();
        if (data && data.success) {
            renderPromotions(data.data);
        }
    } catch (e) {
        list.innerHTML = "Error de conexi�n";
    }
}

function renderPromotions(promotions) {
    const list = document.getElementById("promotionsList");
    if (!promotions || promotions.length === 0) {
        list.innerHTML = "<p style='text-align:center; color:#888;'>No hay promociones activas.</p>";
        return;
    }
    list.innerHTML = promotions.map(p => `
        <div class="promo-card ${p.is_active == 1 ? "" : "inactive"}">
            <div class="promo-details">
                <h3>${p.name}</h3>
                <div class="promo-meta">
                    <span><i class="fas fa-calendar"></i> ${new Date(p.start_date).toLocaleDateString()} - ${new Date(p.end_date).toLocaleDateString()}</span>
                    <span><i class="fas fa-tag"></i> ${formatType(p.type)}</span>
                    <span><i class="fas fa-percent"></i> ${p.type === "bundle" ? "Precio Fijo" : p.discount_value + (p.discount_type === "percentage" ? "%" : "$") + " OFF"}</span>
                </div>
            </div>
            <div class="promo-actions">
                <button class="btn btn-sm btn-danger" onclick="deletePromotion(${p.promotion_id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join("");
}

async function savePromotion(e) {
    e.preventDefault();
    if (selectedTargets.length === 0 && document.getElementById("promoType").value !== "bill_discount") {
        alert("Selecciona al menos un producto");
        return;
    }

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.targets = selectedTargets;

    try {
        const res = await fetch("../api/promotions/create.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            closePromoModal();
            loadPromotions();
            alert("Promoci�n guardada");
        } else {
            alert("Error: " + result.message);
        }
    } catch (e) {
        alert("Error de conexi�n");
    }
}

async function deletePromotion(id) {
    if (!confirm("�Eliminar promoci�n?")) return;
    try {
        const res = await fetch("../api/promotions/delete.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ promotion_id: id })
        });
        if ((await res.json()).success) loadPromotions();
    } catch (e) {
        alert("Error al eliminar");
    }
}

function formatType(type) {
    const types = { "simple_discount": "Simple", "bulk_discount": "Volumen", "bill_discount": "Total", "bundle": "Paquete" };
    return types[type] || type;
}
