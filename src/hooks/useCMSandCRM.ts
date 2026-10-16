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

/**
 * useMediaManager Hook
 */
export function useMediaManager() {
  const [media, setMedia] = useState<MediaCatalog>({ gallery: [], logo: [], video: [] });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaVersion, setMediaVersion] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/media?_cb=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      if (res.ok) {
        const data = await safeParseJson<MediaCatalog>(res, { gallery: [], logo: [], video: [] });
        setMedia(data);
        setMediaVersion(Date.now());
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
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fallo al subir el archivo');
      }

      const now = data.timestamp || Date.now();
      setMediaVersion(now);
      await fetchMedia();

      return {
        success: true,
        path: data.path,
        timestamp: now
      };
    } catch (err: any) {
      const msg = err.message || 'Error al procesar la subida del archivo';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setUploading(false);
    }
  }, [fetchMedia]);

  const deleteMedia = useCallback(async (
    folder: MediaFolder,
    filename: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, filename })
      });
      const data = await safeParseJson(res, { success: false });
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar archivo');
      }

      setMediaVersion(Date.now());
      await fetchMedia();
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Error al eliminar archivo';
      setError(msg);
      return { success: false, error: msg };
    }
  }, [fetchMedia]);

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

export function useCMS() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionTimestamp, setVersionTimestamp] = useState<number>(Date.now());

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/config?_cb=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      if (res.ok) {
        const data = await safeParseJson<SiteConfig | null>(res, null);
        if (data) {
          setConfig(data);
          localStorage.setItem('vb_config_sync', JSON.stringify(data));
          return;
        }
      }
    } catch (err: any) {
      console.warn('Network config fetch failed, using local backup', err);
      setError(err.message || 'Failed to fetch config');
    } finally {
      setLoading(false);
    }

    // Fallback to local draft only if offline or network failed
    const localDraft = localStorage.getItem('vb_config_sync');
    if (localDraft) {
      try {
        setConfig(JSON.parse(localDraft));
      } catch (e) {}
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
      });
      const data = await safeParseJson(res, { success: res.ok });
      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.error || 'Server rejected config save');
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Save failed');
      return false;
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

/**
 * useCRM Hook
 */
export function useCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/leads?_cb=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      if (res.ok) {
        const data = await safeParseJson<Lead[]>(res, []);
        setLeads(data);
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
    try {
      const res = await fetch(`/api/crm/leads?_cb=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        body: JSON.stringify(leadData)
      });
      if (res.ok) {
        const result = await safeParseJson(res, { success: true });
        if (result.lead) {
          setLeads(prev => [result.lead, ...prev]);
        } else {
          fetchLeads();
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [fetchLeads]);

  const updateLeadStatus = useCallback(async (id: string, newStatus: Lead['status'], note?: string) => {
    try {
      const res = await fetch(`/api/crm/leads/${id}?_cb=${Date.now()}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        body: JSON.stringify({ status: newStatus, noteAdded: note })
      });
      if (res.ok) {
        const result = await safeParseJson(res, { success: true });
        if (result.lead) {
          setLeads(prev => prev.map(l => l.id === id ? result.lead : l));
        } else {
          fetchLeads();
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [fetchLeads]);

  const addLeadNote = useCallback(async (id: string, note: string) => {
    try {
      const res = await fetch(`/api/crm/leads/${id}?_cb=${Date.now()}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        body: JSON.stringify({ noteAdded: note })
      });
      if (res.ok) {
        const result = await safeParseJson(res, { success: true });
        if (result.lead) {
          setLeads(prev => prev.map(l => l.id === id ? result.lead : l));
        } else {
          fetchLeads();
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [fetchLeads]);

  const deleteLead = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/crm/leads/${id}?_cb=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== id));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  const updateLeadVisit = useCallback(async (id: string, visitUpdates: Partial<Lead>) => {
    try {
      const res = await fetch(`/api/crm/leads/${id}?_cb=${Date.now()}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        body: JSON.stringify(visitUpdates)
      });
      if (res.ok) {
        const result = await safeParseJson(res, { success: true });
        if (result.lead) {
          setLeads(prev => prev.map(l => l.id === id ? result.lead : l));
        } else {
          fetchLeads();
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [fetchLeads]);

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

/**
 * usePortfolioData Hook
 * Persistently reads and writes to portfolioData.json
 */
export function usePortfolioData() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionTimestamp, setVersionTimestamp] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portfolio?_cb=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      if (res.ok) {
        const data = await safeParseJson<PortfolioDataItem[]>(res, []);
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
          : [];
        setPortfolioItems(sorted);
        setVersionTimestamp(Date.now());
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

    // Instant optimistic update in React DOM strictly sorted by numeric ID
    setPortfolioItems(prev => {
      const idx = prev.findIndex(p => String(p.id) === String(item.id));
      let next: PortfolioDataItem[];
      if (idx !== -1) {
        next = [...prev];
        next[idx] = { ...next[idx], ...item };
      } else {
        next = [...prev, item];
      }
      return next.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    });

    try {
      const now = Date.now();
      const res = await fetch(`/api/portfolio/update?_cb=${now}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(item),
      });
      const data = await safeParseJson(res, { success: res.ok, item });
      if (res.ok && data.success) {
        setVersionTimestamp(now);
        const resolvedItems = Array.isArray(data.items)
          ? [...data.items].sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
          : undefined;
        if (resolvedItems) {
          setPortfolioItems(resolvedItems);
        }

        // Live sync draft with index.html in horizontal order & broadcast
        try {
          const draftStr = localStorage.getItem('vb_config_sync');
          if (draftStr) {
            const draft = JSON.parse(draftStr);
            const sourceList = resolvedItems || portfolioItems;
            draft.portfolio = sourceList.map((p: any) => ({
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

        return { success: true, item: data.item || item };
      } else {
        throw new Error(data.error || 'Error al actualizar portfolio');
      }
    } catch (err: any) {
      setError(err.message);
      fetchPortfolio();
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, [fetchPortfolio]);

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
    try {
      const nextItems = portfolioItems.filter(p => String(p.id) !== String(id));
      setPortfolioItems(nextItems);
      const res = await fetch(`/api/portfolio/${id}?_cb=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
      });
      const data = await safeParseJson(res, { success: res.ok });
      if (res.ok && data.success !== false) {
        setVersionTimestamp(Date.now());
        return { success: true };
      }
      throw new Error('Failed to delete portfolio item');
    } catch (err: any) {
      setError(err.message);
      fetchPortfolio();
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, [portfolioItems, fetchPortfolio]);

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
