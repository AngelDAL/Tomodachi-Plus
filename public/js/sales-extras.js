// =============================================
// Extras (Balanza + Pantalla Cliente) - Extraído de sales.js
// =============================================

// =============================================
// INTEGRACIÓN DE BALANZAS/PESAS
// =============================================

// Inicializar ScaleManager cuando la página cargue
function initScaleManager() {
  if (!window.ScaleManager) {
    console.warn('ScaleManager no disponible');
    return;
  }

  // Crear instancia global
  window.scaleManager = new ScaleManager();

  // Elementos del DOM
  const toggleScaleBtn = document.getElementById('toggleScaleBtn');
  const scaleStatusIndicator = document.getElementById('scaleStatusIndicator');
  const scaleStatus = document.getElementById('scaleStatus');
  const scaleWeight = document.getElementById('scaleWeight');
  const scaleWeightValue = document.getElementById('scaleWeightValue');
  const scaleWeightUnit = document.getElementById('scaleWeightUnit');

  if (!toggleScaleBtn) return;

  // Evento: Conectar balanza
  toggleScaleBtn.addEventListener('click', async () => {
    if (window.scaleManager.isConnected) {
      await window.scaleManager.disconnect();
    } else {
      try {
        if (!navigator.serial) {
          showNotification('WebSerial API no soportada. Usa Chrome 89+ o Edge 89+', 'error');
          return;
        }
        
        // Mostrar selector de protocolo
        const protocol = await showScaleProtocolDialog();
        if (protocol) {
          window.scaleManager.setProtocol(protocol);
          await window.scaleManager.requestPort();
        }
      } catch (error) {
        if (error.name !== 'NotFoundError') {
          showNotification(`Error: ${error.message}`, 'error');
        }
      }
    }
  });

  // Callback: Conexión exitosa
  window.scaleManager.on('onConnect', (data) => {
    toggleScaleBtn.classList.add('connected');
    scaleStatusIndicator.classList.add('connected');
    scaleStatus.textContent = 'Conectada';
    showNotification('Balanza conectada', 'success');
  });

  // Callback: Desconexión
  window.scaleManager.on('onDisconnect', (data) => {
    toggleScaleBtn.classList.remove('connected');
    scaleStatusIndicator.classList.remove('connected');
    scaleStatus.textContent = 'Desconectada';
    scaleWeight.style.display = 'none';
    showNotification('Balanza desconectada', 'info');
  });

  // Callback: Peso recibido
  window.scaleManager.on('onWeight', (data) => {
    scaleWeightValue.textContent = data.weight.toFixed(3);
    scaleWeightUnit.textContent = data.unit;
    scaleWeight.style.display = 'inline';
  });

  // Callback: Error
  window.scaleManager.on('onError', (data) => {
    console.error('Scale error:', data);
  });
}

// Mostrar diálogo para seleccionar protocolo
async function showScaleProtocolDialog() {
  return new Promise((resolve) => {
    const html = `
      <div id="protocolModal" class="modal-overlay active">
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header">
            <h3><i class="fas fa-balance-scale"></i> Seleccionar Protocolo</h3>
          </div>
          <div class="modal-body">
            <p style="color: #666; margin-bottom: 15px;">
              Selecciona el protocolo compatible con tu balanza:
            </p>
            <div class="form-group">
              <label style="display: flex; align-items: center; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; cursor: pointer; margin-bottom: 10px; transition: all 0.2s;">
                <input type="radio" name="protocol" value="generic" checked style="margin-right: 10px;">
                <span>
                  <strong>Genérico</strong><br>
                  <small style="color: #999;">9600 baud, 8N1</small>
                </span>
              </label>
              <label style="display: flex; align-items: center; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; cursor: pointer; margin-bottom: 10px; transition: all 0.2s;">
                <input type="radio" name="protocol" value="datalogic" style="margin-right: 10px;">
                <span>
                  <strong>Datalogic</strong><br>
                  <small style="color: #999;">9600 baud, 8O2</small>
                </span>
              </label>
              <label style="display: flex; align-items: center; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                <input type="radio" name="protocol" value="excell" style="margin-right: 10px;">
                <span>
                  <strong>Excell</strong><br>
                  <small style="color: #999;">1200 baud, 8N1</small>
                </span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" onclick="closeProtocolModal()">Cancelar</button>
            <button class="btn-primary" onclick="confirmProtocol()">Conectar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    window._protocolModalResolve = resolve;
    window.closeProtocolModal = () => {
      document.getElementById('protocolModal')?.remove();
      resolve(null);
      window._protocolModalResolve = null;
    };

    window.confirmProtocol = () => {
      const selected = document.querySelector('input[name="protocol"]:checked');
      const protocol = selected?.value || 'generic';
      document.getElementById('protocolModal')?.remove();
      resolve(protocol);
      window._protocolModalResolve = null;
    };
  });
}

// Cargar script de ScaleManager si no existe
function loadScaleManagerScript() {
  if (window.ScaleManager) {
    initScaleManager();
    return;
  }

  const script = document.createElement('script');
  script.src = 'js/scale-manager.js';
  script.onload = () => {
    setTimeout(() => initScaleManager(), 100);
  };
  script.onerror = () => {
    console.warn('No se pudo cargar scale-manager.js');
  };
  document.head.appendChild(script);
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadScaleManagerScript);
} else {
  loadScaleManagerScript();
}

// =============================================
// PANTALLA DE CLIENTE (CUSTOMER DISPLAY)
// =============================================

let customerDisplayWindow = null;
let customerDisplayChannel = null;
let displaySessionUUID = null;

// Restaurar UUID de sesión guardado
try {
  const saved = localStorage.getItem('tomodachi_display_session');
  if (saved) displaySessionUUID = saved;
} catch (_) {};

// Inicializar sistema de pantalla de cliente
function initCustomerDisplay() {
  const toggleBtn = document.getElementById('toggleCustomerDisplayBtn');
  if (!toggleBtn) return;

  // Inicializar BroadcastChannel
  try {
    customerDisplayChannel = new BroadcastChannel('tomodachi_pos_sync');
    
    // Escuchar solicitudes de datos desde la pantalla
    customerDisplayChannel.onmessage = (event) => {
      if (event.data.type === 'request_data') {
        sendCartToCustomerDisplay();
      }
    };
  } catch (error) {
    console.warn('BroadcastChannel no disponible, usando localStorage');
  }

  // Evento: Abrir/Cerrar pantalla de cliente
  toggleBtn.addEventListener('click', () => {
    if (customerDisplayWindow && !customerDisplayWindow.closed) {
      // Cerrar ventana existente
      customerDisplayWindow.close();
      customerDisplayWindow = null;
      toggleBtn.classList.remove('active');
    } else {
      // Abrir nueva ventana
      openCustomerDisplay();
    }
  });

  // Verificar si la ventana sigue abierta
  setInterval(() => {
    if (customerDisplayWindow && customerDisplayWindow.closed) {
      customerDisplayWindow = null;
      toggleBtn.classList.remove('active');
    }
  }, 1000);
}

// Abrir ventana de pantalla de cliente
function openCustomerDisplay() {
  const toggleBtn = document.getElementById('toggleCustomerDisplayBtn');
  
  // Configuración de ventana
  const width = 1024;
  const height = 768;
  const left = window.screenX + window.outerWidth;
  const top = window.screenY;

  const features = `
    width=${width},
    height=${height},
    left=${left},
    top=${top},
    toolbar=no,
    menubar=no,
    location=no,
    status=no,
    scrollbars=no,
    resizable=yes
  `.replace(/\s/g, '');

  try {
    customerDisplayWindow = window.open(
      'customer-display.html',
      'TomodachiCustomerDisplay',
      features
    );

    if (customerDisplayWindow) {
      toggleBtn.classList.add('active');
      
      // Enviar datos iniciales cuando cargue
      customerDisplayWindow.addEventListener('load', () => {
        setTimeout(() => sendCartToCustomerDisplay(), 500);
      });

      showNotification('Pantalla de cliente abierta', 'success');
    } else {
      showNotification('No se pudo abrir la ventana. Verifica los permisos del navegador.', 'error');
    }
  } catch (error) {
    console.error('Error al abrir pantalla de cliente:', error);
    showNotification('Error al abrir pantalla de cliente', 'error');
  }
}

// Combinar todos los carritos para enviar al display
function getCombinedCartForDisplay() {
  const allItems = [];
  Object.keys(MULTI_CARTS).forEach(tabId => {
    const items = MULTI_CARTS[tabId] || [];
    if (items.length > 0) {
      items.forEach(item => {
        allItems.push({
          ...item,
          cart_tab: parseInt(tabId),
          is_active: tabId === CURRENT_TAB
        });
      });
    }
  });
  return allItems;
}

function calculateTotalsForDisplay() {
  let allSubtotal = 0;
  Object.keys(MULTI_CARTS).forEach(tabId => {
    const items = MULTI_CARTS[tabId] || [];
    items.forEach(item => {
      allSubtotal += (item.subtotal || item.quantity * item.unit_price);
    });
  });
  return {
    subtotal: allSubtotal,
    discount: parseFloat(discountInput?.value) || 0,
    tax: parseFloat(taxInput?.value) || 0,
    total: Math.max(0, allSubtotal - (parseFloat(discountInput?.value) || 0) + (parseFloat(taxInput?.value) || 0))
  };
}

// Enviar datos del carrito a la pantalla de cliente
function sendCartToCustomerDisplay() {
  const allItems = getCombinedCartForDisplay();
  const totals = calculateTotalsForDisplay();
  const storeName = localStorage.getItem('tomodachi_store_name') || document.querySelector('.sidebar-header h2')?.textContent || 'Tomodachi';

  const data = {
    type: 'cart_update',
    cart: allItems,
    totals: totals,
    storeInfo: { name: storeName, logo: '' },
    activeTab: parseInt(CURRENT_TAB),
    timestamp: Date.now()
  };

  // Enviar por BroadcastChannel
  if (customerDisplayChannel) {
    try {
      customerDisplayChannel.postMessage(data);
    } catch (error) {
      console.error('Error enviando por BroadcastChannel:', error);
    }
  }

  // localStorage fallback (same-browser cross-tab)
  try {
    localStorage.setItem('tomodachi_customer_display', JSON.stringify(data));
  } catch (error) {
    console.error('Error guardando en localStorage:', error);
  }

  // Servidor con UUID de sesión
  if (displaySessionUUID) {
    fetch('../api/sales/cart_sync.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        session: displaySessionUUID,
        cart: data.cart,
        totals: data.totals,
        storeInfo: data.storeInfo,
        activeTab: data.activeTab
      })
    }).catch(err => console.warn('cart_sync error:', err));
  }
}

// Calcular totales del carrito
function calculateTotals() {
  const cart = CART; // Usar carrito activo
  
  let subtotal = 0;
  cart.forEach(item => {
    // Asegurar que los valores sean numéricos
    const price = parseFloat(item.unit_price) || 0;
    const qty = parseFloat(item.quantity) || 0;
    const itemSubtotal = parseFloat(item.subtotal) || (price * qty);
    
    subtotal += itemSubtotal;
  });

  const discountValue = parseFloat(discountInput?.value) || 0;
  const taxValue = parseFloat(taxInput?.value) || 0;

  const total = subtotal - discountValue + taxValue;

  return {
    subtotal: subtotal,
    discount: discountValue,
    tax: taxValue,
    total: Math.max(0, total)
  };
}

// Sincronización periódica: cada 2s si hay sesión activa
let syncInterval = null;
function startSyncInterval() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    if (displaySessionUUID) {
      sendCartToCustomerDisplay();
    }
  }, 2000);
}

// Llamar también al cambiar el carrito (además del intervalo)
const originalRenderCart = renderCart;
renderCart = function() {
  originalRenderCart.apply(this, arguments);
  if ((customerDisplayWindow && !customerDisplayWindow.closed) || displaySessionUUID) {
    sendCartToCustomerDisplay();
  }
};

const originalRecalcTotals = recalcTotals;
recalcTotals = function() {
  originalRecalcTotals.apply(this, arguments);
  if ((customerDisplayWindow && !customerDisplayWindow.closed) || displaySessionUUID) {
    sendCartToCustomerDisplay();
  }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomerDisplay);
} else {
  initCustomerDisplay();
}

// Limpiar al cerrar página
window.addEventListener('beforeunload', () => {
  if (customerDisplayChannel) {
    customerDisplayChannel.close();
  }
  if (customerDisplayWindow && !customerDisplayWindow.closed) {
    customerDisplayWindow.close();
  }
});
