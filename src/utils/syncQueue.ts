/**
 * syncQueue.ts — Cortafuegos (debounce) de sincronización del Dashboard.
 *
 * Problema que resuelve: cada campo/sección del Dashboard (hero, stats, portfolio,
 * services, homes, ...) llamaba por separado al servidor al guardar, generando
 * decenas de peticiones simultáneas (condiciones de carrera: la última en llegar
 * pisaba a las demás con datos viejos).
 *
 * Ahora TODO cambio se encola aquí. Tras 300 ms sin nuevos cambios se envía
 * UN SOLO POST a /api/content/sync con el resultado agrupado:
 *   - config: el último objeto de configuración (gana la última escritura)
 *   - portfolio.upsert / portfolio.remove: cambios por id, fusionados
 * Los envíos se serializan: si hay uno en vuelo, el siguiente espera.
 */

export interface PortfolioPatch {
  upsert?: Array<Record<string, any>>;
  remove?: string[];
  replace?: Array<Record<string, any>>;
}

export interface ContentPatch {
  config?: Record<string, any>;
  portfolio?: PortfolioPatch;
}

export interface SyncResult {
  success: boolean;
  timestamp?: number;
  config?: Record<string, any>;
  portfolio?: Array<Record<string, any>>;
  error?: string;
}

const SYNC_ENDPOINT = '/api/content/sync';
const DEFAULT_DELAY_MS = 300;

class ContentSyncQueue {
  private pending: ContentPatch = {};
  private pendingChanges = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private waiters: Array<(r: SyncResult) => void> = [];
  private inFlight: Promise<void> = Promise.resolve();
  private channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('vb_cms_sync') : null;

  constructor(private delay = DEFAULT_DELAY_MS) {}

  /** Hay cambios esperando a ser enviados */
  hasPending() {
    return this.pendingChanges > 0;
  }

  /** Encola un parche; la promesa se resuelve cuando el lote completo llegó al servidor. */
  enqueue(patch: ContentPatch): Promise<SyncResult> {
    this.merge(patch);
    return new Promise<SyncResult>((resolve) => {
      this.waiters.push(resolve);
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = null;
        void this.flush();
      }, this.delay);
    });
  }

  /** Envía ya el lote pendiente (sin esperar el debounce). */
  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // Serializa: espera a que termine el envío anterior antes de enviar el siguiente
    this.inFlight = this.inFlight.then(() => this.send());
    return this.inFlight;
  }

  private merge(patch: ContentPatch) {
    this.pendingChanges++;

    if (patch.config) {
      // La última versión completa de la config gana (nunca enviamos su "portfolio")
      const { portfolio: _drop, ...rest } = patch.config as Record<string, any>;
      this.pending.config = rest;
    }

    if (patch.portfolio) {
      const cur = (this.pending.portfolio ||= {});
      if (patch.portfolio.replace) {
        cur.replace = patch.portfolio.replace;
        cur.upsert = [];
        cur.remove = [];
      }
      if (patch.portfolio.upsert?.length) {
        const map = new Map<string, Record<string, any>>();
        (cur.upsert || []).forEach((it) => map.set(String(it.id ?? `__new_${map.size}`), it));
        patch.portfolio.upsert.forEach((it) => {
          const key = it.id !== undefined && it.id !== '' ? String(it.id) : `__new_${map.size}_${Date.now()}`;
          map.set(key, { ...(map.get(key) || {}), ...it });
          // un upsert cancela un borrado previo del mismo id
          if (cur.remove) cur.remove = cur.remove.filter((x) => x !== key);
        });
        cur.upsert = Array.from(map.values());
      }
      if (patch.portfolio.remove?.length) {
        const kill = patch.portfolio.remove.map(String);
        cur.remove = Array.from(new Set([...(cur.remove || []), ...kill]));
        // un borrado cancela un upsert previo del mismo id
        if (cur.upsert) cur.upsert = cur.upsert.filter((it) => !kill.includes(String(it.id)));
      }
    }
  }

  private async send(): Promise<void> {
    if (!this.pendingChanges) return;

    const body = this.pending;
    const waiters = this.waiters;
    const changes = this.pendingChanges;
    this.pending = {};
    this.waiters = [];
    this.pendingChanges = 0;

    console.info(`Syncing content… (${changes} cambio${changes === 1 ? '' : 's'} agrupado${changes === 1 ? '' : 's'} en 1 llamado)`);

    let result: SyncResult;
    try {
      const res = await fetch(`${SYNC_ENDPOINT}?_cb=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({ success: res.ok }));
      result = res.ok && data.success !== false ? data : { success: false, error: data?.error || `HTTP ${res.status}` };
    } catch (err: any) {
      result = { success: false, error: err?.message || 'Network error' };
    }

    if (result.success && result.config) {
      const full = { ...result.config, portfolio: result.portfolio ?? result.config.portfolio };
      try {
        localStorage.setItem('vb_config_sync', JSON.stringify(full));
      } catch {}
      // UN solo aviso a las demás pestañas (y a los hooks de esta pestaña),
      // y solo si no quedaron cambios nuevos esperando (evita pisar lo que el usuario sigue editando).
      if (this.channel && !this.hasPending()) {
        this.channel.postMessage({ type: 'CONFIG_UPDATED', config: full, timestamp: result.timestamp || Date.now() });
      }
    }

    waiters.forEach((resolve) => resolve(result));
  }
}

export const contentSyncQueue = new ContentSyncQueue(DEFAULT_DELAY_MS);
