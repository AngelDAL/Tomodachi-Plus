// =============================================
// Money Panel - Extraído de sales.js
// =============================================

// ==========================================
// SISTEMA DE PAGO RÁPIDO (Billetes y Monedas)
// ==========================================

let moneyCounts = {};

function renderQuickCashButtons() {
  const input = document.getElementById('checkoutReceived');
  if (!input) return;

  // Asegurar que el input tenga un wrapper para posicionar el botón
  let wrapper = document.getElementById('money-input-wrapper');
  if (!wrapper) {
    // Crear wrapper alrededor del input existente
    wrapper = document.createElement('div');
    wrapper.id = 'money-input-wrapper';
    wrapper.style.cssText = 'position: relative; display: flex; align-items: stretch; width: 100%;';

    // Mover el input dentro del wrapper
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    // Ajustar estilo del input
    input.style.flex = '1';
    input.style.borderTopRightRadius = '0';
    input.style.borderBottomRightRadius = '0';

    // Botón para abrir el panel
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'money-panel-toggle';
    btn.innerHTML = '<i class="fas fa-money-bill-wave"></i>';
    btn.title = "Seleccionar billetes/monedas";
    btn.onclick = toggleMoneyPanel;
    btn.style.cssText = 'padding: 0 15px; background: var(--primary-color, #4CAF50); color: white; border: none; border-top-right-radius: 4px; border-bottom-right-radius: 4px; cursor: pointer; font-size: 1.1rem;';

    wrapper.appendChild(btn);

    // Listener para limpiar contadores si se escribe manualmente
    input.addEventListener('input', (e) => {
      if (e.isTrusted) { // Solo si es evento de usuario real
        resetMoneyCounts(false); // false = no borrar input, solo visuales
        // Ocultar panel al escribir
        const panel = document.getElementById('money-panel-tooltip');
        const overlay = document.getElementById('money-panel-overlay');
        if (panel) panel.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
      }
    });

    injectMoneyPanelStyles();
  }
}

function injectMoneyPanelStyles() {
  if (document.getElementById('money-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'money-panel-styles';
  style.textContent = `
        /* Estilos comunes */
        .money-panel-tooltip {
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border-radius: 8px;
            padding: 15px;
            z-index: 10001;
        }
        
        .money-panel-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s;
        }
        .money-panel-overlay.active {
            opacity: 1;
            visibility: visible;
        }
        
        /* Escritorio */
        @media (min-width: 769px) {
            .money-panel-tooltip {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 380px;
                display: none;
                animation: fadeIn 0.2s ease-out;
            }
            .money-panel-tooltip.active {
                display: block;
            }
        }

        /* Móvil */
        @media (max-width: 768px) {
            .money-panel-tooltip {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                width: 100%;
                border-radius: 20px 20px 0 0;
                border: none;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
                padding: 20px;
                z-index: 10001;
                transform: translateY(100%);
                transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
                display: block !important;
            }
            .money-panel-tooltip.active {
                transform: translateY(0);
            }
            
            /* Ajustes grid móvil */
            .money-grid { gap: 12px; }
            .money-btn { height: 55px; font-size: 1.2rem; }
        }

        @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }

        .money-section { margin-bottom: 15px; }
        .money-section-title { font-size: 0.75rem; color: #888; margin-bottom: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .money-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        
        .money-btn {
            position: relative;
            border: 1px solid #e0e0e0;
            background: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #333;
            transition: all 0.1s;
            user-select: none;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .money-btn:active { transform: scale(0.96); }
        .money-btn:hover { background: #f9f9f9; border-color: #ccc; }
        
        /* Billetes */
        .money-btn.bill {
            height: 45px;
            border-radius: 4px;
            background: linear-gradient(135deg, #fdfbf7 0%, #f4f1ea 100%);
            color: #2e7d32;
            border-color: #c8e6c9;
            font-family: 'Courier New', monospace;
            font-size: 1.1rem;
        }
        .money-btn.bill::before {
            content: '';
            position: absolute;
            left: 3px; top: 3px; bottom: 3px; right: 3px;
            border: 1px dashed #a5d6a7;
            border-radius: 2px;
            pointer-events: none;
        }
        
        /* Monedas */
        .money-btn.coin {
            height: 50px;
            width: 50px;
            border-radius: 50%;
            margin: 0 auto;
            background: radial-gradient(circle at 30% 30%, #fff 0%, #ffd700 100%);
            border: 2px solid #d4af37;
            color: #8a6e22;
            font-size: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .money-btn.coin.silver {
            border-color: #bdc3c7;
            background: radial-gradient(circle at 30% 30%, #fff 0%, #bdc3c7 100%);
            color: #555;
        }
        .money-btn.coin.copper {
            border-color: #d35400;
            background: radial-gradient(circle at 30% 30%, #fff 0%, #e67e22 100%);
            color: #a04000;
        }
        
        .money-count-badge {
            position: absolute;
            bottom: -6px;
            right: -6px;
            background: #d32f2f;
            color: white;
            border-radius: 50%;
            min-width: 20px;
            height: 20px;
            padding: 0 4px;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 2;
            font-weight: bold;
        }

        .money-remove-btn {
            position: absolute;
            bottom: -6px;
            left: -6px;
            background: rgba(0, 0, 0, 0.05);
            color: #777;
            border: 1px solid rgba(0,0,0,0.1);
            border-radius: 50%;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            cursor: pointer;
            z-index: 3;
            transition: all 0.2s;
        }
        .money-remove-btn:hover { 
            background: rgba(211, 47, 47, 0.1);
            color: #d32f2f;
            border-color: #d32f2f;
            transform: scale(1.1); 
        }
        .money-remove-btn:active { transform: scale(0.9); }
        
        .money-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #eee;
        }
        .btn-money-action {
            font-size: 0.8rem;
            padding: 6px 12px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            color: #555;
        }
        .btn-money-action:hover { background: #eee; }
        .btn-money-action.clear { color: #d32f2f; border-color: #ffcdd2; background: #ffebee; }
        .btn-money-action.clear:hover { background: #ffcdd2; }
    `;
  document.head.appendChild(style);
}

function toggleMoneyPanel(e) {
  if (e) e.stopPropagation();
  let panel = document.getElementById('money-panel-tooltip');
  if (!panel) {
    createMoneyPanel();
    panel = document.getElementById('money-panel-tooltip');
  }

  const overlay = document.getElementById('money-panel-overlay');

  if (panel.classList.contains('active')) {
    // Cerrar
    panel.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  } else {
    // Abrir
    panel.classList.add('active');
    if (overlay) overlay.classList.add('active');

    // Limpiar estilos inline de posicionamiento absoluto (para que CSS fixed funcione)
    panel.style.top = '';
    panel.style.left = '';
    panel.style.bottom = '';
    panel.style.right = '';
  }
}

function positionMoneyPanel(panel) {
  const wrapper = document.getElementById('money-input-wrapper');
  if (!wrapper || !panel) return;

  // Resetear estilos para medir correctamente
  panel.style.top = '';
  panel.style.bottom = '';
  panel.style.left = '';
  panel.style.right = '';
  panel.classList.remove('pos-top', 'pos-bottom');

  const rect = wrapper.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;
  const scrollX = window.scrollX || window.pageXOffset;

  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const margin = 10;

  // Decidir posición vertical (Preferir arriba, si no cabe, abajo)
  if (spaceAbove > panelRect.height + margin || spaceAbove > spaceBelow) {
    // Mostrar Arriba (Coordenadas absolutas al documento)
    panel.style.top = (rect.top + scrollY - panelRect.height - margin) + 'px';
    panel.classList.add('pos-top');
  } else {
    // Mostrar Abajo
    panel.style.top = (rect.bottom + scrollY + margin) + 'px';
    panel.classList.add('pos-bottom');
  }

  // Ajuste Horizontal (Alinear a la derecha del input)
  let leftPos = rect.right + scrollX - panelRect.width;

  // Si se sale por la izquierda, alinear a la izquierda
  if (leftPos < 10) {
    leftPos = rect.left + scrollX;
  }

  panel.style.left = leftPos + 'px';
}

function createMoneyPanel() {
  const wrapper = document.getElementById('money-input-wrapper');
  if (!wrapper) return;

  // Overlay para móvil
  let overlay = document.getElementById('money-panel-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'money-panel-overlay';
    overlay.className = 'money-panel-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      const panel = document.getElementById('money-panel-tooltip');
      if (panel) panel.classList.remove('active');
      overlay.classList.remove('active');
    });
  }

  const panel = document.createElement('div');
  panel.id = 'money-panel-tooltip';
  panel.className = 'money-panel-tooltip';

  // Definición de dinero
  const coins = [1, 2, 5, 10];
  const bills = [20, 50, 100, 200, 500, 1000];

  let html = `
        <div class="money-panel-header" style="text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
            <div style="font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Total Acumulado</div>
            <div id="money-panel-total" style="font-size: 2.2rem; font-weight: 800; color: var(--primary-color, #2e7d32); line-height: 1.2; margin-top: 5px;">$0.00</div>
        </div>

        <div class="money-section">
            <div class="money-section-title">Billetes</div>
            <div class="money-grid">
                ${bills.map(val => `
                    <div class="money-btn bill" onclick="addMoney(${val})" data-val="${val}">
                        $${val}
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="money-section">
            <div class="money-section-title">Monedas</div>
            <div class="money-grid" style="grid-template-columns: repeat(4, 1fr);">
                ${coins.map(val => `
                    <div class="money-btn coin ${val < 5 ? 'silver' : ''}" onclick="addMoney(${val})" data-val="${val}">
                        $${val}
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="money-actions">
            <button class="btn-money-action clear" onclick="resetMoneyCounts(true)">Limpiar</button>
            <button class="btn-money-action" onclick="document.getElementById('money-panel-tooltip').classList.remove('active'); document.getElementById('money-panel-overlay').classList.remove('active');">Cerrar</button>
        </div>
    `;

  panel.innerHTML = html;
  // IMPORTANTE: Añadir al body para evitar problemas de z-index y overflow
  document.body.appendChild(panel);

  // Listener global para cerrar en escritorio (clic fuera)
  document.addEventListener('click', function closeMoneyPanel(e) {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return; // En móvil usamos el overlay

    if (panel.classList.contains('active') &&
      !panel.contains(e.target) &&
      !e.target.closest('.money-panel-toggle')) {
      panel.classList.remove('active');
    }
  });

  // Restaurar badges si había estado
  updateMoneyBadges();
}

// Exponer globalmente para los onlick del HTML inyectado
window.addMoney = function (amount) {
  if (!moneyCounts[amount]) moneyCounts[amount] = 0;
  moneyCounts[amount]++;

  updateMoneyInput();
  updateMoneyBadges();
};

window.removeMoney = function (amount) {
  if (moneyCounts[amount] && moneyCounts[amount] > 0) {
    moneyCounts[amount]--;
    if (moneyCounts[amount] === 0) delete moneyCounts[amount];
    updateMoneyInput();
    updateMoneyBadges();
  }
};

window.resetMoneyCounts = function (clearInput = true) {
  moneyCounts = {};
  updateMoneyBadges();
  if (clearInput && checkoutReceivedInput) {
    checkoutReceivedInput.value = '';
    recalcChange();
  }
  updateMoneyPanelTotal(0);
};

function updateMoneyInput() {
  let total = 0;
  for (const [val, count] of Object.entries(moneyCounts)) {
    total += parseInt(val) * count;
  }

  if (checkoutReceivedInput) {
    checkoutReceivedInput.value = total;
    recalcChange();
  }
  updateMoneyPanelTotal(total);
}

function updateMoneyPanelTotal(total) {
  const el = document.getElementById('money-panel-total');
  if (el) el.textContent = formatCurrency(total);
}

function updateMoneyBadges() {
  const panel = document.getElementById('money-panel-tooltip');
  if (!panel) return;

  // Limpiar badges y botones de restar existentes
  panel.querySelectorAll('.money-count-badge, .money-remove-btn').forEach(el => el.remove());

  // Añadir nuevos
  for (const [val, count] of Object.entries(moneyCounts)) {
    if (count > 0) {
      const btn = panel.querySelector(`.money-btn[data-val="${val}"]`);
      if (btn) {
        // Badge de cantidad
        const badge = document.createElement('div');
        badge.className = 'money-count-badge';
        badge.textContent = count;
        btn.appendChild(badge);

        // Botón de restar
        const removeBtn = document.createElement('div');
        removeBtn.className = 'money-remove-btn';
        removeBtn.innerHTML = '<i class="fas fa-minus"></i>';
        removeBtn.title = "Restar uno";
        removeBtn.onclick = (e) => {
          e.stopPropagation(); // Evitar que dispare el addMoney del padre
          removeMoney(val);
        };
        btn.appendChild(removeBtn);
      }
    }
  }
}
