/**
 * reload.js - Cliente WebSocket resiliente (Live-Reload + avisos de contenido)
 *
 * - Protocolo y host 100 % dinámicos: ws:// o wss:// según la página y
 *   window.location.host (nada de puertos/IPs fijas: sirve en localhost:3000,
 *   en la IP de red local o detrás de un dominio con HTTPS).
 * - Ruta: /ws/ws (el servidor también acepta /ws).
 * - Mensajes del servidor:
 *     { type: 'content-updated', sections: [...], mediaChanged: bool }
 *         -> NO recarga la página: dispara el evento 'cms:content-updated'
 *            para que el sitio refresque solo lo que cambió (sin saltos).
 *     { type: 'reload' | 'full-reload' } o 'reload'
 *         -> recarga completa (uso de desarrollo).
 * - Reconexión con backoff exponencial y sin ruido en consola.
 */
(function () {
  if (typeof window === 'undefined' || !window.WebSocket) return;
  if (window.__vbReloadClient) return; // evita instancias duplicadas

  // Solo en desarrollo / red local. En producción estática (Cloudflare Pages) no hay servidor
  // WebSocket y el cliente reintentaría conectar para siempre llenando la consola de errores.
  var h = window.location.hostname;
  if (!(h === 'localhost' || h === '127.0.0.1' || /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))\./.test(h))) return;
  window.__vbReloadClient = true;

  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var wsUrl = protocol + '//' + window.location.host + '/ws/ws';

  var socket = null;
  var retryCount = 0;
  var maxDelay = 10000;
  var retryTimer = null;
  var closedByPage = false;

  function emit(detail) {
    try {
      window.dispatchEvent(new CustomEvent('cms:content-updated', { detail: detail || {} }));
    } catch (e) {}
  }

  function connect() {
    if (closedByPage) return;
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;

    try {
      socket = new WebSocket(wsUrl);
    } catch (err) {
      scheduleReconnect();
      return;
    }

    socket.onopen = function () {
      retryCount = 0;
    };

    socket.onmessage = function (event) {
      var data = null;
      try { data = JSON.parse(event.data); } catch (e) { data = event.data; }

      if (data === 'reload' || (data && (data.type === 'reload' || data.type === 'full-reload' || data.action === 'reload'))) {
        window.location.reload();
        return;
      }
      if (data && data.type === 'content-updated') {
        emit(data);
      }
    };

    socket.onclose = function () {
      scheduleReconnect();
    };

    socket.onerror = function () {
      try { if (socket && socket.readyState !== WebSocket.CLOSED) socket.close(); } catch (e) {}
    };
  }

  function scheduleReconnect() {
    if (closedByPage || retryTimer) return;
    retryCount++;
    var delay = Math.min(1000 * Math.pow(1.5, Math.min(retryCount, 8)), maxDelay);
    retryTimer = setTimeout(function () {
      retryTimer = null;
      connect();
    }, delay);
  }

  window.addEventListener('beforeunload', function () {
    closedByPage = true;
    try { if (socket) socket.close(); } catch (e) {}
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    connect();
  } else {
    document.addEventListener('DOMContentLoaded', connect);
  }
})();
