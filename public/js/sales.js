/**
 * Lógica de Punto de Venta (Carrito y Venta) - Versión Simplificada
 */
let CART = [];
let MULTI_CARTS = { '1': [], '2': [], '3': [], '4': [] }; // Soporte para múltiples carritos
let CURRENT_TAB = '1';

// Control de operaciones para evitar duplicados por clicks rápidos
let isCartProcessing = false;

let CURRENT_STORE_ID = null;
let allProducts = [];
let allCategories = [];
let activeCategoryId = null;
let categoryBar;
let isCatDragging = false;
let catDragStartX = null;
let catScrollStart = 0;
let PARKED_SALES = []; // Nueva variable para ventas suspendidas

// Variables globales para elementos DOM
let searchInput, searchResults, cartBody, emptyCartMsg;
let totalBadge, cartBadge, discountInput, taxInput, paymentMethodSelect;
let checkoutReceivedInput, checkoutChangeDisplay, finalizeSaleBtn;
let cartToggle, cartPanel, closeCartBtn, productGallery, cartHandleBtn, panelTotalEl;

// Modal elements
let itemOptionsModal, closeItemModalBtn, saveItemOptionsBtn;
let modalProductName, modalOriginalPrice, modalNewPrice;
let discountTypeSelect, discPercentInput, discFixedInput, nxnBuyInput, nxnPayInput;
let optPercent, optFixed, optNxn;

let EDITING_PRODUCT_ID = null;

// Agregar toggle para footer del carrito y acciones del header
function setupToggles() {
    // Footer Cart Toggle eliminado bajo solicitud del usuario
    // ahora el footer es estático y siempre visible.

    // Header Actions Toggle (Chevron Centrado) - Obsoleto
    // Se mantiene código muerto por si se revierte, pero no afectará si el elemento no existe
    const collapseHeaderBtn = document.getElementById('collapseHeaderBtn');
    const actionsRow = document.getElementById('headerActionsRow');

    if(collapseHeaderBtn && actionsRow) {
        collapseHeaderBtn.onclick = () => {
            /* Logic disabled */
        };
    }
}

function initPOS() {
  // Inicializar referencias a elementos DOM
  searchInput = document.getElementById('searchInput');
  searchResults = document.getElementById('searchResults');
  cartBody = document.getElementById('cartBody');
  emptyCartMsg = document.getElementById('emptyCartMsg');
  totalBadge = document.getElementById('totalBadge');
  cartBadge = document.getElementById('cartCountBadge');
  discountInput = document.getElementById('discountInput');
  taxInput = document.getElementById('taxInput');
  paymentMethodSelect = document.getElementById('paymentMethod');
  checkoutReceivedInput = document.getElementById('checkoutReceived');
  checkoutChangeDisplay = document.getElementById('checkoutChange');
  finalizeSaleBtn = document.getElementById('finalizeSaleBtn');
  
  // Cart Layout Elements
  cartBadge = document.getElementById('mobileCartCount'); 

  
  productGallery = document.getElementById('productGallery');
  categoryBar = document.getElementById('categoryBar');
  panelTotalEl = document.getElementById('panelTotal');

  // Modal elements init
  itemOptionsModal = document.getElementById('itemOptionsModal');
  closeItemModalBtn = document.getElementById('closeItemModalBtn');
  saveItemOptionsBtn = document.getElementById('saveItemOptionsBtn');
  modalProductName = document.getElementById('modalProductName');
  modalOriginalPrice = document.getElementById('modalOriginalPrice');
  modalNewPrice = document.getElementById('modalNewPrice');
  discountTypeSelect = document.getElementById('discountTypeSelect');
  discPercentInput = document.getElementById('discPercentInput');
  discFixedInput = document.getElementById('discFixedInput');
  nxnBuyInput = document.getElementById('nxnBuyInput');
  nxnPayInput = document.getElementById('nxnPayInput');
  optPercent = document.getElementById('opt-percent');
  optFixed = document.getElementById('opt-fixed');
  optNxn = document.getElementById('opt-nxn');

  // Obtener store_id del atributo de datos en el body
  CURRENT_STORE_ID = document.body.getAttribute('data-store-id') || 1;

  // Ahora vinculamos eventos
  bindEvents();
  setupToggles(); // Inicializar toggles (footer y header)

  // Delegación de eventos para el carrito (Fix doble click y performance)
  setupCartEventsDelegation();

  // Inyectar interfaz de pestañas si no existe
  injectCartTabsUI();
  // Configuración del modal de historial
  // Antes se llamaba a injectHistorySidebar, ahora usamos setupHistoryModal
  // Aseguramos que el botón exista antes de llamarlo
  if(document.getElementById('toggleHistoryBtn')) {
      // Definimos la función inline si queremos asegurar su ejecución o renombramos la inyección
      // Pero mejor, actualizamos la referencia si es necesario
      setupHistoryModal(); 
  }

  // Inicializar menú contextual y preferencias
  initContextMenu();

  // View order select
  const viewOrderSelect = document.getElementById('viewOrderSelect');
  if (viewOrderSelect) {
    viewOrderSelect.addEventListener('change', () => {
      applyPrefsAndRender();
    });
  }

  // Reset view prefs
  const resetViewBtn = document.getElementById('resetViewPrefsBtn');
  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => {
      try {
        const storeId = document.body.getAttribute('data-store-id') || '1';
        localStorage.removeItem('pos_prefs_' + storeId);
      } catch {}
      if (viewOrderSelect) viewOrderSelect.value = 'default';
      showNotification('Orden restaurado', 'info');
      filterAndRenderProducts();
    });
  }

  // Persistencia: Cargar carritos guardados (Sistema Multi-Tab)
  const savedCarts = localStorage.getItem('tomodachi_multi_carts');
  if (savedCarts) {
    try {
      MULTI_CARTS = JSON.parse(savedCarts);
    } catch (e) {
      console.error('Error cargando carritos guardados', e);
      localStorage.removeItem('tomodachi_multi_carts');
    }
  } else {
    // Migración: Si existe un carrito antiguo simple, moverlo al tab 1
    const oldCart = localStorage.getItem('tomodachi_cart');
    if (oldCart) {
      try {
        MULTI_CARTS['1'] = JSON.parse(oldCart);
        localStorage.removeItem('tomodachi_cart');
      } catch (e) { }
    }
  }

  // Recuperar pestaña activa
  const savedTab = localStorage.getItem('tomodachi_current_tab');
  if (savedTab && MULTI_CARTS[savedTab]) {
    CURRENT_TAB = savedTab;
  }

  // Inicializar carrito actual
  CART = MULTI_CARTS[CURRENT_TAB] || [];

  // Actualizar UI inicial de pestañas
  document.querySelectorAll('.cart-tab-btn').forEach(btn => {
    const t = btn.getAttribute('data-tab');
    if (t === CURRENT_TAB) btn.classList.add('active');
    else btn.classList.remove('active');
    updateTabBadge(t);
  });

  renderCart();

  // Cargar ventas suspendidas
  const savedParked = localStorage.getItem('tomodachi_parked_sales');
  if (savedParked) {
    try {
      PARKED_SALES = JSON.parse(savedParked);
      updateParkedSalesIndicator();
    } catch (e) {
      console.error('Error cargando ventas suspendidas', e);
    }
  }

  loadCategoriesAndProducts();
  loadActivePromotions();

  // Iniciar sync si hay sesión activa
  if (displaySessionUUID) {
    startSyncInterval();
  }
}

function bindEvents() {
  // Búsqueda con debounce
  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const term = searchInput.value.trim();
      if (!term) {
        if (searchResults) searchResults.classList.add('hidden');
        if (productGallery) productGallery.style.display = 'grid';
        return;
      }
      debounceTimer = setTimeout(() => searchProducts(term), 300);
    });
  }

  // Mobile View Switcher logic (New)
  const viewSwitchBtns = document.querySelectorAll('.view-switch-btn');
  const productsColumn = document.querySelector('.products-column');
  const cartColumn = document.querySelector('.cart-column');

  if (viewSwitchBtns.length > 0) {
      viewSwitchBtns.forEach(btn => {
          btn.addEventListener('click', () => {
              const target = btn.dataset.target;
              
              viewSwitchBtns.forEach(b => b.classList.remove('active'));
              btn.classList.add('active');

              // Toggle visibility classes
              if (target === 'products-column') {
                  if(productsColumn) productsColumn.classList.add('active');
                  if(cartColumn) cartColumn.classList.remove('active');
              } else {
                  if(cartColumn) cartColumn.classList.add('active');
                  if(productsColumn) productsColumn.classList.remove('active');
              }
          });
      });
  }

  // Eventos de los Nuevos Filtros (Categoría y Orden)
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');

    // Manejo del Nuevo Menú de Configuración
    const configBtn = document.getElementById('configMenuBtn');
    const configDropdown = document.getElementById('configDropdown');
    const toggleScaleBtn = document.getElementById('toggleScaleBtn');
    const toggleCustomerBtn = document.getElementById('toggleCustomerDisplayBtn');
    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');

    if (configBtn && configDropdown) {
        configBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            configDropdown.classList.toggle('hidden');
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!configDropdown.contains(e.target) && e.target !== configBtn) {
                configDropdown.classList.add('hidden');
            }
        });
    }

    if(toggleScaleBtn) {
        toggleScaleBtn.addEventListener('click', () => {
             // Solo ocultar dropdown (la acción la maneja initScaleManager)
             if(configDropdown) configDropdown.classList.add('hidden');
        });
    }

    if(toggleCustomerBtn) {
        toggleCustomerBtn.addEventListener('click', () => {
             if(configDropdown) configDropdown.classList.add('hidden');
             // La acción la maneja initCustomerDisplay
        });
    }

    // Botón para copiar enlace de pantalla de cliente (para tablet)
    const copyDisplayLinkBtn = document.getElementById('copyDisplayLinkBtn');
    if (copyDisplayLinkBtn) {
        copyDisplayLinkBtn.addEventListener('click', async () => {
            if (configDropdown) configDropdown.classList.add('hidden');

            try {
                // Enviar carrito actual al servidor para crear/actualizar sesión
                const payload = {
                    cart: getCombinedCartForDisplay(),
                    totals: calculateTotalsForDisplay(),
                    storeInfo: {
                        name: localStorage.getItem('tomodachi_store_name') || document.querySelector('.sidebar-header h2')?.textContent || 'Tomodachi',
                        logo: ''
                    },
                    activeTab: parseInt(CURRENT_TAB),
                    session: displaySessionUUID || undefined
                };

                const res = await fetch('../api/sales/cart_sync.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success && json.data && json.data.session) {
                    displaySessionUUID = json.data.session;
                    try { localStorage.setItem('tomodachi_display_session', displaySessionUUID); } catch (_) {}
                    startSyncInterval();
                    showNotification('✓ Enlace generado. El display se actualiza automáticamente', 'success');
                }

                if (!displaySessionUUID) {
                    showNotification('Error al crear sesión', 'error');
                    return;
                }

                // Generar URL con el UUID de sesión
                const baseUrl = window.location.origin + '/Tomodachi/public/customer-display.html';
                const url = baseUrl + '?cart=' + displaySessionUUID;

                navigator.clipboard.writeText(url).then(() => {
                    showNotification('✓ Enlace copiado al portapapeles', 'success');
                }).catch(() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = url;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showNotification('✓ Enlace copiado al portapapeles', 'success');
                });
            } catch (e) {
                console.error('Error al crear sesión:', e);
                showNotification('Error al generar enlace', 'error');
            }
        });
    }

    if(toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', () => {
             if(configDropdown) configDropdown.classList.add('hidden');
             // La acción la maneja setupHistoryModal
        });
    }

    // Header Actions Toggle (Chevron Centrado) - YA NO SE USA
    /* 
    const collapseHeaderBtn = document.getElementById('collapseHeaderBtn'); 
    ... Eliminar o comentar
    */

  if(categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
          activeCategoryId = e.target.value === 'all' ? null : e.target.value;
          filterAndRenderProducts();
      });
  }

  if(sortFilter) {
      sortFilter.addEventListener('change', (e) => {
          filterAndRenderProducts(); // Re-render con orden
      });
  }

  // Pestañas del carrito (Venta 1, 2, 3, 4)
  document.querySelectorAll('.cart-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = btn.getAttribute('data-tab');
      switchCartTab(tabName);
    });
  });

  // Pestañas internas del panel (Productos / Ajustes)
  document.querySelectorAll('.panel-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = btn.getAttribute('data-tab');

      // Update buttons
      document.querySelectorAll('.panel-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update content
      document.querySelectorAll('.cart-tab-content').forEach(c => c.classList.remove('active'));
      const content = document.getElementById(`tab-${tabId}`);
      if (content) content.classList.add('active');
    });
  });

  // Eventos de cálculos
  if (discountInput) discountInput.addEventListener('input', recalcTotals);
  if (taxInput) taxInput.addEventListener('input', recalcTotals);
  if (paymentMethodSelect) paymentMethodSelect.addEventListener('change', onPaymentMethodChange);
  if (checkoutReceivedInput) {
    checkoutReceivedInput.addEventListener('input', recalcChange);
    // Seleccionar todo el texto al enfocar para edición rápida
    checkoutReceivedInput.addEventListener('focus', (e) => {
      e.target.select();
      setTimeout(() => e.target.select(), 0);
    });
  }
  if (finalizeSaleBtn) finalizeSaleBtn.addEventListener('click', finalizeSale);

  // Modal events
  if (closeItemModalBtn) closeItemModalBtn.addEventListener('click', closeItemOptions);
  if (saveItemOptionsBtn) saveItemOptionsBtn.addEventListener('click', saveItemOptions);
  if (discountTypeSelect) discountTypeSelect.addEventListener('change', onDiscountTypeChange);

  // Live preview events
  [discPercentInput, discFixedInput, nxnBuyInput, nxnPayInput].forEach(el => {
    if (el) el.addEventListener('input', updateModalPreview);
  });

  // Global Hotkeys
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') { // F2: Enfocar búsqueda
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }
    if (e.key === 'F4') { // F4: Cobrar / Finalizar
      e.preventDefault();
      if (finalizeSaleBtn && !finalizeSaleBtn.disabled) finalizeSaleBtn.click();
    }
    if (e.key === 'F7') { // F7: Suspender venta
      e.preventDefault();
      parkCurrentSale();
    }
    if (e.key === 'Escape') { // ESC: Cerrar modales o limpiar búsqueda
      if (itemOptionsModal && !itemOptionsModal.classList.contains('hidden')) {
        closeItemOptions();
      } else if (document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.blur();
        if (searchResults) searchResults.classList.add('hidden');
        if (productGallery) productGallery.style.display = 'grid';
      }
    }
  });

  // Eliminado auto-cierre al hacer click fuera: el usuario controla con botones
  
  // Simple Swipe Navigation for Mobile
  let touchStartX = 0;
  const contentGrid = document.querySelector('.pos-content-grid');
  
  if (contentGrid) {
      contentGrid.addEventListener('touchstart', e => {
          touchStartX = e.changedTouches[0].screenX;
      }, {passive: true});
      
      contentGrid.addEventListener('touchend', e => {
          const touchEndX = e.changedTouches[0].screenX;
          const diff = touchStartX - touchEndX;
          const threshold = 50; // min swipe distance
          
          if (Math.abs(diff) < threshold) return;
          
          if (window.innerWidth <= 900) {
              const productsBtn = document.querySelector('.view-switch-btn[data-target="products-column"]');
              const cartBtn = document.querySelector('.view-switch-btn[data-target="cart-column"]');
              
              if (diff > 0) { // Swiped Left: Go to Cart (if on Products)
                   if (productsBtn && productsBtn.classList.contains('active') && cartBtn) {
                       cartBtn.click();
                   }
              } else { // Swiped Right: Go to Products (if on Cart)
                  if (cartBtn && cartBtn.classList.contains('active') && productsBtn) {
                      productsBtn.click();
                  }
              }
          }
      }, {passive: true});
  }
}

function switchCartTab(tabName) {
  if (tabName === CURRENT_TAB) return;

  // Guardar estado actual (por seguridad, aunque renderCart lo mantiene)
  MULTI_CARTS[CURRENT_TAB] = [...CART];

  // Cambiar contexto
  CURRENT_TAB = tabName;
  localStorage.setItem('tomodachi_current_tab', CURRENT_TAB);
  CART = MULTI_CARTS[CURRENT_TAB] || [];

  // Actualizar UI Botones
  document.querySelectorAll('.cart-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    }
  });

  // Limpiar inputs de pago al cambiar de venta
  if (discountInput) discountInput.value = '';
  if (taxInput) taxInput.value = '';
  if (checkoutReceivedInput) checkoutReceivedInput.value = '';
  if (typeof resetMoneyCounts === 'function') resetMoneyCounts(true);

  // Renderizar el nuevo carrito
  renderCart();
}

async function searchProducts(term) {
  try {
    // Eliminado store_id de los parámetros, el backend usa la sesión
    const res = await fetch('../api/inventory/products.php?search=' + term, { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
    if (!await checkSessionStatus(res)) return; // Verificar sesión
    const resData = await res.json();
    if (!resData.success) { return; }
    const list = resData.data || [];

    if (!list.length) {
      searchResults.innerHTML = '<div class="empty-cart">Sin resultados</div>';
      productGallery.style.display = 'none';
      searchResults.classList.remove('hidden');
      return;
    }

    // Renderizar resultados con el mismo estilo que la galería principal
    searchResults.innerHTML = list.map((p, index) => {
      const imagePath = getRelativeImagePath(p.image_path);
      return `
      <div class="gallery-item" data-id="${p.product_id}" data-price="${p.price}" data-stock="${p.stock_quantity !== undefined ? p.stock_quantity : ''}" data-image="${p.image_path || ''}" data-is_bulk="${p.is_bulk || 0}" data-bulk_unit="${p.bulk_unit || 'kg'}" data-category="${p.category_id || ''}" title="${escapeHtml(p.product_name)}" style="animation-delay: ${Math.min(index * 0.05, 0.5)}s">
        <div class="img-wrap">${imagePath ? `<img src="${imagePath}" alt="img" onerror="this.outerHTML='<span class=\\'no-img\\'>Sin imagen</span>'">` : '<span class="no-img">Sin imagen</span>'}</div>
        <div class="g-name">${escapeHtml(p.product_name)}</div>
        <div class="g-price">${formatCurrency(p.price)}</div>
      </div>
    `}).join('');

    productGallery.style.display = 'none';
    searchResults.classList.remove('hidden');

    Array.from(searchResults.querySelectorAll('.gallery-item')).forEach(el => {
      el.addEventListener('click', () => {
        // Feedback visual
        el.classList.add('item-added-feedback');

        addProductToCart({
          product_id: parseInt(el.getAttribute('data-id')),
          product_name: el.querySelector('.g-name').textContent,
          unit_price: parseFloat(el.getAttribute('data-price')),
          image_path: el.getAttribute('data-image'),
          stock_quantity: parseInt(el.getAttribute('data-stock')),
          is_bulk: parseInt(el.getAttribute('data-is_bulk')) || 0,
          bulk_unit: el.getAttribute('data-bulk_unit') || 'kg',
          category_id: el.getAttribute('data-category') || undefined
        });

        // Pequeño delay para apreciar el feedback antes de cerrar resultados
        setTimeout(() => {
          searchInput.value = '';
          searchResults.classList.add('hidden');
          productGallery.style.display = 'grid';
        }, 250);
      });
    });

    addIndicatorsToItems();
  } catch (e) {
    console.error(e);
  }
}

function addProductToCart(prod) {
  // Evitar duplicados por clicks rápidos (Debounce de operación)
  if (isCartProcessing) return;
  isCartProcessing = true;

  // Recargar promociones activas para asegurar tener las últimas reglas
  loadActivePromotions().then(() => {
      // Si es producto a granel, solicitar cantidad primero
      if (prod.is_bulk == 1) {
        promptBulkQuantity(prod);
      } else {
        _addToCartInternal(prod);
      }
  }).finally(() => {
     // Liberar bloqueo después de un breve delay para evitar rebotes
     setTimeout(() => { isCartProcessing = false; }, 300);
  });
}

function _addToCartInternal(prod) {
  const existing = CART.find(i => i.product_id === prod.product_id);

  // Validación de Stock
  const currentQty = existing ? existing.quantity : 0;
  // Si prod.stock_quantity es undefined o null, asumimos infinito o no controlado
  const maxStock = (prod.stock_quantity !== undefined && prod.stock_quantity !== null && prod.stock_quantity !== '') ? parseInt(prod.stock_quantity) : null;

  if (maxStock !== null && (currentQty + 1) > maxStock) {
    showNotification(`Stock insuficiente. Disponible: ${maxStock}`, 'error');
    playSound('Error.mp3');
    return;
  }

  if (existing) {
    existing.quantity += 1;
    recalcItemPrice(existing);
  } else {
    CART.push({
      product_id: prod.product_id,
      product_name: prod.product_name,
      unit_price: prod.unit_price,
      original_price: prod.unit_price,
      quantity: 1,
      subtotal: prod.unit_price,
      image_path: prod.image_path,
      discount_type: 'none',
      discount_value: 0,
      nxn_buy: 0,
      nxn_pay: 0,
      stock_quantity: maxStock, // Guardar referencia del stock
      is_bulk: prod.is_bulk || 0,
      bulk_unit: prod.bulk_unit || 'kg',
      category_id: prod.category_id
    });
  }
  playSound('Sound2.mp3');
  renderCart();
  showNotification('Producto añadido', 'success');
}




/* Solución para el problema de doble click: DELEGACIÓN DE EVENTOS */
function setupCartEventsDelegation() {
    if(!cartBody) return;

    // Verificar si ya se adjuntaron eventos para evitar duplicados
    if (cartBody.dataset.eventsAttached === 'true') {
        console.log('Cart events already attached, skipping...');
        return;
    }

    // Solo un listener para todos los items
    cartBody.addEventListener('click', (e) => {
        // Encontrar target relevante
        const target = e.target;
        
        // 1. STEPPER BTN (+ / -)
        const stepBtn = target.closest('.step-btn');
        if (stepBtn) {
            e.stopPropagation();
            e.preventDefault(); // Prevenir selección o doble trigger
            
            // Protección contra clicks rápidos (rebote)
            if (isCartProcessing) return;
            isCartProcessing = true;
            // Liberar bloqueo rápido para permitir interacción fluida pero evitar rebotes mecánicos
            setTimeout(() => isCartProcessing = false, 250);

            handleStepBtnClick(stepBtn);
            return;
        }

        // 2. QTY DISPLAY (Manual Entry)
        const qtyDisplay = target.closest('.qty-display');
        if (qtyDisplay) {
            e.stopPropagation();
// ...

            const id = parseInt(qtyDisplay.getAttribute('data-id'));
            const it = CART.find(i => i.product_id === id);
            if(it && it.is_bulk == 1) promptBulkQuantity(it);
            return;
        }

        // 3. EDIT OPTIONS (Price or Item click?)
        // Se pidió que al seleccionar precio pueda modificarlo
        const priceArea = target.closest('.item-price-area');
        if(priceArea) {
             e.stopPropagation();
             const id = parseInt(priceArea.getAttribute('data-id'));
             openItemOptions(id);
             return;
        }
    });

    // Marcar que ya está setup
    cartBody.dataset.eventsAttached = 'true';
}

function handleStepBtnClick(btn) {
    const id = parseInt(btn.getAttribute('data-id'));
    const action = btn.getAttribute('data-action');
    const it = CART.find(i => i.product_id === id);
    if(!it) return;

    let step = it.is_bulk == 1 ? 0.1 : 1; 
    if(it.is_bulk == 1 && action === 'minus' && it.quantity <= 0.1) step = 0.01;

    let newQty = action === 'plus' ? it.quantity + step : it.quantity - step;
    
    // Fix JS float precision
    newQty = Math.round(newQty * 1000) / 1000;

    if(newQty <= 0) {
           CART = CART.filter(i => i.product_id !== id);
           playSound('Sound3.mp3');
    } else {
        // Stock Check
        const maxStock = (it.stock_quantity !== undefined && it.stock_quantity !== null && it.stock_quantity !== '') ? parseFloat(it.stock_quantity) : null;
        if (action === 'plus' && maxStock !== null && newQty > maxStock) {
            showNotification(`Stock máximo alcanzado (${maxStock})`, 'warning');
            return; 
        }
        it.quantity = newQty;
    }
    
    recalcItemPrice(it);
    renderCart();
}

function renderCart() {
  // Persistencia: Guardar estado multi-carrito
  MULTI_CARTS[CURRENT_TAB] = CART;
  localStorage.setItem('tomodachi_multi_carts', JSON.stringify(MULTI_CARTS));

  // Actualizar badge de la pestaña actual
  updateTabBadge(CURRENT_TAB);

  if (!cartBody || !emptyCartMsg) return;

  // Aplicar promociones ANTES de renderizar el HTML para que los precios
  // de cada producto reflejen el descuento (applyPromotions se llama dentro de
  // recalcTotals, pero recalcTotals se ejecuta DESPUÉS del renderizado)
  applyPromotions();
  CART.forEach(item => { item.subtotal = item.quantity * item.unit_price; });

  if (!CART.length) {
    cartBody.innerHTML = '';
    emptyCartMsg.style.display = 'block';
    if (finalizeSaleBtn) finalizeSaleBtn.disabled = true;
    if (cartBadge) {
      cartBadge.textContent = '0';
      cartBadge.classList.add('hidden');
      cartBadge.style.display = 'none';
    }
    if(panelTotalEl) {
        panelTotalEl.textContent = formatCurrency(0);
        document.getElementById('cartSubtotal').textContent = formatCurrency(0);
    }
    return;
  }

  emptyCartMsg.style.display = 'none';
  if (finalizeSaleBtn) finalizeSaleBtn.disabled = false;

  // Actualizar badge global si existe
  if (cartBadge) {
    const totalItems = CART.reduce((acc, item) => acc + item.quantity, 0); // O CART.length
    cartBadge.textContent = totalItems > 99 ? '99+' : Math.round(totalItems);
    cartBadge.classList.remove('hidden');
    cartBadge.style.display = '';
  }

    // Generate HTML (Optimized Layout requested)
    // Orden Inverso: Mostrar el último item agregado primero (LIFO visual)
    const displayCart = [...CART].reverse();

    // [Image] [Center: Name + Price below] [Right: Stepper]
    cartBody.innerHTML = displayCart.map(item => {
      let imgHtml = '<div class="cart-item-img-placeholder"><i class="fas fa-box"></i></div>';
      const imagePath = getRelativeImagePath(item.image_path);
      
      if (imagePath) {
        imgHtml = `<img src="${imagePath}" alt="img" class="cart-item-img" onerror="this.outerHTML='<div class=\\'cart-item-img-placeholder\\'><i class=\\'fas fa-box\\'></i></div>'">`;
      }

      // Price logic with discount indicator
      let priceHtml;
      if (item.unit_price < item.original_price) {
          const origTotal = item.quantity * item.original_price;
          priceHtml = `<span class="cart-orig-price">${formatCurrency(origTotal)}</span> <span class="cart-disc-price">${formatCurrency(item.subtotal)}</span>`;
          if (item.discount_type && item.discount_type !== 'none') {
              const discountLabel = item.discount_type === 'percent' ? `${item.discount_value}%` :
                                    item.discount_type === 'fixed' ? `-$${item.discount_value}` :
                                    item.discount_type === 'nxn' ? `${item.nxn_buy}x${item.nxn_pay}` : '';
              priceHtml += ` <span class="cart-disc-badge">${discountLabel}</span>`;
          }
      } else {
          priceHtml = formatCurrency(item.subtotal);
      }
      
      const unitLabel = item.is_bulk == 1 ? ` ${item.bulk_unit || 'kg'}` : '';

      return `
      <div class="cart-item-card">
          <!-- Left: Image -->
          <div class="cart-item-left">
              ${imgHtml}
          </div>
          
          <!-- Center: Name + Price -->
          <div class="cart-item-center">
              <div class="cart-item-title">${escapeHtml(item.product_name)}</div>
              <div class="item-price-area" data-id="${item.product_id}" title="Editar precio/descuento">
                  ${priceHtml}
              </div>
          </div>
          
          <!-- Right: Controls (Stepper) -->
          <div class="cart-item-right">
              <div class="cart-item-stepper">
                  <button class="step-btn minus" data-id="${item.product_id}" data-action="minus"><i class="fas fa-minus"></i></button>
                  <span class="qty-display" data-id="${item.product_id}">${parseFloat(item.quantity) + unitLabel}</span>
                  <button class="step-btn plus" data-id="${item.product_id}" data-action="plus"><i class="fas fa-plus"></i></button>
              </div>
          </div>
      </div>`;
    }).join('');

    // NOTA: Ya no vinculamos eventos aquí dentro porque usamos delegación en setupCartEventsDelegation()
    
  recalcTotals();
}

// Función para solicitar cantidad/peso de productos a granel
function promptBulkQuantity(prod) {
  const unit = prod.bulk_unit || 'kg';
  const unitLabel = unit === 'kg' ? 'kilogramos' : 
                    unit === 'g' ? 'gramos' :
                    unit === 'L' ? 'litros' :
                    unit === 'mL' ? 'mililitros' :
                    unit === 'lb' ? 'libras' :
                    unit === 'oz' ? 'onzas' :
                    unit === 'pza' ? 'piezas' :
                    unit === 'm' ? 'metros' : unit;

  // Verificar si hay balanza disponible
  const hasScale = window.scaleManager && window.scaleManager.isConnected;

  // Crear modal simple para ingreso de cantidad
  const modalHtml = `
    <div id="bulkQuantityModal" class="modal-overlay active">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3><i class="fas fa-weight-hanging"></i> ${escapeHtml(prod.product_name)}</h3>
          <button class="modal-close" onclick="closeBulkModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 10px; color: #666;">
            <strong>Precio por ${unit}:</strong> ${formatCurrency(prod.unit_price)}
          </p>
          <div class="form-group">
            <label for="bulkQuantityInput">Cantidad en ${unitLabel}:</label>
            <input type="number" id="bulkQuantityInput" step="0.001" min="0.001" placeholder="Ej: 1.5" 
                   style="width: 100%; padding: 10px; font-size: 1.1rem;" autofocus>
          </div>
          ${hasScale ? `
            <div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border-radius: 6px; text-align: center;">
              <p style="color: #2e7d32; margin: 0; font-size: 0.9rem; font-weight: 600;">
                <i class="fas fa-balance-scale"></i> Leyendo balanza...
              </p>
              <p style="color: #558b2f; margin: 5px 0 0 0; font-size: 0.85rem;">
                Peso actual: <strong id="bulkScaleWeight">--.--</strong> ${unit}
              </p>
            </div>
          ` : ''}
          <div id="bulkTotalPreview" style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 6px; text-align: center;">
            <strong>Total: $0.00</strong>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeBulkModal()">Cancelar</button>
          ${hasScale ? `<button class="btn-secondary" onclick="useBulkScaleWeight()" style="flex: 1;">
            <i class="fas fa-sync"></i> Usar Peso de Balanza
          </button>` : ''}
          <button class="btn-primary" onclick="confirmBulkQuantity()">Agregar al Carrito</button>
        </div>
      </div>
    </div>
  `;
  
  // Insertar modal en el DOM
  let modalContainer = document.getElementById('bulkQuantityModal');
  if (modalContainer) modalContainer.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Guardar producto temporalmente
  window._tempBulkProduct = prod;
  window._bulkScaleLastWeight = null;
  
  // Auto-calcular total al escribir
  const input = document.getElementById('bulkQuantityInput');
  const preview = document.getElementById('bulkTotalPreview');
  input.addEventListener('input', () => {
    const qty = parseFloat(input.value) || 0;
    const total = qty * prod.unit_price;
    preview.innerHTML = `<strong>Total: ${formatCurrency(total)}</strong>`;
  });
  
  // Permitir confirmar con Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBulkQuantity();
  });
  
  // Si hay balanza, monitorear peso
  if (hasScale && window.scaleManager) {
    const scaleCallback = (data) => {
      window._bulkScaleLastWeight = data.weight;
      const weightEl = document.getElementById('bulkScaleWeight');
      if (weightEl) {
        weightEl.textContent = data.weight.toFixed(3);
      }
    };
    
    // Registrar temporalmente el callback
    window._bulkScaleCallback = scaleCallback;
    if (window.scaleManager.on) {
      window.scaleManager.on('onWeight', scaleCallback);
    }
  }
  
  // Enfocar input
  setTimeout(() => input.focus(), 100);
}

// Cerrar modal de cantidad a granel
function closeBulkModal() {
  const modal = document.getElementById('bulkQuantityModal');
  if (modal) modal.remove();
  
  // Limpiar callback de balanza
  if (window._bulkScaleCallback && window.scaleManager && window.scaleManager.off) {
    window.scaleManager.off('onWeight', window._bulkScaleCallback);
  }
  
  window._tempBulkProduct = null;
  window._bulkScaleLastWeight = null;
  window._bulkScaleCallback = null;
}

// Usar el peso de la balanza en el campo de cantidad
function useBulkScaleWeight() {
  if (!window._bulkScaleLastWeight) {
    showNotification('Esperando peso de la balanza...', 'warning');
    return;
  }
  
  const input = document.getElementById('bulkQuantityInput');
  if (input) {
    input.value = window._bulkScaleLastWeight.toFixed(3);
    input.dispatchEvent(new Event('input'));
    input.focus();
  }
}

// Confirmar y agregar producto a granel al carrito
function confirmBulkQuantity() {
  if (isCartProcessing) return;
  isCartProcessing = true;

  const input = document.getElementById('bulkQuantityInput');
  const quantity = parseFloat(input.value);
  
  if (!quantity || quantity <= 0) {
    showNotification('Ingresa una cantidad válida', 'warning');
    input.focus();
    isCartProcessing = false;
    return;
  }
  
  const prod = window._tempBulkProduct;
  if (!prod) {
    isCartProcessing = false;
    return;
  }

  loadActivePromotions().then(() => {
    // Buscar si ya existe en el carrito
    const existing = CART.find(i => i.product_id === prod.product_id);
    
    if (existing) {
      existing.quantity = parseFloat(existing.quantity) + quantity;
      recalcItemPrice(existing);
    } else {
      CART.push({
        product_id: prod.product_id,
        product_name: prod.product_name,
        unit_price: prod.unit_price,
        original_price: prod.unit_price,
        quantity: quantity,
        subtotal: prod.unit_price * quantity,
        image_path: prod.image_path,
        discount_type: 'none',
        discount_value: 0,
        nxn_buy: 0,
        nxn_pay: 0,
        stock_quantity: prod.stock_quantity,
        is_bulk: 1,
        bulk_unit: prod.bulk_unit || 'kg',
        category_id: prod.category_id
      });
    }
    
    playSound('Sound2.mp3');
    renderCart();
    showNotification(`${quantity} ${prod.bulk_unit} agregados`, 'success');
    closeBulkModal();
  }).finally(() => {
    setTimeout(() => isCartProcessing = false, 300);
  });
}

// Helper para badges de pestañas
function updateTabBadge(tabId) {
  const btn = document.querySelector(`.cart-tab-btn[data-tab="${tabId}"]`);
  if (!btn) return;

  const items = MULTI_CARTS[tabId] || [];
  // Contar cantidad de productos DIFERENTES (no la suma de cantidades)
  const count = items.length;

  let badge = btn.querySelector('.tab-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function injectCartTabsUI() {
  // Evitar duplicados
  if (document.getElementById('cartTabsContainer')) return;

  const cartPanel = document.getElementById('cartPanel');
  // Si no hay panel lateral, buscar contenedor principal del carrito
  const targetContainer = cartPanel || document.getElementById('cartBody')?.closest('.col-md-4') || document.querySelector('.cart-section');

  if (!targetContainer) return;

  const tabsContainer = document.createElement('div');
  tabsContainer.id = 'cartTabsContainer';

  // Estilos CSS inyectados
  const style = document.createElement('style');
  style.textContent = `
        #cartTabsContainer {
            display: flex;
            width: 100%;
            background: #f8f9fa;
            padding: 10px 10px 0;
            border-bottom: 1px solid #dee2e6;
            gap: 5px;
            overflow-x: auto;
            scrollbar-width: none; /* Firefox */
        }
        #cartTabsContainer::-webkit-scrollbar { display: none; } /* Chrome/Safari */
        
        .cart-tab-btn {
            flex: 1;
            min-width: 60px;
            padding: 12px 5px;
            border: 1px solid transparent;
            background: #e9ecef;
            color: #6c757d;
            border-radius: 8px 8px 0 0;
            cursor: pointer;
            position: relative;
            font-weight: 600;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 0.9rem;
            outline: none;
        }
        .cart-tab-btn:hover { background: #dee2e6; }
        
        .cart-tab-btn.active {
            background: #fff;
            color: var(--primary-color, #2e7d32);
            border-color: #dee2e6;
            border-bottom-color: #fff;
            margin-bottom: -1px;
            box-shadow: 0 -2px 4px rgba(0,0,0,0.02);
            font-weight: 700;
            z-index: 2;
        }
        
        .cart-tab-btn .tab-icon { font-size: 1.1rem; }
        .cart-tab-btn .tab-label { display: inline-block; }
        
        /* Badge de contador */
        .tab-badge {
            background: #dc3545;
            color: white;
            font-size: 0.7rem;
            padding: 2px 6px;
            border-radius: 10px;
            position: absolute;
            top: 4px;
            right: 4px;
            display: none;
            min-width: 18px;
            text-align: center;
            line-height: 1.2;
            box-shadow: 0 2px 2px rgba(0,0,0,0.1);
        }

        /* Ajustes Móvil */
        @media (max-width: 768px) {
            .cart-tab-btn .tab-label { display: none; }
            .cart-tab-btn { padding: 10px 5px; }
            .cart-tab-btn .tab-icon { font-size: 1.2rem; margin: 0; }
        }
    `;
  document.head.appendChild(style);

  // Generar botones de carritos
  ['1', '2', '3', '4'].forEach(num => {
    const btn = document.createElement('button');
    btn.className = 'cart-tab-btn';
    btn.setAttribute('data-tab', num);
    btn.innerHTML = `
            <i class="fas fa-shopping-cart tab-icon"></i>
            <span class="tab-badge">0</span>
        `;
    btn.title = `Venta ${num}`;
    btn.onclick = () => switchCartTab(num);
    tabsContainer.appendChild(btn);
  });



  // Insertar en el DOM y reestructurar para vistas
  const header = targetContainer.querySelector('.cart-header') || targetContainer.querySelector('h2') || targetContainer.querySelector('.card-header');

  if (header) {
    header.parentNode.insertBefore(tabsContainer, header.nextSibling);
  } else {
    targetContainer.insertBefore(tabsContainer, targetContainer.firstChild);
  }


}

// Modal de Historial (Reemplazo de Setup)
function setupHistoryModal() {
    const modal = document.getElementById('historyModal');
    const openBtn = document.getElementById('toggleHistoryBtn');
    const closeBtn = document.getElementById('closeHistoryModalBtn');
    const refreshBtn = document.getElementById('refreshHistoryBtn');
    const body = document.getElementById('historyModalBody');
  
    if(openBtn) {
        openBtn.onclick = (e) => {
            e.preventDefault();
            if(modal) {
                modal.classList.remove('hidden');
                modal.classList.add('active'); // Asegurar visibilidad con clase active si se usa
                renderHistoryContent();
            }
        };
    }
  
    if(closeBtn && modal) {
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        };
    }

    if(refreshBtn) {
        refreshBtn.onclick = () => renderHistoryContent();
    }
  
    // Close on outside click is handled by CSS overlay usually, but adding JS support
    if(modal) {
        modal.onclick = (e) => {
            if(e.target === modal) {
                modal.classList.add('hidden');
                modal.classList.remove('active');
            }
        };
    }
  
    async function renderHistoryContent() {
        if(!body) return;
        body.innerHTML = `<div class="empty-state" style="text-align:center; padding: 20px; color: #888;">
            <i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando historial...</p>
        </div>`;
        
        try {
            // Fetch real data
            const res = await fetch('../api/sales/get_sales.php?limit=20', { method: 'GET' });
            // Check session/json validity
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Respuesta no válida del servidor");
            }

            const data = await res.json();
            
            if(!data.success || !data.data || data.data.length === 0) {
                 body.innerHTML = `<div class="empty-state" style="text-align:center; padding: 20px; color: #888;">
                    <i class="fas fa-history fa-2x"></i><p>No hay ventas recientes.</p>
                 </div>`;
                 return;
            }
  
            body.innerHTML = data.data.map(sale => {
                const total = parseFloat(sale.total).toFixed(2);
                const date = new Date(sale.sale_date).toLocaleString();
                const payMethod = sale.payment_method === 'cash' ? 'Efectivo' : 
                                 sale.payment_method === 'card' ? 'Tarjeta' : 
                                 sale.payment_method === 'transfer' ? 'Transferencia' : 'Mixto';

                return `
                <div class="history-card" style="border-left: 4px solid var(--primary-color); padding: 12px; margin-bottom: 10px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div class="history-card-header" style="display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px dashed #eee; padding-bottom: 6px;">
                        <span class="h-id" style="font-weight: bold;">#${sale.sale_id}</span>
                        <span class="h-date" style="font-size: 0.85rem; color: #888;">${date}</span>
                    </div>
                    <div class="history-card-body" style="font-size: 0.9rem; color: #555;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Items: <strong>${sale.total_items || '?'}</strong></span>
                            <span>Pago: <strong>${payMethod}</strong></span>
                        </div>
                    </div>
                    <div class="history-card-footer" style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div class="h-total-price" style="font-size: 1.1rem; font-weight: bold; color: #333;">$${total}</div>
                        <button class="btn-reprint" onclick="viewSaleDetails(${sale.sale_id})" style="background: #f0f0f0; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;"><i class="fas fa-eye"></i> Ver</button>
                    </div>
                </div>
            `}).join('');
  
        } catch (e) {
            console.error("Error loading history", e);
            body.innerHTML = `<div class="empty-state" style="text-align:center; padding: 20px; color: firebrick;">
                <i class="fas fa-exclamation-triangle"></i><p>Error al cargar historial.</p>
            </div>`;
        }
    }
}

// Función global para ver detalles (placeholder por ahora)
window.viewSaleDetails = function(id) {
    Toast.info("Pronto: Detalles de venta #" + id);
    // Aquí se podríá implementar otro modal o redirección
};


function renderHistoryView() {
  const container = document.getElementById('historyPanelBody');
  if (!container) return;

  // Cargar datos
  const saved = localStorage.getItem('tomodachi_recent_sales');
  let sales = [];
  try { sales = JSON.parse(saved) || []; } catch (e) { }

  let html = '';

  if (sales.length === 0) {
    html += '<div class="empty-cart" style="text-align: center; padding: 20px; color: #999;">No hay ventas recientes registradas en este dispositivo.</div>';
  } else {
    html += sales.map((s, idx) => `
            <div class="history-item-card">
                <div class="h-header">
                    <span class="h-id">Venta #${s.sale_id}</span>
                    <span class="h-date">${s.date}</span>
                </div>
                <div class="h-details">
                    <span>${s.items.length} productos</span>
                    <span>${s.cashier ? 'Por: ' + s.cashier : (s.customer || 'Cliente General')}</span>
                </div>
                <div class="h-footer">
                    <span class="h-total">${formatCurrency(s.total)}</span>
                    <button onclick="reprintTicketFromHistory(${idx})" class="btn-reprint" title="Reimprimir Ticket"><i class="fas fa-print"></i></button>
                </div>
            </div>
        `).join('');
  }

  container.innerHTML = html;
}

// ==========================================
// CONTROLES EXTRA (Historial)
// ==========================================

let RECENT_SALES = [];

function saveSaleToHistory(saleData) {
  // Cargar historial existente
  const saved = localStorage.getItem('tomodachi_recent_sales');
  if (saved) {
    try { RECENT_SALES = JSON.parse(saved); } catch (e) { }
  }

  // Añadir nueva venta al inicio
  RECENT_SALES.unshift(saleData);

  // Mantener solo las últimas 10 ventas
  if (RECENT_SALES.length > 10) RECENT_SALES = RECENT_SALES.slice(0, 10);

  localStorage.setItem('tomodachi_recent_sales', JSON.stringify(RECENT_SALES));
}

// Función global para el onclick del HTML inyectado
window.reprintTicketFromHistory = function (index) {
  // Recargar desde storage por si acaso
  const saved = localStorage.getItem('tomodachi_recent_sales');
  let sales = [];
  try { sales = JSON.parse(saved) || []; } catch (e) { }

  if (sales[index]) {
    printTicket(sales[index]);
  }
};

// ==========================================
// MODAL & DISCOUNT LOGIC
// ==========================================

function openItemOptions(id) {
  const item = CART.find(i => i.product_id === id);
  if (!item) return;

  EDITING_PRODUCT_ID = id;

  // Populate modal
  if (modalProductName) modalProductName.textContent = item.product_name;
  if (modalOriginalPrice) modalOriginalPrice.textContent = formatCurrency(item.original_price);

  // Set current values
  if (discountTypeSelect) discountTypeSelect.value = item.discount_type || 'none';

  if (discPercentInput) discPercentInput.value = item.discount_type === 'percent' ? item.discount_value : '';
  if (discFixedInput) discFixedInput.value = item.discount_type === 'fixed' ? item.discount_value : '';

  if (nxnBuyInput) nxnBuyInput.value = item.nxn_buy || '';
  if (nxnPayInput) nxnPayInput.value = item.nxn_pay || '';

  onDiscountTypeChange(); // Show/hide inputs
  updateModalPreview(); // Calc preview

  if (itemOptionsModal) {
    itemOptionsModal.classList.remove('hidden');
    itemOptionsModal.setAttribute('aria-hidden', 'false');
  }
}

function closeItemOptions() {
  if (itemOptionsModal) {
    itemOptionsModal.classList.add('hidden');
    itemOptionsModal.setAttribute('aria-hidden', 'true');
  }
  EDITING_PRODUCT_ID = null;
}

function onDiscountTypeChange() {
  const type = discountTypeSelect.value;

  if (optPercent) optPercent.classList.add('hidden');
  if (optFixed) optFixed.classList.add('hidden');
  if (optNxn) optNxn.classList.add('hidden');

  if (type === 'percent' && optPercent) optPercent.classList.remove('hidden');
  if (type === 'fixed' && optFixed) optFixed.classList.remove('hidden');
  if (type === 'nxn' && optNxn) optNxn.classList.remove('hidden');

  updateModalPreview();
}

function updateModalPreview() {
  const item = CART.find(i => i.product_id === EDITING_PRODUCT_ID);
  if (!item) return;

  const type = discountTypeSelect.value;
  let newPrice = item.original_price;

  if (type === 'percent') {
    const pct = parseFloat(discPercentInput.value) || 0;
    newPrice = item.original_price * (1 - pct / 100);
  } else if (type === 'fixed') {
    const discount = parseFloat(discFixedInput.value) || 0;
    newPrice = Math.max(0, item.original_price - discount);
  } else if (type === 'nxn') {
    // For NxN, the unit price depends on quantity. 
    // In preview, we can show the effective unit price based on current quantity in cart
    // or just show "Variable" or calculate for the current quantity.
    const buy = parseInt(nxnBuyInput.value) || 1;
    const pay = parseInt(nxnPayInput.value) || 1;

    if (buy > 0 && item.quantity >= buy) {
      const sets = Math.floor(item.quantity / buy);
      const remainder = item.quantity % buy;
      const payableQty = (sets * pay) + remainder;
      newPrice = (payableQty * item.original_price) / item.quantity;
    }
  }

  if (modalNewPrice) modalNewPrice.textContent = formatCurrency(newPrice);
}

function saveItemOptions() {
  const item = CART.find(i => i.product_id === EDITING_PRODUCT_ID);
  if (!item) return;

  const type = discountTypeSelect.value;
  item.discount_type = type;

  if (type === 'percent') {
    item.discount_value = parseFloat(discPercentInput.value) || 0;
  } else if (type === 'fixed') {
    item.discount_value = parseFloat(discFixedInput.value) || 0;
  } else if (type === 'nxn') {
    item.nxn_buy = parseInt(nxnBuyInput.value) || 1;
    item.nxn_pay = parseInt(nxnPayInput.value) || 1;
  } else {
    item.discount_value = 0;
  }

  // Marcar como editado manualmente para que applyPromotions no lo sobreescriba
  item.manual_edit = type !== 'none';

  recalcItemPrice(item);
  renderCart();
  closeItemOptions();
  showNotification('Precio actualizado', 'success');
}

function recalcItemPrice(item) {
  let newUnitPrice = item.original_price;

  if (item.discount_type === 'percent') {
    newUnitPrice = item.original_price * (1 - item.discount_value / 100);
  } else if (item.discount_type === 'fixed') {
    newUnitPrice = Math.max(0, item.original_price - item.discount_value);
  } else if (item.discount_type === 'nxn') {
    const buy = item.nxn_buy || 1;
    const pay = item.nxn_pay || 1;

    if (buy > 0 && item.quantity >= buy) {
      const sets = Math.floor(item.quantity / buy);
      const remainder = item.quantity % buy;
      const payableQty = (sets * pay) + remainder;
      newUnitPrice = (payableQty * item.original_price) / item.quantity;
    }
  }

  item.unit_price = newUnitPrice;
  item.subtotal = item.quantity * item.unit_price;
}

function recalcTotals() {
  // Aplicar Promociones Automáticas antes de calcular totales
  applyPromotions();

  const subtotal = CART.reduce((s, i) => s + i.subtotal, 0);
  const discount = (discountInput && discountInput.value) ? parseFloat(discountInput.value) : 0;
  const promoDiscount = (typeof CURRENT_BILL_DISCOUNT !== 'undefined') ? CURRENT_BILL_DISCOUNT : 0;
  const tax = (taxInput && taxInput.value) ? parseFloat(taxInput.value) : 0;
  const total = Math.max(0, subtotal - discount - promoDiscount + tax);
  if (totalBadge) {
    totalBadge.textContent = formatCurrency(total);
  }
  if (panelTotalEl) {
    panelTotalEl.textContent = formatCurrency(total);
  }
  renderQuickCashButtons(); // Actualizar botones de pago rápido
  recalcChange();
}

function onPaymentMethodChange() {
  if (!paymentMethodSelect) return;
  recalcChange();
}

function recalcChange() {
  if (!paymentMethodSelect) return;
  const method = paymentMethodSelect.value;
  const subtotal = CART.reduce((s, i) => s + i.subtotal, 0);
  const discount = (discountInput && discountInput.value) ? parseFloat(discountInput.value) : 0;
  const tax = (taxInput && taxInput.value) ? parseFloat(taxInput.value) : 0;
  const total = Math.max(0, subtotal - discount + tax);
  if (method === 'cash' || method === 'mixed') {
    const received = (checkoutReceivedInput && checkoutReceivedInput.value) ? parseFloat(checkoutReceivedInput.value) : 0;
    const change = received - total;
    if (checkoutChangeDisplay) {
      checkoutChangeDisplay.textContent = formatCurrency(change >= 0 ? change : 0);
      if (change < 0) {
        checkoutChangeDisplay.classList.add('negative');
      } else {
        checkoutChangeDisplay.classList.remove('negative');
      }
    }
  } else {
    if (checkoutChangeDisplay) checkoutChangeDisplay.textContent = '—';
    if (checkoutChangeDisplay) checkoutChangeDisplay.classList.remove('negative');
  }
  // Habilitar botón finalizar según reglas
  if (finalizeSaleBtn) {
    let canFinalize = CART.length > 0;
    if (canFinalize) {
      if (method === 'cash' || method === 'mixed') {
        const received = parseFloat(checkoutReceivedInput.value) || 0;
        canFinalize = received >= total && total > 0;
      } else {
        canFinalize = total > 0;
      }
    }
    finalizeSaleBtn.disabled = !canFinalize;
  }
}

function toggleCartPanel(forceOpen = null) {
  const open = forceOpen !== null ? forceOpen : !cartPanel.classList.contains('open');
  if (open) {
    cartPanel.classList.add('open');
    cartPanel.setAttribute('aria-hidden', 'false');
  } else {
    cartPanel.classList.remove('open');
    cartPanel.setAttribute('aria-hidden', 'true');
  }
}

async function finalizeSale() {
  if (!CART.length) return;
  finalizeSaleBtn.disabled = true;

  const method = paymentMethodSelect ? paymentMethodSelect.value : 'cash';
  const payload = {
    store_id: CURRENT_STORE_ID,
    items: CART.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.unit_price })),
    payment_method: method,
    discount: (discountInput && discountInput.value) ? parseFloat(discountInput.value) : 0,
    tax: (taxInput && taxInput.value) ? parseFloat(taxInput.value) : 0
  };

  // Añadir cash_amount si es necesario
  if ((method === 'cash' || method === 'mixed') && checkoutReceivedInput) {
    payload.cash_amount = parseFloat(checkoutReceivedInput.value) || 0;
  }

  try {
    const res = await fetch('../api/sales/create_sale.php', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
    if (!await checkSessionStatus(res)) { finalizeSaleBtn.disabled = false; return; }
    const resData = await res.json();
    if (resData.success) {
      playSound('Sound7.mp3');
      showNotification('Venta registrada', 'success');

      if (resData.register_opened) {
        showNotification('Se ha abierto una nueva caja automáticamente', 'info');
      }

      // Preparar datos para ticket
      const ticketData = {
        items: [...CART],
        total: CART.reduce((s, i) => s + i.subtotal, 0),
        date: new Date().toLocaleString(),
        sale_id: resData.sale_id || '---',
        cashier: resData.cashier_name || 'Cajero'
      };

      // Guardar en historial local
      saveSaleToHistory(ticketData);

      // Imprimir ticket si está habilitado
      const printEnabled = document.getElementById('printTicketCheckbox') && document.getElementById('printTicketCheckbox').checked;
      if (printEnabled) {
        printTicket(ticketData);
      }

      CART = [];
      MULTI_CARTS[CURRENT_TAB] = []; // Limpiar del storage global
      localStorage.setItem('tomodachi_multi_carts', JSON.stringify(MULTI_CARTS));

      renderCart();
      if (discountInput) discountInput.value = '0';
      if (taxInput) taxInput.value = '0';
      if (checkoutReceivedInput) checkoutReceivedInput.value = '0';

      // Resetear contadores de dinero visuales
      if (typeof resetMoneyCounts === 'function') resetMoneyCounts(true);

      // Mantener panel abierto; solo se cierra manualmente
    } else {
      showNotification(resData.message || 'Error venta', 'error');
    }
  } catch (e) {
    showNotification('Error al procesar venta', 'error');
  } finally {
    finalizeSaleBtn.disabled = false;
  }
}

// Ajuste: ya no existe barra de resumen separada; recalcTotals gestiona todo

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[m]); });
}

// Galería de productos + categorías
async function loadCategoriesAndProducts() {
  try {
    const [catRes, prodRes] = await Promise.all([
      fetch('../api/inventory/categories.php'),
      fetch('../api/inventory/products.php')
    ]);

    if (!catRes.ok || !prodRes.ok) return; // Simple check

    const catData = await catRes.json();
    const prodData = await prodRes.json();

    if (catData.success) {
      allCategories = catData.data || [];
    }
    
    // Si la respuesta de productos es un array directo o tiene propiedad data
    if (Array.isArray(prodData)) {
         allProducts = prodData;
    } else if (prodData.success) {
         allProducts = prodData.data || [];
    } else {
         allProducts = [];
    }

    // Poblar Select de Categorías
    const catSelect = document.getElementById('categoryFilter');
    if (catSelect) {
        // Mantener la opción "Todas" y agregar las demás
        catSelect.innerHTML = '<option value="all">Todas las categorías</option>';
        allCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.category_id;
            opt.textContent = cat.name;
            catSelect.appendChild(opt);
        });
    }

    filterAndRenderProducts(); // Render inicial
  } catch (e) {
    console.error('Error loading data:', e);
  }
}

function filterAndRenderProducts() {
    let filtered = allProducts;

    // 1. Filtro de Categoría
    if (activeCategoryId && activeCategoryId !== 'all') {
        filtered = filtered.filter(p => String(p.category_id || '') === String(activeCategoryId));
    }

    // 2. Ordenamiento
    const sortVal = document.getElementById('sortFilter') ? document.getElementById('sortFilter').value : 'default';
    
    // Crear copia para no mutar original
    filtered = [...filtered];

    switch(sortVal) {
        case 'price_asc':
            filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case 'price_desc':
            filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
        case 'name_asc':
            filtered.sort((a, b) => a.product_name.localeCompare(b.product_name));
            break;
        case 'newest':
            filtered.sort((a, b) => b.product_id - a.product_id); 
            break;
        default:
            // "Relevancia" o Default — aplicar preferencias
            const viewOrder = document.getElementById('viewOrderSelect');
            const viewVal = viewOrder ? viewOrder.value : 'default';
            if (viewVal === 'favorites') {
                filtered.sort((a, b) => {
                    const prefs = getPrefs();
                    const aFav = prefs.favorites.indexOf(a.product_id);
                    const bFav = prefs.favorites.indexOf(b.product_id);
                    return (aFav > -1 ? aFav - 10000 : 0) - (bFav > -1 ? bFav - 10000 : 0);
                });
            } else if (viewVal === 'pinned') {
                filtered.sort((a, b) => {
                    const prefs = getPrefs();
                    const aPin = prefs.pinned.indexOf(a.product_id);
                    const bPin = prefs.pinned.indexOf(b.product_id);
                    return (aPin > -1 ? aPin - 10000 : 0) - (bPin > -1 ? bPin - 10000 : 0);
                });
            } else {
                filtered = applyPrefsToFiltered(filtered);
            }
            break;
    }

    renderGallery(filtered);
}


function calculatePromoPrice(product) {
  if (!ACTIVE_PROMOTIONS || ACTIVE_PROMOTIONS.length === 0) return null;
  
  // Solo buscamos promos de tipo simple para mostrar precio unitario directo
  const simplePromos = ACTIVE_PROMOTIONS.filter(p => 
      p.type === 'simple_discount' && isTarget({ ...product, quantity: 1, original_price: product.price }, p)
  );

  if (simplePromos.length === 0) return null;

  // Aplicar la mejor promo disponible
  let bestPrice = parseFloat(product.price);
  let appliedPromo = null;

  simplePromos.forEach(promo => {
      let price = parseFloat(product.price);
      let discount = 0;
      
      if (promo.discount_type === 'percentage') {
          discount = price * (parseFloat(promo.discount_value) / 100);
      } else {
          discount = parseFloat(promo.discount_value);
      }
      
      let newPrice = price - discount;
      if (newPrice < 0) newPrice = 0;
      
      if (newPrice < bestPrice) {
          bestPrice = newPrice;
          appliedPromo = promo;
      }
  });

  return appliedPromo ? bestPrice : null;
}

function renderGallery(list, animate = false) {
  if (!productGallery) return;

  // Limpiar clases de animación CSS antiguas
  productGallery.classList.remove('slide-in-left', 'slide-in-right');
  
  // Asegurar que searchResults esté oculto si mostramos galería
  if (searchResults) searchResults.classList.add('hidden');
  productGallery.style.display = 'grid';

  if (!list || list.length === 0) {
    productGallery.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px;"></i><p>No se encontraron productos</p></div>';
    return;
  }

  // Renderizar items con estructura optimizada
  productGallery.innerHTML = list.map(p => {
    const imagePath = getRelativeImagePath(p.image_path);
    const promoPrice = calculatePromoPrice(p);
    const hasPromo = promoPrice !== null && promoPrice < parseFloat(p.price);
    
    let priceHtml = '';
    if (hasPromo) {
         priceHtml = `
            <span class="original-price" style="text-decoration: line-through; font-size: 0.8em; color: #999;">${formatCurrency(p.price)}</span>
            <span class="promo-price" style="color: #dc3545; font-weight: bold;">${formatCurrency(promoPrice)}</span>
         `;
    } else {
         priceHtml = `<span class="current-price">${formatCurrency(p.price)}</span>`;
    }

    const stockBadge = (p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== '') 
          ? `<div class="stock-badge ${p.stock_quantity < 5 ? 'low' : ''}">${p.stock_quantity}</div>` 
          : '';

    return `
      <div class="gallery-item" 
           data-id="${p.product_id}" 
           data-price="${p.price}" 
           data-stock="${p.stock_quantity !== undefined ? p.stock_quantity : ''}" 
           data-image="${p.image_path || ''}" 
           data-is_bulk="${p.is_bulk || 0}" 
           data-bulk_unit="${p.bulk_unit || 'kg'}" 
           data-category="${p.category_id || ''}"
           title="${escapeHtml(p.product_name)}">
            
        <div class="img-wrap">
            ${imagePath ? `<img src="${imagePath}" loading="lazy" alt="${escapeHtml(p.product_name)}" onerror="this.parentNode.innerHTML='<i class=\\'fas fa-box\\'></i>'">` : '<i class="fas fa-box" style="color:#eee; font-size:1.5rem;"></i>'}
            ${stockBadge}
        </div>
        
        <div class="item-details" style="padding: 8px; display: flex; flex-direction: column; flex: 1; justify-content: space-between;">
            <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; color: #333; font-weight: 600;">${escapeHtml(p.product_name)}</h4>
            <div class="price-area" style="font-weight: 700; color: var(--primary-color);">
                ${priceHtml}
            </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-attach events
  Array.from(productGallery.querySelectorAll('.gallery-item')).forEach(el => {
      el.addEventListener('click', () => {
        // Feedback visual
        const imgWrap = el.querySelector('.img-wrap');
        if(imgWrap) {
            imgWrap.style.transform = 'scale(0.95)';
            setTimeout(() => imgWrap.style.transform = '', 150);
        }

        addProductToCart({
          product_id: parseInt(el.getAttribute('data-id')),
          product_name: el.querySelector('h4').textContent,
          unit_price: parseFloat(el.getAttribute('data-price')),
          image_path: el.getAttribute('data-image'),
          stock_quantity: el.getAttribute('data-stock'),
          is_bulk: parseInt(el.getAttribute('data-is_bulk')) || 0,
          bulk_unit: el.getAttribute('data-bulk_unit') || 'kg',
          category_id: el.getAttribute('data-category') || undefined
        });
      });
  });

  addIndicatorsToItems();
}



// ============================================================
// User Preferences (Favorites, Pinned, View Order)
// ============================================================
function getPrefs() {
  try {
    const storeId = document.body.getAttribute('data-store-id') || '1';
    const raw = localStorage.getItem('pos_prefs_' + storeId);
    return raw ? JSON.parse(raw) : { favorites: [], pinned: [], orderBy: 'default' };
  } catch { return { favorites: [], pinned: [], orderBy: 'default' }; }
}

function savePrefs(prefs) {
  try {
    const storeId = document.body.getAttribute('data-store-id') || '1';
    localStorage.setItem('pos_prefs_' + storeId, JSON.stringify(prefs));
  } catch {}
}

function toggleFavorite(productId) {
  const prefs = getPrefs();
  const idx = prefs.favorites.indexOf(productId);
  if (idx > -1) { prefs.favorites.splice(idx, 1); }
  else { prefs.favorites.unshift(productId); }
  savePrefs(prefs);
  return prefs.favorites.indexOf(productId) > -1;
}

function togglePinned(productId) {
  const prefs = getPrefs();
  const idx = prefs.pinned.indexOf(productId);
  if (idx > -1) { prefs.pinned.splice(idx, 1); }
  else { prefs.pinned.unshift(productId); }
  savePrefs(prefs);
  return prefs.pinned.indexOf(productId) > -1;
}

function isFavorite(productId) {
  return getPrefs().favorites.includes(productId);
}

function isPinned(productId) {
  return getPrefs().pinned.includes(productId);
}

// ============================================================
// Context Menu for Gallery Items
// ============================================================
let _ctxProductId = null;
let _ctxCategoryId = null;

function initContextMenu() {
  const overlay = document.getElementById('productContextMenu');
  if (!overlay) return;

  overlay.querySelectorAll('.context-menu-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      handleContextAction(action, _ctxProductId, _ctxCategoryId);
      closeContextMenu();
    });
  });

  document.addEventListener('click', (e) => {
    if (!overlay.classList.contains('hidden') && !overlay.contains(e.target)) {
      closeContextMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeContextMenu();
  });

  setupContextMenuEvents();
}

function setupContextMenuEvents() {
  const containers = [
    document.getElementById('productGallery'),
    document.getElementById('searchResults')
  ];

  containers.forEach(container => {
    if (!container) return;

    container.addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.gallery-item');
      if (!item) return;
      e.preventDefault();
      showContextMenu(e, item);
    });

    let longPressTimer = null;
    container.addEventListener('touchstart', (e) => {
      const item = e.target.closest('.gallery-item');
      if (!item) return;
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        e.preventDefault();
        showContextMenu(e, item);
      }, 500);
    }, { passive: false });

    container.addEventListener('touchmove', () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }, { passive: true });

    container.addEventListener('touchend', () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }, { passive: true });

    container.addEventListener('touchcancel', () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }, { passive: true });
  });
}

function showContextMenu(e, item) {
  _ctxProductId = parseInt(item.dataset.id);
  _ctxCategoryId = item.dataset.category ? parseInt(item.dataset.category) : null;

  const overlay = document.getElementById('productContextMenu');
  const nameEl = document.getElementById('contextMenuProductName');
  const favCheck = document.getElementById('ctxFavCheck');
  const pinCheck = document.getElementById('ctxPinCheck');

  nameEl.textContent = item.querySelector('h4')?.textContent || item.querySelector('.g-name')?.textContent || 'Producto';
  
  const prefs = getPrefs();
  favCheck.textContent = prefs.favorites.includes(_ctxProductId) ? '✓' : '';
  pinCheck.textContent = prefs.pinned.includes(_ctxProductId) ? '✓' : '';

  const x = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
  const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;

  overlay.classList.remove('hidden');
  overlay.style.left = '';
  overlay.style.right = '';
  overlay.style.top = '';
  overlay.style.bottom = '';

  const w = overlay.offsetWidth || 200;
  const h = overlay.offsetHeight || 220;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = x, top = y;
  if (left + w + 10 > vw) left = vw - w - 10;
  if (top + h + 10 > vh) top = vh - h - 10;
  if (left < 10) left = 10;
  if (top < 10) top = 10;

  overlay.style.left = left + 'px';
  overlay.style.top = top + 'px';
}

function closeContextMenu() {
  const overlay = document.getElementById('productContextMenu');
  if (overlay) overlay.classList.add('hidden');
  _ctxProductId = null;
  _ctxCategoryId = null;
}

function handleContextAction(action, productId, categoryId) {
  switch (action) {
    case 'favorite': {
      const nowFav = toggleFavorite(productId);
      showNotification(nowFav ? '★ Añadido a favoritos' : '☆ Quitado de favoritos', 'info');
      applyPrefsAndRender();
      break;
    }
    case 'pin': {
      const nowPinned = togglePinned(productId);
      showNotification(nowPinned ? '📌 Producto fijado al inicio' : '📌 Producto desfijado', 'info');
      applyPrefsAndRender();
      break;
    }
    case 'edit': {
      window.location.href = 'inventory.html';
      break;
    }
    case 'view-category': {
      if (categoryId) {
        const catFilter = document.getElementById('categoryFilter');
        if (catFilter) {
          catFilter.value = categoryId;
          catFilter.dispatchEvent(new Event('change'));
        }
      } else {
        showNotification('Este producto no tiene categoría', 'warning');
      }
      break;
    }
  }
}

// ============================================================
// Apply preferences to product ordering
// ============================================================
function applyPrefsToFiltered(filtered) {
  const prefs = getPrefs();
  return [...filtered].sort((a, b) => {
    const aFav = prefs.favorites.indexOf(a.product_id);
    const bFav = prefs.favorites.indexOf(b.product_id);
    const aPin = prefs.pinned.indexOf(a.product_id);
    const bPin = prefs.pinned.indexOf(b.product_id);

    const aScore = (aPin > -1 ? -10000 + aPin : 0) + (aFav > -1 ? -5000 + aFav : 0);
    const bScore = (bPin > -1 ? -10000 + bPin : 0) + (bFav > -1 ? -5000 + bFav : 0);

    return aScore - bScore;
  });
}

// ============================================================
// Add indicators to gallery items
// ============================================================
function addIndicatorsToItems() {
  const prefs = getPrefs();
  document.querySelectorAll('.gallery-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    let indicators = el.querySelector('.item-indicators');
    if (!indicators) {
      indicators = document.createElement('div');
      indicators.className = 'item-indicators';
      el.style.position = 'relative';
      el.appendChild(indicators);
    }
    indicators.innerHTML = '';
    if (prefs.pinned.includes(id)) {
      const i = document.createElement('i');
      i.className = 'fas fa-thumbtack';
      i.title = 'Fijado';
      indicators.appendChild(i);
    }
    if (prefs.favorites.includes(id)) {
      const i = document.createElement('i');
      i.className = 'fas fa-star';
      i.title = 'Favorito';
      indicators.appendChild(i);
    }
  });
}

// ============================================================
// Re-run render with preferences
// ============================================================
function applyPrefsAndRender() {
  let filtered = allProducts;

  if (activeCategoryId && activeCategoryId !== 'all') {
    filtered = filtered.filter(p => String(p.category_id || '') === String(activeCategoryId));
  }

  const viewOrder = document.getElementById('viewOrderSelect');
  const sortVal = viewOrder ? viewOrder.value : 'default';

  if (sortVal === 'default') {
    filtered = applyPrefsToFiltered(filtered);
  } else if (sortVal === 'favorites') {
    filtered = [...filtered].sort((a, b) => {
      const prefs = getPrefs();
      const aFav = prefs.favorites.indexOf(a.product_id);
      const bFav = prefs.favorites.indexOf(b.product_id);
      return (aFav > -1 ? aFav - 10000 : 0) - (bFav > -1 ? bFav - 10000 : 0);
    });
  } else if (sortVal === 'pinned') {
    filtered = [...filtered].sort((a, b) => {
      const prefs = getPrefs();
      const aPin = prefs.pinned.indexOf(a.product_id);
      const bPin = prefs.pinned.indexOf(b.product_id);
      return (aPin > -1 ? aPin - 10000 : 0) - (bPin > -1 ? bPin - 10000 : 0);
    });
  }

  renderGallery(filtered);

  const favCheck = document.getElementById('ctxFavCheck');
  const pinCheck = document.getElementById('ctxPinCheck');
  if (favCheck && _ctxProductId) {
    const prefs = getPrefs();
    favCheck.textContent = prefs.favorites.includes(_ctxProductId) ? '✓' : '';
    pinCheck.textContent = prefs.pinned.includes(_ctxProductId) ? '✓' : '';
  }
}

// Funcionalidad de escáner
async function fetchByCode(code) {
  try {
    // Eliminado store_id de los parámetros, el backend usa la sesión
    const res = await fetch('../api/inventory/scanner.php?barcode=' + code, { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
    if (!await checkSessionStatus(res)) return;
    const resData = await res.json();
    if (resData.success && resData.data) {
      const p = resData.data;
      addProductToCart({
        product_id: p.product_id,
        product_name: p.product_name,
        unit_price: parseFloat(p.price),
        image_path: p.image_path,
        stock_quantity: p.stock_quantity, // Asegurar que el backend lo envíe
        is_bulk: p.is_bulk || 0,
        bulk_unit: p.bulk_unit || 'kg'
      });
      showScannedProductOverlay(p);
      showNotification('Producto añadido', 'success');
    } else {
      showNotification('Código no encontrado', 'error');
    }
  } catch (e) {
    showNotification('Error escáner', 'error');
  }
}

function showScannedProductOverlay(product) {
  let overlay = document.getElementById('scannerOverlay');
  const container = document.getElementById('scannerContainer');

  if (!container) return;

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'scannerOverlay';
    overlay.className = 'scanner-overlay';
    container.appendChild(overlay);
  }

  // Ajustar ruta de imagen si es relativa
  let imgPath = getRelativeImagePath(product.image_path);
  
  // if (!imgPath) imgPath = 'assets/images/no-image.png';

  // Escapar comillas simples para CSS url()
  const cssImgPath = imgPath ? imgPath.replace(/'/g, "\\'") : '';

  overlay.innerHTML = `
    <div class="scanned-product-card" style="position: relative; overflow: hidden; background: white; z-index: 1;">
      <!-- Fondo con imagen borrosa -->
      <div style="
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: url('${cssImgPath}');
          background-size: cover;
          background-position: center;
          filter: blur(8px);
          opacity: 0.4;
          z-index: -1;
      "></div>
      
      <!-- Contenido principal -->
      <div style="position: relative; z-index: 2; padding: 10px;">
        ${imgPath ? 
          `<img src="${imgPath}" alt="Producto" style="max-width:120px; max-height:120px; object-fit:contain; margin-bottom:10px; border-radius: 8px; background: rgba(255,255,255,0.9); padding: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" onerror="this.style.display='none'">` : 
          `<div style="width: 120px; height: 120px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.9); border-radius: 8px; color: #ccc; font-size: 3rem;"><i class="fas fa-box"></i></div>`
        }
        <div class="scanned-info">
          <h3 style="margin:0 0 5px; font-size:1.1rem; color:#222; font-weight: 700; text-shadow: 0 1px 1px rgba(255,255,255,0.8);">${escapeHtml(product.product_name)}</h3>
          <span class="price" style="font-size:1.4rem; font-weight:bold; color:var(--primary-color); text-shadow: 0 2px 0 rgba(255,255,255,1);">${formatCurrency(product.price)}</span>
        </div>
      </div>
    </div>
  `;

  overlay.classList.add('visible');

  if (window.scanOverlayTimeout) clearTimeout(window.scanOverlayTimeout);
  window.scanOverlayTimeout = setTimeout(() => {
    overlay.classList.remove('visible');
  }, 2000);
}

// Función para pruebas visuales con flujo real
function probarEfectosVisuales(barcode = '7501234567890') {
  console.log(`🎬 Iniciando prueba de escáner con código: ${barcode}...`);

  // 1. Referencias al DOM
  const scannerContainer = document.getElementById('scannerContainer');
  const toggleBtn = document.getElementById('toggleScannerBtn');
  const productsMain = document.querySelector('.products-main');

  if (!scannerContainer || !toggleBtn) {
    console.error("❌ No se encontraron elementos del escáner.");
    return;
  }

  // 2. Activar modo escáner visualmente si no está activo
  if (scannerContainer.classList.contains('hidden')) {
    scannerContainer.classList.remove('hidden');
    if (productsMain) productsMain.classList.add('hidden');
    toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
    toggleBtn.setAttribute('aria-label', 'Cerrar escáner');
    scannerContainer.style.backgroundColor = "#000";
    scannerContainer.style.minHeight = "300px";
  }

  console.log("📷 Escáner activo. Simulando lectura...");

  // 3. Simular delay de lectura y llamar al flujo real
  setTimeout(() => {
    console.log(`📡 Consultando API con código: ${barcode}`);
    // Llamada real al backend
    fetchByCode(barcode);

    // Enfocar input recibido (opcional, ya que el usuario podría seguir escaneando)
    const receivedInput = document.getElementById('checkoutReceived');
    if (receivedInput) {
      // receivedInput.focus(); 
    }

  }, 1500);
}

// Exponer globalmente
window.probarEfectosVisuales = probarEfectosVisuales;

// Exponer fetchByCode globalmente
window.fetchByCode = fetchByCode;

function playSound(filename) {
  const audio = new Audio('assets/sound/' + filename);
  audio.play().catch(e => console.warn('Error playing sound:', e));
}

function printTicket(data) {
  const win = window.open('', 'PrintTicket', 'width=400,height=600');
  if (!win) {
    showNotification('Habilita pop-ups para imprimir ticket', 'warning');
    return;
  }

  const storeName = localStorage.getItem('tomodachi_store_name') || 'Tomodachi Store';

  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 5px 0;">${item.quantity} x ${item.product_name}</td>
      <td style="text-align: right;">$${(item.unit_price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <html>
    <head>
      <title>Ticket de Venta</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h2 { margin: 0; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; }
        .total { margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px; text-align: right; font-weight: bold; font-size: 14px; }
        .footer { margin-top: 20px; text-align: center; font-size: 10px; }
        .powered-by { font-size: 8px; color: #888; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${storeName}</h2>
        <p>Fecha: ${data.date}</p>
        <p>Venta #: ${data.sale_id}</p>
      </div>
      <table>
        ${itemsHtml}
      </table>
      <div class="total">
        TOTAL: $${data.total.toFixed(2)}
      </div>
      <div class="footer">
        <p>¡Gracias por su compra!</p>
        <p class="powered-by">Tomodachi powered by Baburu</p>
      </div>
      <script>
        window.onload = function() { window.print(); window.close(); }
      </script>
    </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
}

// ==========================================
// NUEVAS IMPLEMENTACIONES (Park Sale, Quick Cash, Session Check)
// ==========================================

async function checkSessionStatus(response) {
  if (response.status === 401 || response.status === 403) {
    showNotification('La sesión ha expirado. Redirigiendo...', 'error');
    setTimeout(() => window.location.href = '/login.php', 2000);
    return false;
  }
  return true;
}

function parkCurrentSale() {
  if (CART.length === 0) return showNotification('El carrito está vacío', 'warning');

  const saleData = {
    id: Date.now(),
    timestamp: new Date().toLocaleString(),
    items: [...CART],
    total: CART.reduce((s, i) => s + i.subtotal, 0)
  };

  PARKED_SALES.push(saleData);
  localStorage.setItem('tomodachi_parked_sales', JSON.stringify(PARKED_SALES));

  CART = [];
  // localStorage.removeItem('tomodachi_cart'); // Ya no se usa
  renderCart();
  updateParkedSalesIndicator();
  showNotification('Venta suspendida/guardada', 'success');
}

async function restoreParkedSale(id) {
  const index = PARKED_SALES.findIndex(s => s.id === id);
  if (index === -1) return;

  if (CART.length > 0) {
    const sobrescribir = await Toast.confirm('Hay productos en el carrito actual. ¿Deseas sobrescribirlos?');
    if (!sobrescribir) return;
  }

  CART = [...PARKED_SALES[index].items];
  PARKED_SALES.splice(index, 1);
  localStorage.setItem('tomodachi_parked_sales', JSON.stringify(PARKED_SALES));

  renderCart();
  updateParkedSalesIndicator();
  showNotification('Venta recuperada', 'success');
}

function updateParkedSalesIndicator() {
  // Buscar o crear el indicador
  let indicator = document.getElementById('parkedSalesBtn');

  if (!indicator) {
    // Intentar inyectarlo en la barra superior o cerca del carrito
    const target = document.querySelector('.cart-header') || document.getElementById('cartPanel');
    if (target) {
      indicator = document.createElement('button');
      indicator.id = 'parkedSalesBtn';
      indicator.className = 'btn-parked-sales';
      indicator.style.cssText = 'margin: 5px; padding: 5px 10px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; display: none; font-size: 0.8rem;';
      indicator.onclick = showParkedSalesList;

      if (target.classList.contains('cart-header')) {
        target.appendChild(indicator);
      } else {
        target.insertBefore(indicator, target.firstChild);
      }
    }
  }

  if (indicator) {
    indicator.textContent = `Suspendidas (${PARKED_SALES.length})`;
    indicator.style.display = PARKED_SALES.length > 0 ? 'inline-block' : 'none';
  }
}

function showParkedSalesList() {
  if (PARKED_SALES.length === 0) return;

  // Crear un modal simple dinámicamente
  const modalId = 'parkedSalesModal';
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;';
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  const listHtml = PARKED_SALES.map(s => `
        <div style="background: #f5f5f5; padding: 10px; margin-bottom: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${s.timestamp}</strong><br>
                ${s.items.length} items - Total: ${formatCurrency(s.total)}
            </div>
            <button onclick="restoreParkedSale(${s.id}); document.getElementById('${modalId}').style.display='none';" style="background: #4caf50; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Recuperar</button>
        </div>
    `).join('');

  modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin-top: 0;">Ventas Suspendidas</h3>
            ${listHtml}
            <button onclick="document.getElementById('${modalId}').style.display='none'" style="margin-top: 10px; width: 100%; padding: 8px;">Cerrar</button>
        </div>
    `;

  modal.style.display = 'flex';
}
// =============================================
// Money Panel - Ver sales-money-panel.js
// =============================================

/* Código extraído a sales-money-panel.js */

// ==========================================
// INTERFAZ DE VOZ (API Pública para VoiceCommander)
// ==========================================
window.posSystem = {
  searchAndAdd: async (query, quantity) => {
    try {
      console.log(`[Voice] Searching for: ${query}, Qty: ${quantity}`);
      // Usar la lógica de búsqueda existente
      const res = await fetch('../api/inventory/products.php?search=' + encodeURIComponent(query), { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
      if (!res.ok) return false;

      const resData = await res.json();
      if (!resData.success || !resData.data || resData.data.length === 0) {
        return false;
      }

      // Lógica de desempate:
      // 1. Coincidencia exacta de nombre
      // 2. Primer resultado si la lista es corta
      let product = resData.data.find(p => p.product_name.toLowerCase() === query.toLowerCase());

      if (!product) {
        // Si no hay exacta, tomar el primero (asumiendos la búsqueda ya ordena por relevancia)
        product = resData.data[0];
      }

      if (product) {
        // Agregar al carrito N veces
        for (let i = 0; i < quantity; i++) {
          addProductToCart({
            product_id: parseInt(product.product_id),
            product_name: product.product_name,
            unit_price: parseFloat(product.price),
            image_path: product.image_path,
            stock_quantity: product.stock_quantity !== undefined ? parseInt(product.stock_quantity) : null,
            is_bulk: product.is_bulk || 0,
            bulk_unit: product.bulk_unit || 'kg'
          });
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error in voice searchAndAdd', e);
      return false;
    }
  },

  initCheckout: () => {
    // Simular click en carrito si está cerrado
    if (cartPanel && !cartPanel.classList.contains('open')) {
      toggleCartPanel(true);
    }
    // Enfocar input de recibido
    setTimeout(() => {
      if (checkoutReceivedInput) checkoutReceivedInput.focus();
    }, 500);
  },

  clearCart: () => {
    CART = [];
    renderCart();
    showNotification('Carrito vaciado por voz', 'info');
  }
};

// =============================================
// Extras (Balanza + Pantalla Cliente) - Ver sales-extras.js
// =============================================

/* Código extraído a sales-extras.js */

// =============================================
// Promotions - Ver sales-promotions.js
// =============================================

/* Código extraído a sales-promotions.js */
