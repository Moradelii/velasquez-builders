import React, { useState, useEffect, useCallback } from 'react';
import { validateMediaFile, getCacheBustedUrl, MediaFolder } from '../utils/mediaValidation';

export interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface PortfolioItem {
  url: string;
  title: string;
  location: string;
  svc: string;
}

export interface PortfolioDataItem {
  id: string;
  imageUrl: string;
  title: string;
  categoryLocation: string;
  description: string;
  updatedAt?: string;
}

export interface HomeProject {
  id: string;
  title: string;
  tagline?: string;
  address: string;
  specs: string;
  sqft?: string;
  beds?: string;
  baths?: string;
  garage?: string;
  year?: string;
  desc: string;
  highlights?: string[];
  image: string;
  galleryImages?: string[];
}

export interface ProcessStep {
  step: number;
  title: string;
  desc: string;
}

export interface TeamMember {
  name: string;
  role: string;
  url: string;
  description?: string;
}

export interface TestimonialItem {
  name: string;
  location: string;
  text: string;
  rating?: number;
}

export interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

export interface QuoteSection {
  id: string;
  label: string;
  options: string[];
}

export interface FooterColumn {
  title: string;
  items: string[];
}

export interface SiteConfig {
  hero?: {
    badgeText?: string;
    headline?: string;
    description?: string;
    imageUrl?: string;
    videoUrl?: string;
  };
  contact?: {
    phone1?: string;
    phone2?: string;
    phone3?: string;
    email?: string;
    address?: string;
    hours?: string;
  };
  services: ServiceItem[];
  portfolio: PortfolioItem[];
  process?: ProcessStep[];
  team?: TeamMember[];
  quoteForm?: {
    sections: QuoteSection[];
  };
  testimonials?: TestimonialItem[];
  features?: FeatureItem[];
  footerColumns?: FooterColumn[];
  footerCopyright?: string;
  footer?: {
    about?: string;
    whyChooseUs?: string[];
    paymentMethods?: string[];
    whatsapp?: {
      phone?: string;
      message?: string;
    };
    attribution?: {
      text?: string;
      url?: string;
    };
  };
  homes?: {
    headline?: string;
    description?: string;
    projects: HomeProject[];
  };
  [key: string]: any;
}

export interface LeadHistoryItem {
  timestamp: string;
  action: string;
  details: string;
}

export interface Lead {
  id: string;
  createdAt: string;
  status: 'New' | 'Contacted' | 'Estimate Scheduled' | 'Proposal Sent' | 'Won' | 'Closed';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  projectType: string;
  timeline: string;
  budget: string;
  description: string;
  source: string;
  notes?: string;
  history?: LeadHistoryItem[];
  // On-Site Inspection Visit fields
  visitRequested?: boolean;
  visitDate?: string;
  visitTimeSlot?: string;
  visitAddress?: string;
  visitCity?: string;
  visitZip?: string;
  visitNotes?: string;
  visitStatus?: 'Pending' | 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled';
}

export interface MediaFileItem {
  filename: string;
  path: string;
  size: number;
  updatedAt: number;
  urlWithCacheBuster: string;
}

export interface MediaCatalog {
  gallery: MediaFileItem[];
  logo: MediaFileItem[];
  video: MediaFileItem[];
}

// Safe JSON parser to eliminate "Unexpected end of JSON input" errors
async function safeParseJson<T = any>(res: Response, fallback: T): Promise<any> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return fallback;
    return JSON.parse(text);
  } catch (e) {
    console.warn('safeParseJson warning:', e);
    return fallback;
  }
}

const getInitialMedia = (): MediaCatalog => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('vb_media_catalog');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.gallery?.length || parsed.logo?.length || parsed.video?.length)) {
          return parsed;
        }
      }
    } catch (e) {}
    const def = (window as any).__DEFAULT_MEDIA__;
    if (def && (def.gallery?.length || def.logo?.length || def.video?.length)) {
      return def;
    }
  }
  return { gallery: [], logo: [], video: [] };
};

/**
 * useMediaManager Hook
 */
export function useMediaManager() {
  const [media, setMedia] = useState<MediaCatalog>(getInitialMedia);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaVersion, setMediaVersion] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Try Express API
      try {
        const res = await fetch(`/api/media?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<MediaCatalog>(res, { gallery: [], logo: [], video: [] });
          if (data && (data.gallery?.length || data.logo?.length || data.video?.length)) {
            setMedia(data);
            setMediaVersion(Date.now());
            try {
              localStorage.setItem('vb_media_catalog', JSON.stringify(data));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 2. Try static /data/mediaCatalog.json
      try {
        const res = await fetch(`/data/mediaCatalog.json?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<MediaCatalog>(res, { gallery: [], logo: [], video: [] });
          if (data && (data.gallery?.length || data.logo?.length || data.video?.length)) {
            setMedia(data);
            setMediaVersion(Date.now());
            try {
              localStorage.setItem('vb_media_catalog', JSON.stringify(data));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 3. Try static /mediaCatalog.json
      try {
        const res = await fetch(`/mediaCatalog.json?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<MediaCatalog>(res, { gallery: [], logo: [], video: [] });
          if (data && (data.gallery?.length || data.logo?.length || data.video?.length)) {
            setMedia(data);
            setMediaVersion(Date.now());
            try {
              localStorage.setItem('vb_media_catalog', JSON.stringify(data));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 4. Try localStorage
      try {
        const stored = localStorage.getItem('vb_media_catalog');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.gallery?.length || parsed.logo?.length || parsed.video?.length)) {
            setMedia(parsed);
            setMediaVersion(Date.now());
            return;
          }
        }
      } catch (e) {}

      // 5. Try window.__DEFAULT_MEDIA__
      const def = typeof window !== 'undefined' ? (window as any).__DEFAULT_MEDIA__ : null;
      if (def && (def.gallery?.length || def.logo?.length || def.video?.length)) {
        setMedia(def);
        setMediaVersion(Date.now());
        try {
          localStorage.setItem('vb_media_catalog', JSON.stringify(def));
        } catch (e) {}
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener catálogo multimedia');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const uploadMedia = useCallback(async (
    file: File,
    folder: MediaFolder,
    customFilename?: string
  ): Promise<{ success: boolean; path?: string; error?: string; timestamp?: number }> => {
    setError(null);
    setUploading(true);

    const validation = validateMediaFile(file, folder, customFilename);
    if (!validation.valid) {
      setError(validation.error || 'Archivo inválido');
      setUploading(false);
      return { success: false, error: validation.error };
    }

    try {
      const fileBase64 = await readFileAsBase64(file);
      const filename = customFilename || file.name;

      let returnedPath = '';
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folder,
            filename,
            fileBase64,
            mimeType: file.type
          })
        });

        const data = await safeParseJson(res, { success: false, error: 'Empty server response' });
        if (res.ok && data.success) {
          returnedPath = data.path;
        }
      } catch (e) {
        // Node backend not reachable on static hosting
      }

      const now = Date.now();
      const targetPath = returnedPath || (
        folder === 'gallery' ? `/images/gallery/${filename}` :
        folder === 'logo' ? `/images/logo/${filename}` :
        `/images/video/${filename}`
      );

      const newItem: MediaFileItem = {
        filename,
        path: targetPath,
        size: file.size,
        updatedAt: now,
        urlWithCacheBuster: `${targetPath}?v=${now}`
      };

      setMedia(prev => {
        const currentList = prev[folder] || [];
        const nextList = [newItem, ...currentList.filter(f => f.filename !== filename)];
        const updated: MediaCatalog = {
          ...prev,
          [folder]: nextList
        };
        try {
          localStorage.setItem('vb_media_catalog', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      setMediaVersion(now);

      return {
        success: true,
        path: targetPath,
        timestamp: now
      };
    } catch (err: any) {
      const msg = err.message || 'Error al procesar la subida del archivo';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteMedia = useCallback(async (
    folder: MediaFolder,
    filename: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      try {
        await fetch('/api/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder, filename })
        });
      } catch (e) {}

      const now = Date.now();
      setMedia(prev => {
        const currentList = prev[folder] || [];
        const nextList = currentList.filter(f => f.filename !== filename);
        const updated: MediaCatalog = {
          ...prev,
          [folder]: nextList
        };
        try {
          localStorage.setItem('vb_media_catalog', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      setMediaVersion(now);
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Error al eliminar archivo';
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const bustUrl = useCallback((url: string) => {
    return getCacheBustedUrl(url, mediaVersion);
  }, [mediaVersion]);

  return {
    media,
    loading,
    uploading,
    error,
    mediaVersion,
    fetchMedia,
    uploadMedia,
    deleteMedia,
    bustUrl,
  };
}

const cmsBroadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('vb_cms_sync') : null;

const getInitialConfig = (): SiteConfig | null => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('vb_config_sync');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.hero) return parsed;
      }
    } catch (e) {}
    const def = (window as any).__DEFAULT_VB_CONFIG__;
    if (def && def.hero) return def;
  }
  return null;
};

export function useCMS() {
  const [config, setConfig] = useState<SiteConfig | null>(getInitialConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionTimestamp, setVersionTimestamp] = useState<number>(Date.now());

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Try Express API
      try {
        const res = await fetch(`/api/config?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<SiteConfig | null>(res, null);
          if (data && data.hero) {
            setConfig(data);
            try {
              localStorage.setItem('vb_config_sync', JSON.stringify(data));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 2. Try static /data/config.json
      try {
        const res = await fetch(`/data/config.json?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<SiteConfig | null>(res, null);
          if (data && data.hero) {
            setConfig(data);
            try {
              localStorage.setItem('vb_config_sync', JSON.stringify(data));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 3. Try static /config.json
      try {
        const res = await fetch(`/config.json?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<SiteConfig | null>(res, null);
          if (data && data.hero) {
            setConfig(data);
            try {
              localStorage.setItem('vb_config_sync', JSON.stringify(data));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 4. Fallback to local draft
      const localDraft = localStorage.getItem('vb_config_sync');
      if (localDraft) {
        try {
          const parsed = JSON.parse(localDraft);
          if (parsed && parsed.hero) {
            setConfig(parsed);
            return;
          }
        } catch (e) {}
      }

      // 5. Fallback to window.__DEFAULT_VB_CONFIG__
      const def = typeof window !== 'undefined' ? (window as any).__DEFAULT_VB_CONFIG__ : null;
      if (def && def.hero) {
        setConfig(def);
        try {
          localStorage.setItem('vb_config_sync', JSON.stringify(def));
        } catch (e) {}
        return;
      }
    } catch (err: any) {
      console.warn('Network config fetch failed, using local backup', err);
      setError(err.message || 'Failed to fetch config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'vb_config_sync' && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', onStorage);

    const onBroadcast = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CONFIG_UPDATED' && e.data.config) {
        setConfig(e.data.config);
        setVersionTimestamp(e.data.timestamp || Date.now());
      }
    };
    if (cmsBroadcast) {
      cmsBroadcast.addEventListener('message', onBroadcast);
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      if (cmsBroadcast) {
        cmsBroadcast.removeEventListener('message', onBroadcast);
      }
    };
  }, [fetchConfig]);

  const saveConfig = useCallback(async (newConfig: SiteConfig): Promise<boolean> => {
    setSaving(true);
    // Instant optimistic DOM update
    setConfig(newConfig);
    const now = Date.now();
    setVersionTimestamp(now);
    localStorage.setItem('vb_config_sync', JSON.stringify(newConfig));

    if (cmsBroadcast) {
      cmsBroadcast.postMessage({ type: 'CONFIG_UPDATED', config: newConfig, timestamp: now });
    }

    try {
      const res = await fetch(`/api/config/save?_cb=${now}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(newConfig),
      }).catch(() => null);

      // Trigger automatic SiteGround SuperCacher purge
      try {
        fetch(`/purge-cache.php?_cb=${now}`, {
          cache: 'no-store',
          headers: { 'X-Purge-Cache': 'true', 'Cache-Control': 'no-cache' }
        }).catch(() => {});
      } catch (e) {}

      if (res && res.ok) {
        return true;
      }
      // On static hosts (Cloudflare Pages, SiteGround without node), localStorage & broadcast succeeded
      return true;
    } catch (err: any) {
      console.warn("Save note:", err.message);
      return true;
    } finally {
      setSaving(false);
    }
  }, []);

  // CRUD helpers
  const addService = useCallback(async (service: ServiceItem) => {
    if (!config) return;
    const updated = {
      ...config,
      services: [...(config.services || []), service]
    };
    return saveConfig(updated);
  }, [config, saveConfig]);

  const editService = useCallback(async (index: number, service: ServiceItem) => {
    if (!config) return;
    const services = [...(config.services || [])];
    services[index] = service;
    return saveConfig({ ...config, services });
  }, [config, saveConfig]);

  const deleteService = useCallback(async (index: number) => {
    if (!config) return;
    const services = [...(config.services || [])];
    services.splice(index, 1);
    return saveConfig({ ...config, services });
  }, [config, saveConfig]);

  const addPortfolio = useCallback(async (item: PortfolioItem) => {
    if (!config) return;
    const updated = {
      ...config,
      portfolio: [...(config.portfolio || []), item]
    };
    return saveConfig(updated);
  }, [config, saveConfig]);

  const editPortfolio = useCallback(async (index: number, item: PortfolioItem) => {
    if (!config) return;
    const portfolio = [...(config.portfolio || [])];
    portfolio[index] = item;
    return saveConfig({ ...config, portfolio });
  }, [config, saveConfig]);

  const deletePortfolio = useCallback(async (index: number) => {
    if (!config) return;
    const portfolio = [...(config.portfolio || [])];
    portfolio.splice(index, 1);
    return saveConfig({ ...config, portfolio });
  }, [config, saveConfig]);

  const addHome = useCallback(async (home: HomeProject) => {
    if (!config) return;
    const projects = [...(config.homes?.projects || []), home];
    const updated = {
      ...config,
      homes: {
        headline: config.homes?.headline || 'Homes We’ve Built',
        description: config.homes?.description || '',
        projects
      }
    };
    return saveConfig(updated);
  }, [config, saveConfig]);

  const editHome = useCallback(async (index: number, home: HomeProject) => {
    if (!config) return;
    const projects = [...(config.homes?.projects || [])];
    projects[index] = home;
    const updated = {
      ...config,
      homes: {
        headline: config.homes?.headline || 'Homes We’ve Built',
        description: config.homes?.description || '',
        projects
      }
    };
    return saveConfig(updated);
  }, [config, saveConfig]);

  const deleteHome = useCallback(async (index: number) => {
    if (!config) return;
    const projects = [...(config.homes?.projects || [])];
    projects.splice(index, 1);
    const updated = {
      ...config,
      homes: {
        headline: config.homes?.headline || 'Homes We’ve Built',
        description: config.homes?.description || '',
        projects
      }
    };
    return saveConfig(updated);
  }, [config, saveConfig]);

  const bustUrl = useCallback((url: string) => {
    return getCacheBustedUrl(url, versionTimestamp);
  }, [versionTimestamp]);

  return {
    config,
    loading,
    saving,
    error,
    versionTimestamp,
    saveConfig,
    addService,
    editService,
    deleteService,
    addPortfolio,
    editPortfolio,
    deletePortfolio,
    addHome,
    editHome,
    deleteHome,
    bustUrl,
    refetch: fetchConfig,
    fetchConfig,
  };
}

const getInitialLeads = (): Lead[] => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('vb_crm_leads');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    const def = (window as any).__DEFAULT_LEADS__;
    if (Array.isArray(def) && def.length > 0) return def;
  }
  return [];
};

/**
 * useCRM Hook
 */
export function useCRM() {
  const [leads, setLeads] = useState<Lead[]>(getInitialLeads);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Try Express API
      try {
        const res = await fetch(`/api/crm/leads?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<Lead[]>(res, []);
          if (Array.isArray(data) && data.length > 0) {
            setLeads(data);
            try {
              localStorage.setItem('vb_crm_leads', JSON.stringify(data));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 2. Try static /data/leads.json
      try {
        const res = await fetch(`/data/leads.json?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<Lead[]>(res, []);
          if (Array.isArray(data) && data.length > 0) {
            setLeads(data);
            try {
              localStorage.setItem('vb_crm_leads', JSON.stringify(data));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 3. Try static /leads.json
      try {
        const res = await fetch(`/leads.json?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<Lead[]>(res, []);
          if (Array.isArray(data) && data.length > 0) {
            setLeads(data);
            try {
              localStorage.setItem('vb_crm_leads', JSON.stringify(data));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 4. Try localStorage
      try {
        const stored = localStorage.getItem('vb_crm_leads');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLeads(parsed);
            return;
          }
        }
      } catch (e) {}

      // 5. Try window.__DEFAULT_LEADS__
      const def = typeof window !== 'undefined' ? (window as any).__DEFAULT_LEADS__ : null;
      if (Array.isArray(def) && def.length > 0) {
        setLeads(def);
        try {
          localStorage.setItem('vb_crm_leads', JSON.stringify(def));
        } catch (e) {}
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const captureLead = useCallback(async (leadData: Partial<Lead>): Promise<boolean> => {
    const newLead: Lead = {
      id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      status: leadData.status || 'New',
      firstName: leadData.firstName || '',
      lastName: leadData.lastName || '',
      email: leadData.email || '',
      phone: leadData.phone || '',
      service: leadData.service || 'Commercial and Residential Project Management',
      projectType: leadData.projectType || '',
      timeline: leadData.timeline || '',
      budget: leadData.budget || '',
      description: leadData.description || '',
      source: leadData.source || 'Website',
      notes: leadData.notes || '',
      visitRequested: leadData.visitRequested || false,
      visitDate: leadData.visitDate || '',
      visitTimeSlot: leadData.visitTimeSlot || '',
      visitAddress: leadData.visitAddress || '',
      visitCity: leadData.visitCity || '',
      visitZip: leadData.visitZip || '',
      visitNotes: leadData.visitNotes || '',
      visitStatus: leadData.visitStatus || (leadData.visitRequested ? 'Pending' : undefined),
      history: leadData.history || [
        {
          timestamp: new Date().toISOString(),
          action: 'Lead Created',
          details: 'Inquiry submitted'
        }
      ],
      ...leadData
    };

    setLeads(prev => {
      const updated = [newLead, ...prev];
      try {
        localStorage.setItem('vb_crm_leads', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/crm/leads?_cb=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(newLead)
      });
    } catch (e) {}

    return true;
  }, []);

  const updateLeadStatus = useCallback(async (id: string, newStatus: Lead['status'], note?: string) => {
    setLeads(prev => {
      const updated = prev.map(l => {
        if (l.id === id) {
          const hist = [...(l.history || [])];
          hist.unshift({
            timestamp: new Date().toISOString(),
            action: 'Status Changed',
            details: `Status set to ${newStatus}${note ? ` - Note: ${note}` : ''}`
          });
          return { ...l, status: newStatus, notes: note ? `${l.notes ? l.notes + '\n' : ''}${note}` : l.notes, history: hist };
        }
        return l;
      });
      try {
        localStorage.setItem('vb_crm_leads', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/crm/leads/${id}?_cb=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ status: newStatus, noteAdded: note })
      });
    } catch (e) {}

    return true;
  }, []);

  const addLeadNote = useCallback(async (id: string, note: string) => {
    setLeads(prev => {
      const updated = prev.map(l => {
        if (l.id === id) {
          const hist = [...(l.history || [])];
          hist.unshift({
            timestamp: new Date().toISOString(),
            action: 'Note Added',
            details: note
          });
          return { ...l, notes: `${l.notes ? l.notes + '\n' : ''}${note}`, history: hist };
        }
        return l;
      });
      try {
        localStorage.setItem('vb_crm_leads', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/crm/leads/${id}?_cb=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ noteAdded: note })
      });
    } catch (e) {}

    return true;
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    setLeads(prev => {
      const updated = prev.filter(l => l.id !== id);
      try {
        localStorage.setItem('vb_crm_leads', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/crm/leads/${id}?_cb=${Date.now()}`, {
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
    } catch (e) {}

    return true;
  }, []);

  const updateLeadVisit = useCallback(async (id: string, visitUpdates: Partial<Lead>) => {
    setLeads(prev => {
      const updated = prev.map(l => {
        if (l.id === id) {
          const hist = [...(l.history || [])];
          hist.unshift({
            timestamp: new Date().toISOString(),
            action: 'Visit Updated',
            details: `Visit updated: ${visitUpdates.visitDate || l.visitDate || ''} (${visitUpdates.visitTimeSlot || l.visitTimeSlot || ''}) - Status: ${visitUpdates.visitStatus || l.visitStatus || ''}`
          });
          return { ...l, ...visitUpdates, history: hist };
        }
        return l;
      });
      try {
        localStorage.setItem('vb_crm_leads', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/crm/leads/${id}?_cb=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(visitUpdates)
      });
    } catch (e) {}

    return true;
  }, []);

  return {
    leads,
    loading,
    error,
    captureLead,
    updateLeadStatus,
    updateLeadVisit,
    addLeadNote,
    deleteLead,
    refetch: fetchLeads,
  };
}

const getInitialPortfolio = (): PortfolioDataItem[] => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('vb_portfolio_sync');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [...parsed].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
        }
      }
    } catch (e) {}
    const def = (window as any).__DEFAULT_PORTFOLIO__;
    if (Array.isArray(def) && def.length > 0) {
      return [...def].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    }
  }
  return [];
};

/**
 * usePortfolioData Hook
 * Persistently reads and writes to portfolioData.json
 */
export function usePortfolioData() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioDataItem[]>(getInitialPortfolio);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versionTimestamp, setVersionTimestamp] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Try Express API
      try {
        const res = await fetch(`/api/portfolio?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<PortfolioDataItem[]>(res, []);
          if (Array.isArray(data) && data.length > 0) {
            const sorted = [...data].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
            setPortfolioItems(sorted);
            setVersionTimestamp(Date.now());
            try {
              localStorage.setItem('vb_portfolio_sync', JSON.stringify(sorted));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 2. Try static /data/portfolioData.json
      try {
        const res = await fetch(`/data/portfolioData.json?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<PortfolioDataItem[]>(res, []);
          if (Array.isArray(data) && data.length > 0) {
            const sorted = [...data].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
            setPortfolioItems(sorted);
            setVersionTimestamp(Date.now());
            try {
              localStorage.setItem('vb_portfolio_sync', JSON.stringify(sorted));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 3. Try static /portfolioData.json
      try {
        const res = await fetch(`/portfolioData.json?_cb=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        });
        if (res.ok) {
          const data = await safeParseJson<PortfolioDataItem[]>(res, []);
          if (Array.isArray(data) && data.length > 0) {
            const sorted = [...data].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
            setPortfolioItems(sorted);
            setVersionTimestamp(Date.now());
            try {
              localStorage.setItem('vb_portfolio_sync', JSON.stringify(sorted));
            } catch (e) {}
            return;
          }
        }
      } catch (e) {}

      // 4. Try localStorage
      try {
        const stored = localStorage.getItem('vb_portfolio_sync');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sorted = [...parsed].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
            setPortfolioItems(sorted);
            setVersionTimestamp(Date.now());
            return;
          }
        }
      } catch (e) {}

      // 5. Try window.__DEFAULT_PORTFOLIO__
      const def = typeof window !== 'undefined' ? (window as any).__DEFAULT_PORTFOLIO__ : null;
      if (Array.isArray(def) && def.length > 0) {
        const sorted = [...def].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
        setPortfolioItems(sorted);
        setVersionTimestamp(Date.now());
        try {
          localStorage.setItem('vb_portfolio_sync', JSON.stringify(sorted));
        } catch (e) {}
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener portfolioData.json');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const updatePortfolioItem = useCallback(async (
    item: PortfolioDataItem
  ): Promise<{ success: boolean; item?: PortfolioDataItem; error?: string }> => {
    setSaving(true);
    setError(null);

    const now = Date.now();
    let nextList: PortfolioDataItem[] = [];

    // Instant optimistic update in React DOM strictly sorted by numeric ID
    setPortfolioItems(prev => {
      const idx = prev.findIndex(p => String(p.id) === String(item.id));
      if (idx !== -1) {
        nextList = [...prev];
        nextList[idx] = { ...nextList[idx], ...item };
      } else {
        nextList = [...prev, item];
      }
      nextList.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      try {
        localStorage.setItem('vb_portfolio_sync', JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });

    setVersionTimestamp(now);

    // Live sync draft with index.html in horizontal order & broadcast
    try {
      const draftStr = localStorage.getItem('vb_config_sync');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        draft.portfolio = nextList.map((p: any) => ({
          id: String(p.id),
          url: p.imageUrl,
          imageUrl: p.imageUrl,
          title: p.title,
          location: p.categoryLocation ? p.categoryLocation.split('•').pop().trim() : 'Indianapolis, IN',
          categoryLocation: p.categoryLocation || 'General Construction',
          svc: p.categoryLocation ? p.categoryLocation.split('•')[0].trim() : 'Construction',
          description: p.description || ''
        }));
        localStorage.setItem('vb_config_sync', JSON.stringify(draft));
        if (cmsBroadcast) {
          cmsBroadcast.postMessage({ type: 'CONFIG_UPDATED', config: draft, timestamp: now });
        }
      }
    } catch (e) {}

    // API call in background
    try {
      await fetch(`/api/portfolio/update?_cb=${now}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(item),
      });
    } catch (e) {}

    setSaving(false);
    return { success: true, item };
  }, []);

  const addPortfolioItem = useCallback(async (
    item: PortfolioDataItem
  ): Promise<{ success: boolean; item?: PortfolioDataItem; error?: string }> => {
    return updatePortfolioItem(item);
  }, [updatePortfolioItem]);

  const deletePortfolioItem = useCallback(async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    setSaving(true);
    setError(null);
    const now = Date.now();
    let nextItems: PortfolioDataItem[] = [];

    setPortfolioItems(prev => {
      nextItems = prev.filter(p => String(p.id) !== String(id));
      try {
        localStorage.setItem('vb_portfolio_sync', JSON.stringify(nextItems));
      } catch (e) {}
      return nextItems;
    });

    setVersionTimestamp(now);

    // Live sync draft with index.html in horizontal order & broadcast
    try {
      const draftStr = localStorage.getItem('vb_config_sync');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        draft.portfolio = nextItems.map((p: any) => ({
          id: String(p.id),
          url: p.imageUrl,
          imageUrl: p.imageUrl,
          title: p.title,
          location: p.categoryLocation ? p.categoryLocation.split('•').pop().trim() : 'Indianapolis, IN',
          categoryLocation: p.categoryLocation || 'General Construction',
          svc: p.categoryLocation ? p.categoryLocation.split('•')[0].trim() : 'Construction',
          description: p.description || ''
        }));
        localStorage.setItem('vb_config_sync', JSON.stringify(draft));
        if (cmsBroadcast) {
          cmsBroadcast.postMessage({ type: 'CONFIG_UPDATED', config: draft, timestamp: now });
        }
      }
    } catch (e) {}

    try {
      await fetch(`/api/portfolio/${id}?_cb=${now}`, {
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
    } catch (e) {}

    setSaving(false);
    return { success: true };
  }, []);

  const bustUrl = useCallback((url: string) => {
    return getCacheBustedUrl(url, versionTimestamp);
  }, [versionTimestamp]);

  return {
    portfolioItems,
    loading,
    saving,
    error,
    versionTimestamp,
    fetchPortfolio,
    updatePortfolioItem,
    addPortfolioItem,
    deletePortfolioItem,
    bustUrl,
  };
}
