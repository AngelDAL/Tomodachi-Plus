/**
 * Módulo de Soporte para Balanzas/Pesas
 * Soporta WebSerial API (Chrome 89+, Edge 89+)
 * 
 * Protocolos soportados:
 * - Balanzas genéricas (formato: "PESO\r\n")
 * - Balanzas Datalogic (CR-LF terminado)
 * - Balanzas Excell
 */

class ScaleManager {
  constructor() {
    this.port = null;
    this.isConnected = false;
    this.isReading = false;
    this.reader = null;
    this.weight = 0;
    this.unit = 'kg'; // kg, g, lb, oz
    this.protocol = 'generic'; // generic, datalogic, excell
    this.eventListeners = {};
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onWeight: null,
      onError: null
    };

    // Configuración de protocolos
    this.protocols = {
      generic: {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        parser: (data) => this._parseGeneric(data)
      },
      datalogic: {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 2,
        parity: 'odd',
        parser: (data) => this._parseDatalogic(data)
      },
      excell: {
        baudRate: 1200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        parser: (data) => this._parseExcell(data)
      }
    };
  }

  /**
   * Solicita permiso y conecta a un puerto serial
   */
  async requestPort(filters = {}) {
    try {
      if (!navigator.serial) {
        throw new Error('WebSerial API no está soportada en este navegador. Usa Chrome 89+ o Edge 89+');
      }

      // Aplicar filtros (ej: USB vendor ID específico)
      const portFilters = filters.usbVendorId 
        ? [{ usbVendorId: filters.usbVendorId }]
        : [];

      this.port = await navigator.serial.requestPort({ filters: portFilters });
      await this.connect();
      return true;
    } catch (error) {
      this._handleError('Error solicitando puerto', error);
      return false;
    }
  }

  /**
   * Conecta al puerto serial
   */
  async connect() {
    try {
      if (!this.port) {
        throw new Error('No hay puerto seleccionado');
      }

      const config = this.protocols[this.protocol];
      await this.port.open(config);

      this.isConnected = true;
      this._handleCallback('onConnect', { port: this.port, protocol: this.protocol });
      
      // Iniciar lectura
      this.startReading();
      return true;
    } catch (error) {
      this._handleError('Error conectando al puerto', error);
      return false;
    }
  }

  /**
   * Comienza a leer datos del puerto
   */
  async startReading() {
    this.isReading = true;
    let buffer = '';

    try {
      while (this.port.readable && this.isReading) {
        this.reader = this.port.readable.getReader();
        
        try {
          while (true) {
            const { value, done } = await this.reader.read();
            
            if (done) break;

            // Convertir bytes a string
            const text = new TextDecoder().decode(value);
            buffer += text;

            // Buscar línea completa (terminada con \r o \n)
            const lines = buffer.split(/[\r\n]+/);
            
            // Procesar líneas completas (mantener última incompleta)
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (line) {
                this._processWeightData(line);
              }
            }
            
            // Mantener última línea incompleta en buffer
            buffer = lines[lines.length - 1];
          }
        } finally {
          this.reader.releaseLock();
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        this._handleError('Error leyendo puerto', error);
      }
    }
  }

  /**
   * Procesa dato de peso recibido
   */
  _processWeightData(data) {
    const config = this.protocols[this.protocol];
    const weight = config.parser(data);

    if (weight !== null) {
      this.weight = weight;
      this._handleCallback('onWeight', {
        weight: this.weight,
        unit: this.unit,
        raw: data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Parser para balanzas genéricas
   * Formato: "1234.56" o "12.34 kg"
   */
  _parseGeneric(data) {
    // Buscar número con decimales
    const match = data.match(/(\d+[\.,]\d+)/);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return null;
  }

  /**
   * Parser para balanzas Datalogic
   * Formato: "ST,GS,1234.56,g\r\n"
   */
  _parseDatalogic(data) {
    const parts = data.split(',');
    if (parts.length >= 3) {
      const weight = parseFloat(parts[2]);
      if (!isNaN(weight)) {
        if (parts.length >= 4) {
          this.unit = parts[3].trim();
        }
        return weight;
      }
    }
    return null;
  }

  /**
   * Parser para balanzas Excell
   * Formato: "+1234.56g\r"
   */
  _parseExcell(data) {
    const match = data.match(/([+-]?\d+[\.,]\d+)([a-z]+)?/i);
    if (match) {
      const weight = parseFloat(match[1].replace(',', '.'));
      if (match[2]) {
        this.unit = match[2].trim();
      }
      return weight;
    }
    return null;
  }

  /**
   * Desconecta del puerto
   */
  async disconnect() {
    try {
      this.isReading = false;
      
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
      }

      if (this.port) {
        await this.port.close();
      }

      this.isConnected = false;
      this.port = null;
      this._handleCallback('onDisconnect', {});
      return true;
    } catch (error) {
      this._handleError('Error desconectando', error);
      return false;
    }
  }

  /**
   * Obtiene puertos previamente accedidos
   */
  async getPreviousPorts() {
    try {
      if (!navigator.serial) return [];
      return await navigator.serial.getPorts();
    } catch (error) {
      console.error('Error obteniendo puertos previos', error);
      return [];
    }
  }

  /**
   * Cambia el protocolo de lectura
   */
  setProtocol(protocol) {
    if (!this.protocols[protocol]) {
      throw new Error(`Protocolo desconocido: ${protocol}`);
    }
    this.protocol = protocol;
  }

  /**
   * Registra listener para eventos (compatible con addEventListener)
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
    
    // También registra en callbacks para compatibilidad
    if (event in this.callbacks) {
      this.callbacks[event] = callback;
    }
  }

  /**
   * Remove listener para eventos
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emite un evento
   */
  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en listener ${event}:`, error);
        }
      });
    }
  }

  /**
   * Simula datos de peso (para pruebas sin hardware)
   * Útil para la herramienta de prueba
   */
  simulateWeight(weight, unit = 'kg') {
    if (!this.isConnected) {
      console.warn('No conectado. Primero llama a requestPort()');
      return;
    }
    this._processWeightData(`${weight.toFixed(2)} ${unit}`);
  }

  /**

  /**
   * Maneja errores
   */
  _handleError(message, error) {
    console.error(`${message}:`, error);
    this._handleCallback('onError', { message, error });
  }
}

// Exportar para uso global
window.ScaleManager = ScaleManager;
