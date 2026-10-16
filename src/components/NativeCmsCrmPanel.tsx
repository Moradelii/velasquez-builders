import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  useCMS,
  useCRM,
  useMediaManager,
  usePortfolioData,
  PortfolioDataItem,
  HomeProject,
  ServiceItem,
  ProcessStep,
  TeamMember,
  TestimonialItem,
  FeatureItem,
  Lead
} from '../hooks/useCMSandCRM';
import { formatFileSize, MediaFolder, getCacheBustedUrl, validateMediaFile } from '../utils/mediaValidation';
import {
  LayoutDashboard,
  FileText,
  Zap,
  Wrench,
  Image,
  Home,
  RefreshCw,
  Users,
  Mail,
  Star,
  Sparkles,
  Sliders,
  FolderOpen,
  Calendar,
  Eye,
  Download,
  Upload,
  LogOut,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  Trash2,
  Plus,
  ChevronRight,
  Layers,
  Compass,
  ExternalLink,
  HardHat,
  Camera,
  X,
  Check,
  Search,
  ShieldCheck,
  Edit3,
  Settings,
  CreditCard,
  MessageSquare,
  Building2
} from 'lucide-react';

interface NativeCmsCrmPanelProps {
  isFullScreen?: boolean;
  onClose?: () => void;
}

type NavSection =
  | 'dashboard'
  | 'info'
  | 'hero'
  | 'services'
  | 'portfolio'
  | 'homes'
  | 'process'
  | 'team'
  | 'quote'
  | 'testimonials'
  | 'features'
  | 'footer'
  | 'media'
  | 'crm';

export default function NativeCmsCrmPanel({ isFullScreen = false, onClose }: NativeCmsCrmPanelProps) {
  const { config, saving: cmsSaving, saveConfig, fetchConfig } = useCMS();
  const { leads, updateLeadStatus, updateLeadVisit, addLeadNote, deleteLead, captureLead } = useCRM();
  const { media, uploading: mediaUploading, uploadMedia, deleteMedia, fetchMedia } = useMediaManager();
  const {
    portfolioItems,
    saving: portfolioSaving,
    updatePortfolioItem,
    addPortfolioItem,
    deletePortfolioItem,
    versionTimestamp: portfolioVersion,
    fetchPortfolio
  } = usePortfolioData();

  // Navigation state
  const [activeTab, setActiveTab] = useState<NavSection>('dashboard');

  // Notification Banner
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Hidden File Inputs & Upload Target Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<MediaFolder>('gallery');
  const [uploadTargetFilename, setUploadTargetFilename] = useState<string | undefined>(undefined);
  const [targetPortfolioIdForUpload, setTargetPortfolioIdForUpload] = useState<string | null>(null);
  const [targetFieldForUpload, setTargetFieldForUpload] = useState<string | null>(null);

  // Search & Filter for Portfolio
  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [selectedPortfolioCategory, setSelectedPortfolioCategory] = useState('ALL');

  // Media Tab Sub-selection
  const [mediaSubFolder, setMediaSubFolder] = useState<MediaFolder>('gallery');

  // CRM Visits View & Scheduling Modal state
  const [crmViewFilter, setCrmViewFilter] = useState<'all' | 'visits'>('all');
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitFormFirstName, setVisitFormFirstName] = useState('');
  const [visitFormLastName, setVisitFormLastName] = useState('');
  const [visitFormPhone, setVisitFormPhone] = useState('');
  const [visitFormEmail, setVisitFormEmail] = useState('');
  const [visitFormAddress, setVisitFormAddress] = useState('');
  const [visitFormCity, setVisitFormCity] = useState('Indianapolis');
  const [visitFormDate, setVisitFormDate] = useState('');
  const [visitFormTimeSlot, setVisitFormTimeSlot] = useState('Morning (8:00 AM - 12:00 PM)');
  const [visitFormService, setVisitFormService] = useState('Commercial and Residential Project Management');
  const [visitFormNotes, setVisitFormNotes] = useState('');
  const [isVisitSaving, setIsVisitSaving] = useState(false);

  // Homes Gallery Quick-Picker State: { homeIdx: number, slot: 'main' | number } | null
  const [homeGalleryPicker, setHomeGalleryPicker] = useState<{ homeIdx: number; slot: 'main' | number } | null>(null);

  // =========================================================================
  // 1. MODAL: "Edit portfolio" (Faithful to design)
  // =========================================================================
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioDataItem | null>(null);
  const [isNewPortfolioItem, setIsNewPortfolioItem] = useState(false);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategoryLocation, setFormCategoryLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isModalSaving, setIsModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleOpenEditModal = (item: PortfolioDataItem) => {
    setIsNewPortfolioItem(false);
    setEditingPortfolioItem(item);
    setFormImageUrl(item.imageUrl);
    setFormTitle(item.title);
    setFormCategoryLocation(item.categoryLocation);
    setFormDescription(item.description);
    setModalError(null);
  };

  const handleOpenNewPortfolioModal = () => {
    setIsNewPortfolioItem(true);
    const nextId = String(portfolioItems.length + 1);
    const newItem: PortfolioDataItem = {
      id: nextId,
      imageUrl: '/images/gallery/01.webp',
      title: '',
      categoryLocation: 'New Construction & Additions',
      description: '',
    };
    setEditingPortfolioItem(newItem);
    setFormImageUrl(newItem.imageUrl);
    setFormTitle('');
    setFormCategoryLocation(newItem.categoryLocation);
    setFormDescription('');
    setModalError(null);
  };

  const handleCloseModal = () => {
    setEditingPortfolioItem(null);
    setModalError(null);
    setIsModalSaving(false);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPortfolioItem) return;

    setIsModalSaving(true);
    setModalError(null);

    let cleanImg = formImageUrl.trim();
    if (cleanImg.startsWith('public/')) {
      cleanImg = '/' + cleanImg.slice(7);
    }
    if (!cleanImg.startsWith('/') && !cleanImg.startsWith('http')) {
      cleanImg = '/' + cleanImg;
    }

    const itemToSave: PortfolioDataItem = {
      id: editingPortfolioItem.id || String(Date.now()),
      imageUrl: cleanImg,
      title: formTitle.trim(),
      categoryLocation: formCategoryLocation.trim(),
      description: formDescription.trim(),
    };

    try {
      const res = await updatePortfolioItem(itemToSave);
      if (res.success) {
        setNotice({
          type: 'success',
          message: `Portfolio item #${itemToSave.id} ("${itemToSave.title}") saved in portfolioData.json. Live preview updated.`
        });
        handleCloseModal();
      } else {
        setModalError(res.error || 'Failed to update portfolioData.json');
      }
    } catch (err: any) {
      setModalError(err.message || 'Error communicating with server');
    } finally {
      setIsModalSaving(false);
    }
  };

  // =========================================================================
  // 2. FILE UPLOAD HANDLING (Zero false positives, webp, jpeg, png, mp4)
  // =========================================================================
  const triggerFileUpload = (
    folder: MediaFolder,
    targetFilename?: string,
    portfolioId?: string,
    fieldIdentifier?: string
  ) => {
    setUploadTargetFolder(folder);
    setUploadTargetFilename(targetFilename);
    setTargetPortfolioIdForUpload(portfolioId || null);
    setTargetFieldForUpload(fieldIdentifier || null);

    if (fileInputRef.current) {
      if (folder === 'gallery') {
        fileInputRef.current.accept = '.webp,.jpeg,.jpg,.png,image/webp,image/jpeg,image/png';
      } else if (folder === 'logo') {
        fileInputRef.current.accept = '.png,.ico,image/png,image/x-icon';
      } else if (folder === 'video') {
        fileInputRef.current.accept = '.mp4,video/mp4';
      }
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMediaFile(file, uploadTargetFolder, uploadTargetFilename);
    if (!validation.valid) {
      setNotice({
        type: 'error',
        message: validation.error || 'File validation failed'
      });
      return;
    }

    setNotice({
      type: 'info',
      message: `Uploading ${file.name} to /images/${uploadTargetFolder}...`
    });

    const res = await uploadMedia(file, uploadTargetFolder, uploadTargetFilename);
    if (res.success && res.path) {
      const now = Date.now();
      setNotice({
        type: 'success',
        message: `File saved cleanly to '${res.path}'. Cache-busting (?v=${now}) applied.`
      });

      // Target assignments
      if (editingPortfolioItem) {
        setFormImageUrl(res.path);
      } else if (targetPortfolioIdForUpload) {
        const itemToUpdate = portfolioItems.find(p => String(p.id) === String(targetPortfolioIdForUpload));
        if (itemToUpdate) {
          await updatePortfolioItem({
            ...itemToUpdate,
            imageUrl: res.path
          });
        }
      }

      // If targeted to a specific config field
      if (targetFieldForUpload && config) {
        if (targetFieldForUpload === 'heroImage') {
          saveConfig({ ...config, hero: { ...config.hero, imageUrl: res.path } });
        } else if (targetFieldForUpload === 'heroVideo') {
          saveConfig({ ...config, hero: { ...config.hero, videoUrl: res.path } });
        }
      }

      fetchPortfolio();
      fetchMedia();
    } else {
      setNotice({
        type: 'error',
        message: `Upload failed: ${res.error || 'Server error'}`
      });
    }
  };

  // =========================================================================
  // 3. GLOBAL "SAVE & PUBLISH" ACTION WITH DEBOUNCE
  // =========================================================================
  // Prevents excessive disk writes during rapid form input changes or repeated clicks
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Core publish routine
  const executeSaveAndPublish = useCallback(async (currentConfig = config) => {
    if (!currentConfig) return;
    try {
      const ok = await saveConfig(currentConfig);
      if (ok) {
        setNotice({
          type: 'success',
          message: `LIVE SYNC SUCCESS: All sections published to config.json and portfolioData.json! (v=${Date.now()})`
        });
      } else {
        setNotice({
          type: 'error',
          message: 'Error publishing configuration'
        });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: `Error: ${err.message}`
      });
    } finally {
      setIsDebouncing(false);
    }
  }, [config, saveConfig]);

  // Debounced trigger: collapses rapid calls within 800ms into a single write
  const handleSaveAndPublish = useCallback((delay = 800) => {
    if (!config) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsDebouncing(true);

    debounceTimerRef.current = setTimeout(() => {
      executeSaveAndPublish(config);
      debounceTimerRef.current = null;
    }, delay);
  }, [config, executeSaveAndPublish]);

  // Immediate force publish on explicit button click if already debouncing or forced
  const handleDirectSaveAndPublish = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    executeSaveAndPublish(config);
  }, [config, executeSaveAndPublish]);

  // Cleanup pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Export config as JSON
  const handleExportConfig = () => {
    if (!config) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `velasquez-builders-config-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Manual SiteGround cache purge
  const handlePurgeCache = async () => {
    try {
      const now = Date.now();
      await fetch(`/purge-cache.php?_v=${now}`, {
        cache: 'no-store',
        headers: {
          'X-Purge-Cache': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      setNotice({
        type: 'success',
        message: '🧹 SiteGround SuperCacher dynamic cache purge sent successfully!'
      });
    } catch (e: any) {
      setNotice({
        type: 'info',
        message: '🧹 SiteGround cache purge pinged.'
      });
    }
  };

  // Trigger Import config
  const handleImportClick = () => {
    if (importInputRef.current) {
      importInputRef.current.value = '';
      importInputRef.current.click();
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const ok = await saveConfig(parsed);
        if (ok) {
          setNotice({ type: 'success', message: 'Configuration imported and saved successfully.' });
        }
      } catch (err) {
        setNotice({ type: 'error', message: 'Invalid JSON file format.' });
      }
    };
    reader.readAsText(file);
  };

  // Reset to server defaults
  const handleResetToDefault = async () => {
    if (window.confirm('Reset draft to current server configuration?')) {
      localStorage.removeItem('vb_config_sync');
      await fetchConfig();
      await fetchPortfolio();
      setNotice({ type: 'info', message: 'Draft reset to server state.' });
    }
  };

  // Filtered portfolio list, strictly sorted by numeric ID 1 to 30
  const filteredPortfolio = portfolioItems
    .filter(item => {
      const matchesSearch =
        (item.title || '').toLowerCase().includes(portfolioSearch.toLowerCase()) ||
        (item.categoryLocation || '').toLowerCase().includes(portfolioSearch.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(portfolioSearch.toLowerCase());
      const matchesCategory =
        selectedPortfolioCategory === 'ALL' ||
        (item.categoryLocation || '').toLowerCase().includes(selectedPortfolioCategory.toLowerCase());
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

  return (
    <div className={`flex w-full ${isFullScreen ? 'min-h-screen h-screen' : 'min-h-[850px]'} bg-slate-950 text-slate-100 font-sans overflow-hidden select-text`}>
      {/* Hidden upload inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
      />
      <input
        type="file"
        ref={importInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* =====================================================================
          LEFT SIDEBAR (Faithful to VB Admin design)
      ====================================================================== */}
      <aside className="w-64 sm:w-72 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 z-20 select-none">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-wide leading-tight">VB Admin</h1>
              <p className="text-[11px] font-medium text-slate-400">Velasquez Builders Dashboard</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* SECTION: OVERVIEW */}
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Overview
            </p>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Dashboard</span>
            </button>
          </div>

          {/* SECTION: CONTENT */}
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Content
            </p>
            <nav className="space-y-1">
              {[
                { id: 'info', label: 'General Info', icon: <FileText className="w-4 h-4 text-slate-400" /> },
                { id: 'hero', label: 'Hero Section', icon: <Zap className="w-4 h-4 text-amber-400" /> },
                { id: 'services', label: 'Services', icon: <Wrench className="w-4 h-4 text-blue-400" /> },
                { id: 'portfolio', label: 'Portfolio', icon: <Image className="w-4 h-4 text-emerald-400" /> },
                { id: 'homes', label: 'Homes We’ve Built', icon: <Home className="w-4 h-4 text-emerald-400" /> },
                { id: 'process', label: 'Process', icon: <RefreshCw className="w-4 h-4 text-cyan-400" /> },
                { id: 'team', label: 'Our Team', icon: <Users className="w-4 h-4 text-purple-400" /> },
                { id: 'quote', label: 'Get a Quote', icon: <Mail className="w-4 h-4 text-indigo-400" /> },
                { id: 'testimonials', label: 'Testimonials', icon: <Star className="w-4 h-4 text-amber-400" /> },
                { id: 'features', label: 'Features', icon: <Sparkles className="w-4 h-4 text-teal-400" /> },
                { id: 'footer', label: 'Footer', icon: <Sliders className="w-4 h-4 text-slate-400" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as NavSection)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === item.id
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === 'portfolio' && (
                    <span className="ml-auto text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                      {portfolioItems.length}
                    </span>
                  )}
                  {item.id === 'homes' && config?.homes?.projects && (
                    <span className="ml-auto text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                      {config.homes.projects.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* SECTION: SYSTEM TOOLS */}
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              System Tools
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('media')}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'media'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>Media Assets (/public)</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('crm');
                  setCrmViewFilter('all');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'crm' && crmViewFilter === 'all'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>CRM Leads &amp; Pipeline</span>
                {leads.length > 0 && (
                  <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                    {leads.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('crm');
                  setCrmViewFilter('visits');
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'crm' && crmViewFilter === 'visits'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>On-Site Visits Schedule</span>
                {leads.filter(l => l.visitRequested).length > 0 && (
                  <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                    {leads.filter(l => l.visitRequested).length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Global Bottom Actions */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/95 space-y-2">
          {/* Yellow Preview Button */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all text-xs uppercase tracking-wide active:scale-[0.98]"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Site</span>
          </a>

          {/* Blue Export / Import Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportConfig}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-2 px-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Download current configuration JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={handleImportClick}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-2 px-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Upload configuration JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          </div>

          {/* SiteGround Cache Purge Button */}
          <button
            onClick={handlePurgeCache}
            className="w-full bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            title="Purge SiteGround SuperCacher and NGINX proxy dynamic cache"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Clear SiteGround Cache</span>
          </button>

          {/* Red Logout / Close Button */}
          <button
            onClick={() => {
              if (onClose) onClose();
              else window.location.href = '/';
            }}
            className="w-full bg-red-600/90 hover:bg-red-500 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Admin</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT AREA & TOP STATUS HEADER
      ====================================================================== */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between flex-shrink-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>{activeTab === 'dashboard' ? 'System Dashboard' : `Editing: ${activeTab}`}</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              | Velasquez Builders Native CMS &amp; CRM
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Sync Active status badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Live Sync Active</span>
            </div>

            {/* Save & Publish Emerald Button with Debounce Feedback */}
            <button
              onClick={() => handleDirectSaveAndPublish()}
              disabled={cmsSaving || portfolioSaving}
              className={`px-5 py-2 font-bold text-xs rounded-lg shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 active:scale-95 ${
                isDebouncing
                  ? 'bg-emerald-700 text-emerald-100 ring-2 ring-emerald-400/50 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
              } disabled:opacity-50`}
              title="Save and publish all configuration and portfolio data (debounced)"
            >
              {cmsSaving || portfolioSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Writing to Disk...</span>
                </>
              ) : isDebouncing ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                  <span>Syncing Draft...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>SAVE &amp; PUBLISH</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Global Notice Toast */}
        {notice && (
          <div
            className={`px-6 py-2.5 flex items-center justify-between text-xs font-medium border-b transition-all ${
              notice.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : notice.type === 'error'
                ? 'bg-red-950/90 border-red-500/40 text-red-200'
                : 'bg-blue-950/90 border-blue-500/40 text-blue-200'
            }`}
          >
            <span>{notice.message}</span>
            <button
              onClick={() => setNotice(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* =================================================================
              VIEW: DASHBOARD (Identical to capture)
          ================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Green info alert */}
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex items-start gap-3 text-emerald-200 text-xs">
                <Zap className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-100">Real-Time Preview Active</p>
                  <p className="text-emerald-300/90 mt-0.5">
                    Modifications made anywhere in this panel sync automatically with <code className="font-mono bg-emerald-900/60 px-1 py-0.5 rounded">config.json</code> and <code className="font-mono bg-emerald-900/60 px-1 py-0.5 rounded">portfolioData.json</code>. Use "Preview Site" to inspect changes in a new tab.
                  </p>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Services</p>
                    <p className="text-2xl font-black text-white mt-1">
                      {config?.services?.length || 8} Active
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl text-blue-400 border border-slate-700/60">
                    <Wrench className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Portfolio Items</p>
                    <p className="text-2xl font-black text-white mt-1">
                      {portfolioItems.length} Projects
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl text-emerald-400 border border-slate-700/60">
                    <Image className="w-6 h-6" />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setActiveTab('crm');
                    setCrmViewFilter('visits');
                  }}
                  className="bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 rounded-xl p-5 flex items-center justify-between shadow-sm cursor-pointer transition-all hover:bg-slate-800/60"
                  title="Click to view scheduled home visits"
                >
                  <div>
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">On-Site Visits Schedule</p>
                    <p className="text-2xl font-black text-emerald-300 mt-1">
                      {leads.filter(l => l.visitRequested).length} Scheduled
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-950/80 rounded-xl border border-emerald-500/30 text-emerald-400">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Testimonials</p>
                    <p className="text-2xl font-black text-white mt-1">
                      {config?.testimonials?.length || 3} Reviews
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-xl text-amber-400 border border-slate-700/60">
                    <Star className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Quick Actions</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <button
                    onClick={() => setActiveTab('hero')}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all text-center border border-slate-700 hover:border-blue-500"
                  >
                    Edit Hero Section
                  </button>
                  <button
                    onClick={() => setActiveTab('portfolio')}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all text-center border border-slate-700 hover:border-emerald-500"
                  >
                    Manage Portfolio
                  </button>
                  <button
                    onClick={() => setActiveTab('homes')}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all text-center border border-slate-700 hover:border-purple-500"
                  >
                    Homes We’ve Built
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all text-center border border-slate-700 hover:border-amber-500"
                  >
                    Edit Services
                  </button>
                  <button
                    onClick={handleResetToDefault}
                    className="p-3 bg-slate-800 hover:bg-red-950/50 text-slate-300 hover:text-red-300 rounded-lg text-xs font-bold transition-all text-center border border-slate-700 hover:border-red-500"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>

              {/* Recent CRM Leads Snapshot */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Recent CRM Inquiries ({leads.length})</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('crm')}
                    className="text-xs text-emerald-400 hover:underline font-bold"
                  >
                    View All Pipeline →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {leads.slice(0, 3).map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{lead.firstName} {lead.lastName}</span>
                        <span className="text-slate-400 ml-2">({lead.service})</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{lead.phone} • {lead.email}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-semibold text-[10px]">
                        {lead.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: GENERAL INFO
          ================================================================== */}
          {activeTab === 'info' && config?.contact && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>General Contact & Company Info</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Updates phone numbers, email address, physical location, and operating hours.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Phone</label>
                    <input
                      type="text"
                      value={config.contact.phone1 || ''}
                      onChange={(e) =>
                        saveConfig({ ...config, contact: { ...config.contact, phone1: e.target.value } })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Secondary Phone 1</label>
                    <input
                      type="text"
                      value={config.contact.phone2 || ''}
                      onChange={(e) =>
                        saveConfig({ ...config, contact: { ...config.contact, phone2: e.target.value } })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Secondary Phone 2</label>
                    <input
                      type="text"
                      value={config.contact.phone3 || ''}
                      onChange={(e) =>
                        saveConfig({ ...config, contact: { ...config.contact, phone3: e.target.value } })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={config.contact.email || ''}
                      onChange={(e) =>
                        saveConfig({ ...config, contact: { ...config.contact, email: e.target.value } })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Headquarters Address</label>
                    <input
                      type="text"
                      value={config.contact.address || ''}
                      onChange={(e) =>
                        saveConfig({ ...config, contact: { ...config.contact, address: e.target.value } })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Business Hours</label>
                    <input
                      type="text"
                      value={config.contact.hours || ''}
                      onChange={(e) =>
                        saveConfig({ ...config, contact: { ...config.contact, hours: e.target.value } })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: HERO SECTION
          ================================================================== */}
          {activeTab === 'hero' && config?.hero && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Hero Section Configuration</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Controls the primary landing banner headline, badges, and background video.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={config.hero.badgeText || ''}
                    onChange={(e) =>
                      saveConfig({ ...config, hero: { ...config.hero, badgeText: e.target.value } })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Headline (HTML permitted)</label>
                  <input
                    type="text"
                    value={config.hero.headline || ''}
                    onChange={(e) =>
                      saveConfig({ ...config, hero: { ...config.hero, headline: e.target.value } })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description Paragraph</label>
                  <textarea
                    rows={4}
                    value={config.hero.description || ''}
                    onChange={(e) =>
                      saveConfig({ ...config, hero: { ...config.hero, description: e.target.value } })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Background Video Path</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.hero.videoUrl || '/images/video/hero-bg.mp4'}
                        onChange={(e) =>
                          saveConfig({ ...config, hero: { ...config.hero, videoUrl: e.target.value } })
                        }
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileUpload('video', 'hero-bg.mp4', undefined, 'heroVideo')}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow"
                      >
                        Upload MP4
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Fallback Hero Image</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.hero.imageUrl || '/images/gallery/01.webp'}
                        onChange={(e) =>
                          saveConfig({ ...config, hero: { ...config.hero, imageUrl: e.target.value } })
                        }
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => triggerFileUpload('gallery', undefined, undefined, 'heroImage')}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: SERVICES
          ================================================================== */}
          {activeTab === 'services' && (
            <div className="max-w-5xl mx-auto space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-blue-400" />
                    <span>Construction Services ({config?.services?.length || 0})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Manage services offered on the home page and services modal.</p>
                </div>
                <button
                  onClick={() => {
                    if (!config) return;
                    const newSvc: ServiceItem = {
                      id: 'svc_' + Date.now(),
                      icon: 'Wrench',
                      title: 'New Service',
                      desc: 'Describe the new construction service here...'
                    };
                    saveConfig({ ...config, services: [...(config.services || []), newSvc] });
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Service</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config?.services?.map((svc, idx) => (
                  <div key={svc.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={svc.icon}
                        onChange={(e) => {
                          const updated = [...config.services];
                          updated[idx] = { ...svc, icon: e.target.value };
                          saveConfig({ ...config, services: updated });
                        }}
                        className="w-16 h-10 text-center text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                        title="Service Icon / Identifier"
                      />
                      <input
                        type="text"
                        value={svc.title}
                        onChange={(e) => {
                          const updated = [...config.services];
                          updated[idx] = { ...svc, title: e.target.value };
                          saveConfig({ ...config, services: updated });
                        }}
                        placeholder="Service Title"
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white"
                      />
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete service "${svc.title}"?`)) {
                            const updated = config.services.filter((_, i) => i !== idx);
                            saveConfig({ ...config, services: updated });
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors text-xs flex items-center justify-center"
                        title="Delete service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={svc.desc}
                      onChange={(e) => {
                        const updated = [...config.services];
                        updated[idx] = { ...svc, desc: e.target.value };
                        saveConfig({ ...config, services: updated });
                      }}
                      placeholder="Service Description"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: PORTFOLIO
          ================================================================== */}
          {activeTab === 'portfolio' && (
            <div className="max-w-6xl mx-auto space-y-5">
              {/* Header & Controls */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Image className="w-5 h-5 text-emerald-400" />
                    <span>Portfolio Projects ({portfolioItems.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Backed by <code className="text-emerald-400 font-mono">portfolioData.json</code>. Click [Edit] to open the custom modal.
                  </p>
                </div>
                <button
                  onClick={handleOpenNewPortfolioModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Project</span>
                </button>
              </div>

              {/* Search & Filter */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search projects by title, category, or description..."
                  value={portfolioSearch}
                  onChange={(e) => setPortfolioSearch(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-400"
                />
                <select
                  value={selectedPortfolioCategory}
                  onChange={(e) => setSelectedPortfolioCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Construction">Construction & Additions</option>
                  <option value="Painting">Painting</option>
                  <option value="Decking">Decking</option>
                  <option value="Siding">Siding</option>
                  <option value="Renovations">Renovations</option>
                </select>
              </div>

              {/* Portfolio Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPortfolio.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col group hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="h-44 bg-slate-950 relative overflow-hidden">
                      <img
                        src={getCacheBustedUrl(item.imageUrl, portfolioVersion)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/gallery/01.webp';
                        }}
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 bg-slate-900/90 text-white text-[10px] font-mono rounded backdrop-blur">
                          #{item.id}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {item.categoryLocation}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-0.5 line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => triggerFileUpload('gallery', undefined, item.id)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                            title="Replace project image (.webp / .jpeg)"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Image</span>
                          </button>
                        </div>

                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete portfolio item #${item.id} ("${item.title}")?`)) {
                              await deletePortfolioItem(item.id);
                              setNotice({ type: 'info', message: `Portfolio item #${item.id} deleted.` });
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg text-xs transition-colors flex items-center justify-center"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: HOMES WE'VE BUILT (2x4 GRID ARCHITECTURAL SHOWCASE ENGINE)
          ================================================================== */}
          {activeTab === 'homes' && config?.homes && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Home className="w-5 h-5 text-emerald-400" />
                    <span>Homes We’ve Built Showcase ({config.homes.projects?.length || 0})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Synchronized with public showcase and 2x4 collage grid (1 large elevation + 4 architectural detail shots).
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newProject: HomeProject = {
                      id: 'custom-home-' + Date.now(),
                      title: 'New Custom Home Residence',
                      tagline: 'Modern Architectural Design & Custom Millwork',
                      address: 'Indianapolis, IN',
                      specs: '4,500 Sq. Ft. • 4 Beds • 4 Baths',
                      year: '2026',
                      desc: 'Custom ground-up construction designed and built with precision craftsmanship by Velasquez Builders.',
                      highlights: ['Complete architectural design & permitting', 'James Hardie fiber cement siding', 'Custom open-concept framing'],
                      image: '/images/gallery/01.webp',
                      galleryImages: [
                        '/images/gallery/02.webp',
                        '/images/gallery/03.webp',
                        '/images/gallery/04.webp',
                        '/images/gallery/05.webp'
                      ]
                    };
                    saveConfig({
                      ...config,
                      homes: {
                        ...config.homes,
                        projects: [...(config.homes.projects || []), newProject]
                      }
                    });
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Custom Residence</span>
                </button>
              </div>

              {/* Section Header Controls */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Section Headline</label>
                  <input
                    type="text"
                    value={config.homes.headline || ''}
                    onChange={(e) =>
                      saveConfig({
                        ...config,
                        homes: { ...config.homes, headline: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Section Description</label>
                  <textarea
                    rows={2}
                    value={config.homes.description || ''}
                    onChange={(e) =>
                      saveConfig({
                        ...config,
                        homes: { ...config.homes, description: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                  />
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-6">
                {config.homes.projects?.map((home, idx) => {
                  const gallery = Array.isArray(home.galleryImages) && home.galleryImages.length >= 4
                    ? home.galleryImages
                    : ['/images/gallery/02.webp', '/images/gallery/03.webp', '/images/gallery/04.webp', '/images/gallery/05.webp'];

                  return (
                    <div key={home.id || idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
                      {/* Project Title Bar & Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-emerald-400 font-bold text-sm whitespace-nowrap">Project #{idx + 1}:</span>
                          <input
                            type="text"
                            value={home.title}
                            onChange={(e) => {
                              const updated = [...config.homes.projects];
                              updated[idx] = { ...home, title: e.target.value };
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }}
                            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white flex-1 max-w-md"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete residence "${home.title}"?`)) {
                              const updated = config.homes.projects.filter((_, i) => i !== idx);
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 text-xs flex items-center gap-1.5 transition-colors self-end sm:self-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Residence</span>
                        </button>
                      </div>

                      {/* Tagline, Address, Specs, Year */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Tagline / Architecture Style</label>
                          <input
                            type="text"
                            value={home.tagline || ''}
                            onChange={(e) => {
                              const updated = [...config.homes.projects];
                              updated[idx] = { ...home, tagline: e.target.value };
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Address / Public Location</label>
                          <input
                            type="text"
                            value={home.address}
                            onChange={(e) => {
                              const updated = [...config.homes.projects];
                              updated[idx] = { ...home, address: e.target.value };
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Specifications (Summary)</label>
                          <input
                            type="text"
                            value={home.specs}
                            onChange={(e) => {
                              const updated = [...config.homes.projects];
                              updated[idx] = { ...home, specs: e.target.value };
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Completion Year</label>
                          <input
                            type="text"
                            value={home.year || '2025'}
                            onChange={(e) => {
                              const updated = [...config.homes.projects];
                              updated[idx] = { ...home, year: e.target.value };
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* Ficha Técnica Granular (Sq Ft, Beds, Baths, Garage) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-950/50 rounded-lg border border-slate-850">
                        <div>
                          <label className="block text-[11px] text-emerald-400 font-semibold mb-1">Metraje / Sq. Footage</label>
                          <input
                            type="text"
                            placeholder="4,850 Sq. Ft."
                            value={home.sqft || ''}
                            onChange={(e) => {
                              const updated = [...config.homes.projects];
                              updated[idx] = { ...home, sqft: e.target.value };
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-emerald-400 font-semibold mb-1">Habitaciones / Bedrooms</label>
                          <input
                            type="text"
                            placeholder="5 Bedrooms"
                            value={home.beds || ''}
                            onChange={(e) => {
                              const updated = [...config.homes.projects];
                              updated[idx] = { ...home, beds: e.target.value };
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-emerald-400 font-semibold mb-1">Baños / Bathrooms</label>
                          <input
                            type="text"
                            placeholder="4.5 Bathrooms"
                            value={home.baths || ''}
                            onChange={(e) => {
                              const updated = [...config.homes.projects];
                              updated[idx] = { ...home, baths: e.target.value };
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-emerald-400 font-semibold mb-1">Garaje / Capacidad</label>
                          <input
                            type="text"
                            placeholder="3-Car Attached Garage"
                            value={home.garage || ''}
                            onChange={(e) => {
                              const updated = [...config.homes.projects];
                              updated[idx] = { ...home, garage: e.target.value };
                              saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                          />
                        </div>
                      </div>

                      {/* Description Narrative */}
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Architectural Narrative / Story</label>
                        <textarea
                          rows={3}
                          value={home.desc}
                          onChange={(e) => {
                            const updated = [...config.homes.projects];
                            updated[idx] = { ...home, desc: e.target.value };
                            saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                          }}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300"
                        />
                      </div>

                      {/* =====================================================================
                          HERO IMAGE & RESPONSIVE SECONDARY GALLERY (2x2 ON DESKTOP / 1-COL MOBILE)
                      ====================================================================== */}
                      <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Camera className="w-4 h-4 text-emerald-400" />
                              <span>Primary Panoramic Image &amp; Secondary Gallery (4 Perspectives)</span>
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Bloque 2: Gran panorámica de impacto. Bloque 4: Cuadrícula simétrica 2x2 en Desktop/Tablets y 1 columna en Móvil.
                            </p>
                          </div>
                        </div>

                        {/* Large Featured Elevation Photo */}
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                          <span className="block text-[11px] font-bold text-emerald-400 mb-2 uppercase tracking-wider">
                            Primary Panoramic Image (Featured Elevation)
                          </span>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="h-16 w-24 rounded-lg border border-slate-700 overflow-hidden bg-slate-950 flex-shrink-0">
                              <img
                                src={getCacheBustedUrl(home.image, portfolioVersion)}
                                alt={home.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 w-full space-y-1.5">
                              <input
                                type="text"
                                value={home.image}
                                onChange={(e) => {
                                  const updated = [...config.homes.projects];
                                  updated[idx] = { ...home, image: e.target.value };
                                  saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                                }}
                                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white font-mono"
                                placeholder="/images/gallery/01.webp"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setHomeGalleryPicker({ homeIdx: idx, slot: 'main' })}
                                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  <span>Choose from Gallery Library</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 4 Smaller Detail Images */}
                        <div>
                          <span className="block text-[11px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                            4 Smaller Detail Photos (Completing 2x4 Collage Grid)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {[0, 1, 2, 3].map((slotIdx) => {
                              const slotLabels = ['Interior Living', 'Finishes & Trim', 'Outdoor Architecture', 'Additional Detail'];
                              const currentUrl = gallery[slotIdx] || `/images/gallery/0${slotIdx + 2}.webp`;

                              return (
                                <div key={slotIdx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                                    <span>Detail #{slotIdx + 1}</span>
                                    <span className="text-[10px] text-slate-400">{slotLabels[slotIdx]}</span>
                                  </div>
                                  <div className="h-16 w-full rounded border border-slate-800 overflow-hidden bg-slate-950">
                                    <img
                                      src={getCacheBustedUrl(currentUrl, portfolioVersion)}
                                      alt={`Detail ${slotIdx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={currentUrl}
                                    onChange={(e) => {
                                      const updatedGallery = [...gallery];
                                      updatedGallery[slotIdx] = e.target.value;
                                      const updated = [...config.homes.projects];
                                      updated[idx] = { ...home, galleryImages: updatedGallery };
                                      saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                                    }}
                                    className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-white font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setHomeGalleryPicker({ homeIdx: idx, slot: slotIdx })}
                                    className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <FolderOpen className="w-3 h-3" />
                                    <span>Select Image</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Inline Gallery Picker Modal/Dropdown */}
                        {homeGalleryPicker && homeGalleryPicker.homeIdx === idx && (
                          <div className="mt-3 p-4 bg-slate-900 border-2 border-emerald-500/50 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <FolderOpen className="w-4 h-4 text-emerald-400" />
                                <span>
                                  Select Photo for {homeGalleryPicker.slot === 'main' ? 'Primary Large Image' : `Detail #${(homeGalleryPicker.slot as number) + 1}`}
                                </span>
                              </span>
                              <button
                                onClick={() => setHomeGalleryPicker(null)}
                                className="text-xs text-slate-400 hover:text-white p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-950 rounded-lg border border-slate-800">
                              {(media?.gallery?.length ? media.gallery : Array.from({ length: 30 }, (_, i) => ({
                                path: `/images/gallery/${String(i + 1).padStart(2, '0')}.webp`,
                                filename: `${String(i + 1).padStart(2, '0')}.webp`
                              }))).map((asset: any, aIdx: number) => {
                                const assetPath = asset.path || `/images/gallery/${asset.filename}`;
                                return (
                                  <div
                                    key={aIdx}
                                    onClick={() => {
                                      const updated = [...config.homes.projects];
                                      if (homeGalleryPicker.slot === 'main') {
                                        updated[idx] = { ...home, image: assetPath };
                                      } else {
                                        const updatedGallery = [...gallery];
                                        updatedGallery[homeGalleryPicker.slot as number] = assetPath;
                                        updated[idx] = { ...home, galleryImages: updatedGallery };
                                      }
                                      saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                                      setHomeGalleryPicker(null);
                                    }}
                                    className="aspect-square rounded border border-slate-800 hover:border-emerald-400 overflow-hidden cursor-pointer group relative bg-slate-900"
                                    title={asset.filename}
                                  >
                                    <img
                                      src={getCacheBustedUrl(assetPath, portfolioVersion)}
                                      alt={asset.filename}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Check className="w-4 h-4 text-white drop-shadow" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Highlights Editor */}
                      <div className="space-y-2">
                        <label className="block text-[11px] text-slate-400">Architectural Highlights</label>
                        <div className="space-y-1.5">
                          {(home.highlights || []).map((hl, hlIdx) => (
                            <div key={hlIdx} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-mint-500 flex-shrink-0" />
                              <input
                                type="text"
                                value={hl}
                                onChange={(e) => {
                                  const updatedHl = [...(home.highlights || [])];
                                  updatedHl[hlIdx] = e.target.value;
                                  const updated = [...config.homes.projects];
                                  updated[idx] = { ...home, highlights: updatedHl };
                                  saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                                }}
                                className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                              />
                              <button
                                onClick={() => {
                                  const updatedHl = (home.highlights || []).filter((_, i) => i !== hlIdx);
                                  const updated = [...config.homes.projects];
                                  updated[idx] = { ...home, highlights: updatedHl };
                                  saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                                }}
                                className="p-1 text-slate-400 hover:text-red-400"
                                title="Remove highlight"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const updatedHl = [...(home.highlights || []), 'New Architectural Highlight'];
                            const updated = [...config.homes.projects];
                            updated[idx] = { ...home, highlights: updatedHl };
                            saveConfig({ ...config, homes: { ...config.homes, projects: updated } });
                          }}
                          className="mt-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Highlight Item</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: PROCESS
          ================================================================== */}
          {activeTab === 'process' && config?.process && (
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-cyan-400" />
                    <span>Construction Process Steps ({config.process.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Step-by-step workflow shown to clients.</p>
                </div>
                <button
                  onClick={() => {
                    const newStep: ProcessStep = {
                      step: config.process.length + 1,
                      title: 'New Phase',
                      desc: 'Describe this phase of the construction workflow...'
                    };
                    saveConfig({ ...config, process: [...config.process, newStep] });
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-3">
                {config.process.map((step, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center">
                        #{step.step || idx + 1}
                      </span>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const updated = [...config.process];
                          updated[idx] = { ...step, title: e.target.value };
                          saveConfig({ ...config, process: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white"
                        placeholder="Step Title"
                      />
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete step #${idx + 1}?`)) {
                            const updated = config.process.filter((_, i) => i !== idx);
                            saveConfig({ ...config, process: updated });
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 text-xs flex items-center justify-center"
                        title="Delete step"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={step.desc}
                      onChange={(e) => {
                        const updated = [...config.process];
                        updated[idx] = { ...step, desc: e.target.value };
                        saveConfig({ ...config, process: updated });
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: OUR TEAM
          ================================================================== */}
          {activeTab === 'team' && config?.team && (
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span>Team Members ({config.team.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Key management and on-site craftsmen.</p>
                </div>
                <button
                  onClick={() => {
                    const newMember: TeamMember = {
                      name: 'Team Member',
                      role: 'Craftsman / Supervisor',
                      url: '/images/gallery/01.webp'
                    };
                    saveConfig({ ...config, team: [...config.team, newMember] });
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.team.map((member, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
                        <img
                          src={getCacheBustedUrl(member.url, portfolioVersion)}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => {
                            const updated = [...config.team];
                            updated[idx] = { ...member, name: e.target.value };
                            saveConfig({ ...config, team: updated });
                          }}
                          placeholder="Member Name"
                          className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white"
                        />
                        <input
                          type="text"
                          value={member.role}
                          onChange={(e) => {
                            const updated = [...config.team];
                            updated[idx] = { ...member, role: e.target.value };
                            saveConfig({ ...config, team: updated });
                          }}
                          placeholder="Role / Title"
                          className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-emerald-400"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete team member "${member.name}"?`)) {
                            const updated = config.team.filter((_, i) => i !== idx);
                            saveConfig({ ...config, team: updated });
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 text-xs flex items-center justify-center"
                        title="Delete member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Image URL</label>
                      <input
                        type="text"
                        value={member.url}
                        onChange={(e) => {
                          const updated = [...config.team];
                          updated[idx] = { ...member, url: e.target.value };
                          saveConfig({ ...config, team: updated });
                        }}
                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">About / Bio Description</label>
                      <textarea
                        rows={2}
                        value={member.description || ''}
                        onChange={(e) => {
                          const updated = [...config.team];
                          updated[idx] = { ...member, description: e.target.value };
                          saveConfig({ ...config, team: updated });
                        }}
                        placeholder="Description of the team member or crew..."
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: GET A QUOTE (Form options)
          ================================================================== */}
          {activeTab === 'quote' && config?.quoteForm?.sections && (
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-400" />
                  <span>Quote Form Questions & Options ({config.quoteForm.sections.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure interactive questions and dropdown options on the quote inquiry form.
                </p>
              </div>

              <div className="space-y-4">
                {config.quoteForm.sections.map((sec, idx) => (
                  <div key={sec.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-emerald-400">[{sec.id}]</span>
                        <input
                          type="text"
                          value={sec.label}
                          onChange={(e) => {
                            const updated = [...config.quoteForm.sections];
                            updated[idx] = { ...sec, label: e.target.value };
                            saveConfig({ ...config, quoteForm: { ...config.quoteForm, sections: updated } });
                          }}
                          className="px-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newOpt = prompt('Add new option for ' + sec.label);
                          if (newOpt && newOpt.trim()) {
                            const updated = [...config.quoteForm.sections];
                            updated[idx] = { ...sec, options: [...sec.options, newOpt.trim()] };
                            saveConfig({ ...config, quoteForm: { ...config.quoteForm, sections: updated } });
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Option</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {sec.options.map((opt, optIdx) => (
                        <span
                          key={optIdx}
                          className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 flex items-center gap-1.5"
                        >
                          <span>{opt}</span>
                          <button
                            onClick={() => {
                              const updatedOptions = sec.options.filter((_, i) => i !== optIdx);
                              const updated = [...config.quoteForm.sections];
                              updated[idx] = { ...sec, options: updatedOptions };
                              saveConfig({ ...config, quoteForm: { ...config.quoteForm, sections: updated } });
                            }}
                            className="text-slate-500 hover:text-red-400 flex items-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: TESTIMONIALS (Guarantees at least 3 items default)
          ================================================================== */}
          {activeTab === 'testimonials' && config?.testimonials && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    <span>Customer Testimonials ({config.testimonials.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real client feedback and reviews (min 3 items).</p>
                </div>
                <button
                  onClick={() => {
                    const newTestimonial: TestimonialItem = {
                      name: 'Client Name',
                      location: 'Indianapolis, IN',
                      text: 'Outstanding craftsmanship and seamless communication throughout the construction project.',
                      rating: 5
                    };
                    saveConfig({ ...config, testimonials: [...config.testimonials, newTestimonial] });
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Testimonial</span>
                </button>
              </div>

              <div className="space-y-4">
                {config.testimonials.map((t, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => {
                            const updated = [...config.testimonials];
                            updated[idx] = { ...t, name: e.target.value };
                            saveConfig({ ...config, testimonials: updated });
                          }}
                          placeholder="Client Name"
                          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white"
                        />
                        <input
                          type="text"
                          value={t.location}
                          onChange={(e) => {
                            const updated = [...config.testimonials];
                            updated[idx] = { ...t, location: e.target.value };
                            saveConfig({ ...config, testimonials: updated });
                          }}
                          placeholder="Location (e.g. Carmel, IN)"
                          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                        />
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: t.rating || 5 }).map((_, sIdx) => (
                            <Star key={sIdx} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete review from "${t.name}"?`)) {
                            const updated = config.testimonials.filter((_, i) => i !== idx);
                            saveConfig({ ...config, testimonials: updated });
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 text-xs flex items-center justify-center"
                        title="Delete testimonial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={t.text}
                      onChange={(e) => {
                        const updated = [...config.testimonials];
                        updated[idx] = { ...t, text: e.target.value };
                        saveConfig({ ...config, testimonials: updated });
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: FEATURES
          ================================================================== */}
          {activeTab === 'features' && config?.features && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-400" />
                    <span>Value Features ({config.features.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Trust indicators and competitive advantages.</p>
                </div>
                <button
                  onClick={() => {
                    const newFeature: FeatureItem = {
                      icon: 'ShieldCheck',
                      title: 'Quality Feature',
                      desc: 'Describe this value feature...'
                    };
                    saveConfig({ ...config, features: [...config.features, newFeature] });
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Feature</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.features.map((feat, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={feat.icon}
                        onChange={(e) => {
                          const updated = [...config.features];
                          updated[idx] = { ...feat, icon: e.target.value };
                          saveConfig({ ...config, features: updated });
                        }}
                        className="w-24 h-9 text-center text-xs bg-slate-950 border border-slate-800 rounded text-white font-mono"
                        placeholder="Icon Name"
                      />
                      <input
                        type="text"
                        value={feat.title}
                        onChange={(e) => {
                          const updated = [...config.features];
                          updated[idx] = { ...feat, title: e.target.value };
                          saveConfig({ ...config, features: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white"
                      />
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete feature "${feat.title}"?`)) {
                            const updated = config.features.filter((_, i) => i !== idx);
                            saveConfig({ ...config, features: updated });
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 text-xs flex items-center justify-center"
                        title="Delete feature"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={feat.desc}
                      onChange={(e) => {
                        const updated = [...config.features];
                        updated[idx] = { ...feat, desc: e.target.value };
                        saveConfig({ ...config, features: updated });
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: FOOTER
          ================================================================== */}
          {activeTab === 'footer' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-slate-400" />
                    <span>Website Footer &amp; Branding Engine</span>
                  </h3>
                  <span className="text-xs bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-full font-semibold">
                    4-Column Layout
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Configure the 4-column master footer of Velasquez Builders. Updates sync live across the main website and persistent configuration.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Copyright Notice</label>
                    <input
                      type="text"
                      value={config?.footerCopyright || ''}
                      onChange={(e) =>
                        config && saveConfig({ ...config, footerCopyright: e.target.value })
                      }
                      placeholder="© 2026 Velasquez Builders. All rights reserved."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Company Footer Summary</label>
                    <textarea
                      rows={2}
                      value={config?.footer?.about || ''}
                      onChange={(e) =>
                        config &&
                        saveConfig({
                          ...config,
                          footer: { ...config.footer, about: e.target.value },
                        })
                      }
                      placeholder="Premier General Contractor in Indianapolis, Indiana..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Col 1 Contact Preview & Sync */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Column 1: Direct Contact Numbers &amp; Location</span>
                  </h4>
                  <button
                    onClick={() => setActiveTab('info')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Edit in General Info →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Phones</span>
                    <span className="text-slate-200 font-semibold">{config?.contact?.phone1 || '(317) 489-7681'}</span>
                    <span className="text-slate-400 block">{config?.contact?.phone2 || '(317) 603-6968'}</span>
                    <span className="text-slate-400 block">{config?.contact?.phone3 || '(317) 993-0221'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Email &amp; Hours</span>
                    <span className="text-slate-200">{config?.contact?.email || 'info@velasquezbuilders.com'}</span>
                    <span className="text-slate-400 block">{config?.contact?.hours || 'Mon - Sat: 9:00 AM - 7:00 PM'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Physical Address</span>
                    <span className="text-slate-300">{config?.contact?.address || '7780 N. Michigan Rd. Suite B. Indianapolis IN 46268'}</span>
                  </div>
                </div>
              </div>

              {/* Col 2 & 3 Navigation & Service Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config?.footerColumns?.map((col, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">Column {idx + 2}:</span>
                        <input
                          type="text"
                          value={col.title}
                          onChange={(e) => {
                            if (!config?.footerColumns) return;
                            const updated = [...config.footerColumns];
                            updated[idx] = { ...col, title: e.target.value };
                            saveConfig({ ...config, footerColumns: updated });
                          }}
                          className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const item = prompt('Add link to ' + col.title);
                          if (item && item.trim()) {
                            if (!config?.footerColumns) return;
                            const updated = [...config.footerColumns];
                            updated[idx] = { ...col, items: [...col.items, item.trim()] };
                            saveConfig({ ...config, footerColumns: updated });
                          }
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Link</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {col.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950 rounded text-xs text-slate-300 border border-slate-800/60">
                          <span>{item}</span>
                          <button
                            onClick={() => {
                              if (!config?.footerColumns) return;
                              const updatedItems = col.items.filter((_, i) => i !== itemIdx);
                              const updated = [...config.footerColumns];
                              updated[idx] = { ...col, items: updatedItems };
                              saveConfig({ ...config, footerColumns: updated });
                            }}
                            className="text-slate-500 hover:text-red-400 text-xs px-1 flex items-center"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Col 4: Why Choose Us & Accepted Payments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Why Choose Us */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400" />
                      <span>Why Choose Us Highlights</span>
                    </h4>
                    <button
                      onClick={() => {
                        const item = prompt('Add Why Choose Us highlight:');
                        if (item && item.trim()) {
                          const current = config?.footer?.whyChooseUs || [
                            'Licensed, Bonded & Insured',
                            '10+ Years Building in Indiana',
                            'Free Detailed Estimates',
                            'Turnkey Project Management',
                            '100% Quality Workmanship',
                          ];
                          config &&
                            saveConfig({
                              ...config,
                              footer: { ...config.footer, whyChooseUs: [...current, item.trim()] },
                            });
                        }
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Point</span>
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(config?.footer?.whyChooseUs || [
                      'Licensed, Bonded & Insured',
                      '10+ Years Building in Indiana',
                      'Free Detailed Estimates',
                      'Turnkey Project Management',
                      '100% Quality Workmanship',
                    ]).map((pt, pidx) => (
                      <div key={pidx} className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950 rounded text-xs text-slate-300 border border-slate-800/60">
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{pt}</span>
                        </span>
                        <button
                          onClick={() => {
                            const current = config?.footer?.whyChooseUs || [];
                            const updated = current.filter((_, i) => i !== pidx);
                            config &&
                              saveConfig({
                                ...config,
                                footer: { ...config.footer, whyChooseUs: updated },
                              });
                          }}
                          className="text-slate-500 hover:text-red-400 text-xs px-1 flex items-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accepted Payment Methods */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <span>Accepted Payment Badges</span>
                    </h4>
                    <button
                      onClick={() => {
                        const pm = prompt('Add payment badge (e.g. Visa, Mastercard, Cash, Zelle):');
                        if (pm && pm.trim()) {
                          const current = config?.footer?.paymentMethods || [
                            'Visa',
                            'Mastercard',
                            'American Express',
                            'Discover',
                            'Cash',
                            'Zelle',
                          ];
                          config &&
                            saveConfig({
                              ...config,
                              footer: { ...config.footer, paymentMethods: [...current, pm.trim()] },
                            });
                        }
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Badge</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(config?.footer?.paymentMethods || [
                      'Visa',
                      'Mastercard',
                      'American Express',
                      'Discover',
                      'Cash',
                      'Zelle',
                    ]).map((badge, bidx) => (
                      <div
                        key={bidx}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 flex items-center gap-2"
                      >
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          <span>{badge.replace(/^[^\w\s]+/g, '').trim() || badge}</span>
                        </span>
                        <button
                          onClick={() => {
                            const current = config?.footer?.paymentMethods || [];
                            const updated = current.filter((_, i) => i !== bidx);
                            config &&
                              saveConfig({
                                ...config,
                                footer: { ...config.footer, paymentMethods: updated },
                              });
                          }}
                          className="text-slate-500 hover:text-red-400 text-xs flex items-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* WhatsApp Floating Button & Agency Attribution Management */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* WhatsApp Floating Button Config */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>Floating WhatsApp Button</span>
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Mobile-optimized floating button anchored to bottom right of the website.
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">WhatsApp Phone / Digits</label>
                      <input
                        type="text"
                        value={config?.footer?.whatsapp?.phone || config?.contact?.phone1 || '13174897681'}
                        onChange={(e) => {
                          if (!config) return;
                          saveConfig({
                            ...config,
                            footer: {
                              ...config.footer,
                              whatsapp: {
                                ...config.footer?.whatsapp,
                                phone: e.target.value
                              }
                            }
                          });
                        }}
                        placeholder="13174897681"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Default Pre-filled Message</label>
                      <input
                        type="text"
                        value={config?.footer?.whatsapp?.message || 'Hello Velasquez Builders, I would like to request information about a project.'}
                        onChange={(e) => {
                          if (!config) return;
                          saveConfig({
                            ...config,
                            footer: {
                              ...config.footer,
                              whatsapp: {
                                ...config.footer?.whatsapp,
                                message: e.target.value
                              }
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Agency Attribution */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-slate-400" />
                      <span>Agency Attribution Credit</span>
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                      Sub-Footer Centered
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Centered attribution below copyright statement, fully mobile-optimized.
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Attribution Text</label>
                      <input
                        type="text"
                        value={config?.footer?.attribution?.text || 'By: Mora-Grafic\'s Studio'}
                        onChange={(e) => {
                          if (!config) return;
                          saveConfig({
                            ...config,
                            footer: {
                              ...config.footer,
                              attribution: {
                                ...config.footer?.attribution,
                                text: e.target.value
                              }
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Agency Website URL</label>
                      <input
                        type="text"
                        value={config?.footer?.attribution?.url || 'https://mora-grafics-studio.com/'}
                        onChange={(e) => {
                          if (!config) return;
                          saveConfig({
                            ...config,
                            footer: {
                              ...config.footer,
                              attribution: {
                                ...config.footer?.attribution,
                                url: e.target.value
                              }
                            }
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal Policies Modal Info Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Privacy Policy &amp; Terms of Service Active</h4>
                    <p className="text-[11px] text-slate-400">
                      Integrated legal documents modal with April 2026 update, licenses GL2300226 &amp; 321, and contact hotline.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/#privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-semibold transition-colors"
                  >
                    View Privacy Policy ↗
                  </a>
                  <a
                    href="/#terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-semibold transition-colors"
                  >
                    View Terms ↗
                  </a>
                </div>
              </div>

              {/* Live Footer Preview Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    <span>Real-Time Website Footer Preview</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono">Live Centered &amp; Mobile Ready</span>
                </div>
                <div className="bg-[#0e0f11] border border-slate-800/80 rounded-xl p-6 text-white text-xs space-y-6 relative overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 opacity-90">
                    <div>
                      <div className="font-bold text-sm text-emerald-400 mb-1">Velasquez Builders</div>
                      <p className="text-[11px] text-slate-400 line-clamp-3">
                        {config?.footer?.about || 'Premier General Contractor in Indianapolis, Indiana.'}
                      </p>
                      <p className="text-[11px] text-slate-300 mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span>{config?.contact?.address}</span>
                      </p>
                    </div>
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider text-slate-200 mb-2">Quick Links</div>
                      <div className="space-y-1 text-slate-400 text-[11px]">
                        <div>• Home</div>
                        <div>• Homes We’ve Built</div>
                        <div>• Our Services</div>
                        <div>• Privacy Policy</div>
                        <div>• Terms of Service</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider text-slate-200 mb-2">Services</div>
                      <div className="space-y-1 text-slate-400 text-[11px]">
                        <div>• New Home Construction</div>
                        <div>• General Renovations</div>
                        <div>• Composite Decking</div>
                        <div>• Siding &amp; Painting</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider text-slate-200 mb-2">Why Choose Us</div>
                      <div className="space-y-1 text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Licensed, Bonded &amp; Insured</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> 10+ Years Building in Indiana</div>
                        <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Free Detailed Estimates</div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(config?.footer?.paymentMethods || ['Visa', 'Mastercard', 'Cash', 'Zelle']).map((b, i) => (
                          <span key={i} className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 flex items-center gap-1">
                            <CreditCard className="w-2.5 h-2.5 text-slate-400" />
                            <span>{b.replace(/^[^\w\s]+/g, '').trim() || b}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sub-footer centered */}
                  <div className="pt-6 border-t border-slate-800/80 flex flex-col items-center justify-center text-center gap-2 text-[11px] text-slate-400">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <span className="text-slate-300 hover:text-emerald-400 cursor-pointer">Privacy Policy</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-300 hover:text-emerald-400 cursor-pointer">Terms of Service</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-300 hover:text-emerald-400 cursor-pointer">Administrador</span>
                    </div>
                    <div>
                      {config?.footerCopyright || '© 2026 Velasquez Builders. All rights reserved.'} | Licensed, Bonded &amp; Insured General Contractor
                    </div>
                    <div className="text-slate-400 flex items-center justify-center gap-1.5 pt-0.5">
                      <span>By:</span>
                      <a href="https://mora-grafics-studio.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-semibold hover:underline flex items-center gap-1">
                        {config?.footer?.attribution?.text?.replace(/^By:\s*/i, '') || 'Mora-Grafic\'s Studio'} ↗
                      </a>
                    </div>
                  </div>

                  {/* Floating WhatsApp Mini Preview Badge */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-[#25D366] text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg">
                    <MessageSquare className="w-3 h-3 text-white" />
                    <span>WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: MEDIA ASSETS
          ================================================================== */}
          {activeTab === 'media' && (
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-purple-400" />
                    <span>File Architecture &amp; Assets (/public/images)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Permitted formats: gallery (.webp, .jpeg, .jpg, .png), logo (.png, .ico), video (.mp4).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(['gallery', 'logo', 'video'] as MediaFolder[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setMediaSubFolder(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                        mediaSubFolder === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f} ({media[f]?.length || 0})
                    </button>
                  ))}
                  <button
                    onClick={() => triggerFileUpload(mediaSubFolder)}
                    className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload {mediaSubFolder}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {media[mediaSubFolder]?.map((file) => (
                  <div
                    key={file.filename}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between group hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="h-24 bg-slate-950 rounded overflow-hidden flex items-center justify-center relative">
                      {mediaSubFolder === 'video' ? (
                        <Camera className="w-8 h-8 text-purple-400" />
                      ) : (
                        <img
                          src={file.urlWithCacheBuster}
                          alt={file.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-[11px] font-bold text-white truncate" title={file.filename}>
                        {file.filename}
                      </p>
                      <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                      <button
                        onClick={() => triggerFileUpload(mediaSubFolder, file.filename)}
                        className="w-full mt-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded transition-colors"
                      >
                        Replace File
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW: CRM LEADS & PIPELINE (Never blank)
          ================================================================== */}
          {activeTab === 'crm' && (
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>CRM &amp; On-Site Inspection Pipeline ({leads.length} Inquiries)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Synced with <code className="text-emerald-400 font-mono">crmData.json</code>. Real-time tracking of client estimates and on-site pre-inspection visits.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setVisitFormFirstName('');
                      setVisitFormLastName('');
                      setVisitFormPhone('');
                      setVisitFormEmail('');
                      setVisitFormAddress('');
                      setVisitFormCity('Indianapolis');
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setVisitFormDate(tomorrow.toISOString().split('T')[0]);
                      setVisitFormTimeSlot('Morning (8:00 AM - 12:00 PM)');
                      setVisitFormService('Commercial and Residential Project Management');
                      setVisitFormNotes('');
                      setIsVisitModalOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Schedule On-Site Inspection Visit</span>
                  </button>
                  <button
                    onClick={() => {
                      const first = prompt('Client First Name:');
                      if (!first) return;
                      const last = prompt('Client Last Name:') || '';
                      const phone = prompt('Client Phone:') || '';
                      const email = prompt('Client Email:') || '';
                      const svc = prompt('Service requested:', 'Commercial and Residential Project Management') || '';
                      const desc = prompt('Project description:') || '';
                      captureLead({
                        firstName: first,
                        lastName: last,
                        phone,
                        email,
                        service: svc,
                        description: desc,
                        status: 'New',
                        source: 'Admin Manual Entry'
                      });
                      setNotice({ type: 'success', message: 'Client inquiry added to CRM.' });
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Quick Lead Entry</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs: All Leads vs Scheduled Home Visits */}
              <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 w-fit">
                <button
                  onClick={() => setCrmViewFilter('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    crmViewFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>All Inquiries ({leads.length})</span>
                </button>
                <button
                  onClick={() => setCrmViewFilter('visits')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    crmViewFilter === 'visits'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-400 hover:bg-emerald-950/40'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>On-Site Visits ({leads.filter(l => l.visitRequested).length})</span>
                </button>
              </div>

              {/* Status summary counters */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                {(['New', 'Contacted', 'Estimate Scheduled', 'Proposal Sent', 'Won', 'Closed'] as Lead['status'][]).map(
                  (st) => {
                    const count = (crmViewFilter === 'visits'
                      ? leads.filter(l => l.visitRequested && l.status === st)
                      : leads.filter(l => l.status === st)
                    ).length;
                    return (
                      <div key={st} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{st}</p>
                        <p className="text-xl font-black text-white mt-0.5">{count}</p>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Leads List */}
              <div className="space-y-3">
                {(crmViewFilter === 'visits'
                  ? leads.filter(l => l.visitRequested || Boolean(l.visitDate) || Boolean(l.visitAddress))
                  : leads
                ).map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {lead.firstName} {lead.lastName}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            lead.status === 'Won'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : lead.status === 'Proposal Sent'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                              : lead.status === 'Estimate Scheduled'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          }`}
                        >
                          {lead.status}
                        </span>
                        {lead.visitRequested && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-400" />
                            <span>On-Site Visit</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{lead.phone || 'N/A'}</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{lead.email || 'N/A'}</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>Service: <strong className="text-emerald-400 font-bold">{lead.service}</strong></span>
                      </p>

                      {/* Highlighted Inspection Visit Box */}
                      {lead.visitRequested && (
                        <div className="mt-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-emerald-400" />
                              <span>On-Site Pre-Inspection Visit Scheduled</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">Visit Status:</span>
                              <select
                                value={lead.visitStatus || 'Confirmed'}
                                onChange={(e) => updateLeadVisit(lead.id, { visitStatus: e.target.value as any })}
                                className="bg-slate-900 border border-emerald-500/50 text-emerald-200 text-[11px] font-bold rounded px-2 py-1 focus:ring-1 focus:ring-emerald-400"
                              >
                                <option value="Confirmed">Confirmed</option>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Rescheduled">Rescheduled</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                            <p className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <strong className="text-slate-400">Date:</strong> {lead.visitDate || 'To be coordinated'} ({lead.visitTimeSlot || 'Flexible Window'})
                            </p>
                            <p className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <strong className="text-slate-400">Property Address:</strong> {lead.visitAddress || 'Not specified'}, {lead.visitCity || 'Indianapolis, IN'}
                            </p>
                          </div>
                          {lead.visitNotes && (
                            <p className="text-[11px] text-slate-300 italic border-t border-emerald-900/60 pt-1.5">
                              Inspection Details: {lead.visitNotes}
                            </p>
                          )}
                        </div>
                      )}

                      {lead.description && !lead.visitRequested && (
                        <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                          "{lead.description}"
                        </p>
                      )}

                      {lead.notes && (
                        <p className="text-[11px] text-amber-300/90 font-medium">
                          Internal Note: {lead.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-medium"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Estimate Scheduled">Estimate Scheduled</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Won">Won</option>
                        <option value="Closed">Closed</option>
                      </select>

                      <button
                        onClick={() => {
                          const note = prompt('Add internal follow-up note:');
                          if (note && note.trim()) {
                            addLeadNote(lead.id, note.trim());
                          }
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1"
                        title="Add note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Note</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Delete lead from ${lead.firstName} ${lead.lastName}?`)) {
                            deleteLead(lead.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded text-xs transition-colors flex items-center justify-center"
                        title="Delete lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =====================================================================
          MODAL: "Edit portfolio" (Faithful to Screenshot Design)
      ====================================================================== */}
      {editingPortfolioItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header: Title on Left, X on Right */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tracking-wide">
                {isNewPortfolioItem ? 'Add portfolio item' : 'Edit portfolio'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg leading-none"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-4 flex-1">
              {modalError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300">
                  {modalError}
                </div>
              )}

              {/* Field 1: Image URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    required
                    placeholder="images/gallery/01.webp"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => triggerFileUpload('gallery')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                    title="Upload WebP or JPEG image"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Upload</span>
                  </button>
                </div>
                {formImageUrl && (
                  <div className="mt-2 h-16 w-28 bg-slate-950 rounded border border-slate-800 overflow-hidden relative">
                    <img
                      src={getCacheBustedUrl(formImageUrl, portfolioVersion)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/gallery/01.webp';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Field 2: Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  placeholder="Custom Detached Garage"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Field 3: Category / Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category / Location
                </label>
                <input
                  type="text"
                  value={formCategoryLocation}
                  onChange={(e) => setFormCategoryLocation(e.target.value)}
                  required
                  placeholder="New Construction & Additions"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Field 4: Description (Multiline tall textarea) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={5}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  placeholder="We designed and built this spacious garage from the foundation up..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              {/* Bottom Buttons: Cancel & Save (emerald green) */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isModalSaving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5"
                >
                  {isModalSaving ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: "Schedule On-Site Inspection Visit" (Admin Inspection Scheduler)
      ====================================================================== */}
      {isVisitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8 animate-in">
            <button
              onClick={() => setIsVisitModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg flex items-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>Schedule On-Site Pre-Inspection Visit</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Schedule an in-person technical pre-inspection at the client's property to evaluate work scope and measurements.
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsVisitSaving(true);
                try {
                  const success = await captureLead({
                    firstName: visitFormFirstName.trim(),
                    lastName: visitFormLastName.trim(),
                    phone: visitFormPhone.trim(),
                    email: visitFormEmail.trim(),
                    service: visitFormService,
                    description: `On-site pre-inspection visit: ${visitFormNotes.trim()}`,
                    visitRequested: true,
                    visitDate: visitFormDate,
                    visitTimeSlot: visitFormTimeSlot,
                    visitAddress: visitFormAddress.trim(),
                    visitCity: visitFormCity.trim() || 'Indianapolis, IN',
                    visitNotes: visitFormNotes.trim(),
                    visitStatus: 'Confirmed',
                    status: 'Estimate Scheduled',
                    source: 'Dashboard Admin - On-Site Scheduler',
                  });
                  if (success) {
                    setNotice({
                      type: 'success',
                      message: `On-site inspection visit scheduled for ${visitFormFirstName} ${visitFormLastName} on ${visitFormDate} (${visitFormTimeSlot}) at ${visitFormAddress}.`
                    });
                    setIsVisitModalOpen(false);
                    setCrmViewFilter('visits');
                  } else {
                    alert('Could not schedule the inspection visit. Please verify connection.');
                  }
                } finally {
                  setIsVisitSaving(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={visitFormFirstName}
                    onChange={(e) => setVisitFormFirstName(e.target.value)}
                    placeholder="e.g. Robert"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={visitFormLastName}
                    onChange={(e) => setVisitFormLastName(e.target.value)}
                    placeholder="e.g. Martinez"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={visitFormPhone}
                    onChange={(e) => setVisitFormPhone(e.target.value)}
                    placeholder="(317) 000-0000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={visitFormEmail}
                    onChange={(e) => setVisitFormEmail(e.target.value)}
                    placeholder="client@email.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Property Address to Inspect *</label>
                <input
                  type="text"
                  required
                  value={visitFormAddress}
                  onChange={(e) => setVisitFormAddress(e.target.value)}
                  placeholder="Street Address, Suite/Unit"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={visitFormCity}
                    onChange={(e) => setVisitFormCity(e.target.value)}
                    placeholder="Indianapolis, Carmel..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Inspection Date *</label>
                  <input
                    type="date"
                    required
                    value={visitFormDate}
                    onChange={(e) => setVisitFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Preferred Time Window *</label>
                  <select
                    value={visitFormTimeSlot}
                    onChange={(e) => setVisitFormTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
                    <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                    <option value="Late Afternoon (4:00 PM - 6:00 PM)">Late Afternoon (4:00 PM - 6:00 PM)</option>
                    <option value="Saturday Morning (9:00 AM - 1:00 PM)">Saturday Morning (9:00 AM - 1:00 PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Project Scope to Inspect *</label>
                <select
                  value={visitFormService}
                  onChange={(e) => setVisitFormService(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Commercial and Residential Project Management">Commercial &amp; Residential Project Management</option>
                  <option value="Comercial General Contractor">Comercial General Contractor</option>
                  <option value="Construction of Houses and Buildings">Construction of Houses and Buildings</option>
                  <option value="General Renovations">General Renovations</option>
                  <option value="Vinyl &amp; Hardie Siding">Vinyl &amp; Hardie Siding</option>
                  <option value="Composite Decking &amp; Pergolas">Composite Decking &amp; Pergolas</option>
                  <option value="Roofing &amp; Seamless Gutters">Roofing &amp; Seamless Gutters</option>
                  <option value="Doors, Windows &amp; Drywall">Doors, Windows &amp; Drywall</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Inspection Notes &amp; Property Specifications</label>
                <textarea
                  rows={3}
                  value={visitFormNotes}
                  onChange={(e) => setVisitFormNotes(e.target.value)}
                  placeholder="Project scope details, approximate dimensions, property access instructions..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsVisitModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVisitSaving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5"
                >
                  {isVisitSaving ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Confirm &amp; Schedule Visit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
