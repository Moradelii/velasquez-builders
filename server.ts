import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const CONFIG_PATH = path.join(process.cwd(), "config.json");
  const LEADS_PATH = path.join(process.cwd(), "leads.json");
  const CRM_DATA_PATH = path.join(process.cwd(), "crmData.json");
  const PORTFOLIO_PATH = path.join(process.cwd(), "portfolioData.json");

  // Ensure JSON database storage files exist
  if (!fs.existsSync(CRM_DATA_PATH)) {
    fs.writeFileSync(CRM_DATA_PATH, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(LEADS_PATH)) {
    fs.writeFileSync(LEADS_PATH, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(PORTFOLIO_PATH)) {
    fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify([], null, 2), "utf-8");
  }

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  const PUBLIC_DIR = path.join(process.cwd(), "public");
  const IMAGES_DIR = path.join(PUBLIC_DIR, "images");

  // Ensure media directories exist
  ["gallery", "logo", "video"].forEach((sub) => {
    fs.mkdirSync(path.join(IMAGES_DIR, sub), { recursive: true });
  });

  // Anti-cache headers for all API calls, JSON database files, HTML documents, and dynamic entrypoints
  app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    const isDynamic =
      p.startsWith("/api") ||
      p.endsWith(".html") ||
      p.endsWith(".json") ||
      p === "" ||
      p === "/" ||
      p === "/admin" ||
      p === "/homes";

    if (isDynamic) {
      const origSetHeader = res.setHeader;
      res.setHeader = function (field: string, val: any) {
        if (typeof field === "string" && field.toLowerCase() === "cache-control") {
          return origSetHeader.call(
            this,
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
          );
        }
        return origSetHeader.call(this, field, val);
      };
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    }
    next();
  });

  // =========================================================================
  // MEDIA VALIDATION & UPLOAD (Zero false-positives, allows webp, jpeg, png, mp4)
  // =========================================================================
  function validateMediaFileLenient(folder: string, filename: string, mimeType?: string) {
    const ext = path.extname(filename).toLowerCase();

    if (folder === "gallery") {
      const allowedGalleryExts = [".webp", ".jpeg", ".jpg", ".png"];
      if (!allowedGalleryExts.includes(ext)) {
        return {
          valid: false,
          error: `Subcarpeta 'gallery': Formatos permitidos: '.webp', '.jpg', '.jpeg', '.png'. Se detectó '${ext}'.`,
        };
      }
    } else if (folder === "logo") {
      const allowedLogoExts = [".png", ".ico"];
      if (!allowedLogoExts.includes(ext)) {
        return {
          valid: false,
          error: `Subcarpeta 'logo': Permitir única y exclusivamente formatos '.png' o '.ico' para transparencias.`,
        };
      }
    } else if (folder === "video") {
      if (ext !== ".mp4") {
        return {
          valid: false,
          error: `Subcarpeta 'video': Permitir única y exclusivamente formato de video '.mp4' con codificación web H.264.`,
        };
      }
    } else {
      return {
        valid: false,
        error: `Subcarpeta destino no reconocida: '${folder}'. Solo 'gallery', 'logo', o 'video'.`,
      };
    }

    return { valid: true };
  }

  // GET /api/media - Catalog of public assets
  app.get("/api/media", (req, res) => {
    try {
      const result: Record<string, any[]> = { gallery: [], logo: [], video: [] };
      ["gallery", "logo", "video"].forEach((folder) => {
        const dirPath = path.join(IMAGES_DIR, folder);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          result[folder] = files
            .filter((f) => !f.startsWith("."))
            .map((f) => {
              const stat = fs.statSync(path.join(dirPath, f));
              return {
                filename: f,
                path: `/images/${folder}/${f}`,
                size: stat.size,
                updatedAt: stat.mtimeMs,
                urlWithCacheBuster: `/images/${folder}/${f}?v=${Math.round(stat.mtimeMs)}`,
              };
            })
            .sort((a, b) => a.filename.localeCompare(b.filename));
        }
      });
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: "Error reading media directory", details: error.message });
    }
  });

  // POST /api/upload - Upload and save media file
  app.post("/api/upload", (req, res) => {
    try {
      const { folder, filename, fileBase64, mimeType } = req.body;

      if (!folder || !filename || !fileBase64) {
        return res.status(400).json({
          success: false,
          error: "Parámetros incompletos (folder, filename y fileBase64 requeridos)",
        });
      }

      const cleanFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
      const validation = validateMediaFileLenient(folder, cleanFilename, mimeType);
      if (!validation.valid) {
        return res.status(400).json({ success: false, error: validation.error });
      }

      const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const targetPath = path.join(IMAGES_DIR, folder, cleanFilename);
      fs.writeFileSync(targetPath, buffer);

      const now = Date.now();
      const absoluteWebPath = `/images/${folder}/${cleanFilename}`;
      const cacheBustedUrl = `${absoluteWebPath}?v=${now}`;

      console.log(`✅ Archivo guardado: ${targetPath} (${buffer.length} bytes)`);

      return res.status(200).json({
        success: true,
        folder,
        filename: cleanFilename,
        path: absoluteWebPath,
        urlWithCacheBuster: cacheBustedUrl,
        timestamp: now,
        size: buffer.length,
        data: {
          path: absoluteWebPath,
          urlWithCacheBuster: cacheBustedUrl,
        },
      });
    } catch (error: any) {
      console.error("Error saving media:", error);
      return res.status(500).json({
        success: false,
        error: "Error al procesar y guardar el archivo",
        details: error.message,
      });
    }
  });

  // DELETE /api/media
  app.delete("/api/media", (req, res) => {
    try {
      const { folder, filename } = req.body;
      if (!folder || !filename) {
        return res.status(400).json({ success: false, error: "Se requieren 'folder' y 'filename'" });
      }
      const cleanFilename = path.basename(filename);
      const targetPath = path.join(IMAGES_DIR, folder, cleanFilename);

      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        return res.status(200).json({ success: true, folder, filename: cleanFilename, timestamp: Date.now() });
      } else {
        return res.status(404).json({ success: false, error: "Archivo no encontrado" });
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, error: "Error al eliminar archivo", details: error.message });
    }
  });

  // =========================================================================
  // CONFIGURATION ENDPOINTS (config.json)
  // =========================================================================
  const handleConfigGet = (req: any, res: any) => {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH, "utf-8");
        const parsed = JSON.parse(data);
        const portData = readPortfolioData();
        if (Array.isArray(portData) && portData.length > 0) {
          parsed.portfolio = portData;
        }
        return res.status(200).json(parsed);
      }
      return res.status(200).json({});
    } catch (error: any) {
      return res.status(500).json({ success: false, error: "Could not read config.json", details: error.message });
    }
  };

  const handleConfigSave = (req: any, res: any) => {
    try {
      const newConfig = req.body;
      if (!newConfig || typeof newConfig !== "object") {
        return res.status(400).json({ success: false, error: "Invalid config body" });
      }

      // Sync portfolio array in config with portfolioData.json if present
      if (Array.isArray(newConfig.portfolio)) {
        try {
          const portfolioItems = newConfig.portfolio.map((p: any, idx: number) => {
            const loc = p.location || "Indianapolis, IN";
            const svc = p.svc || "Construction";
            const catLoc = p.categoryLocation || `${svc} • ${loc}`;
            const img = p.imageUrl || p.url || "/images/gallery/01.webp";
            return {
              id: String(p.id || idx + 1),
              imageUrl: img,
              url: img,
              title: p.title || `Project #${idx + 1}`,
              categoryLocation: catLoc,
              location: loc,
              svc: svc,
              description: p.description || p.desc || p.title || "",
              updatedAt: new Date().toISOString(),
            };
          });
          writeSyncedPortfolio(portfolioItems);
          newConfig.portfolio = portfolioItems;
        } catch (e) {
          console.warn("Notice: could not sync portfolioData.json from config", e);
        }
      }

      writeSyncedConfig(newConfig);

      return res.status(200).json({
        success: true,
        timestamp: Date.now(),
        data: newConfig,
      });
    } catch (error: any) {
      console.error("Error saving config:", error);
      return res.status(500).json({ success: false, error: "Could not write config.json", details: error.message });
    }
  };

  app.get("/api/config", handleConfigGet);
  app.post("/api/config", handleConfigSave);
  app.post("/api/config/save", handleConfigSave);
  app.put("/api/config", handleConfigSave);
  app.put("/api/config/save", handleConfigSave);

  // Direct JSON file access aliases with guaranteed anti-cache headers
  app.get(["/config.json", "/config"], handleConfigGet);

  // Helper functions to persist data simultaneously to root, public/data and dist/data
  function writeSyncedConfig(newConfig: any) {
    const json = JSON.stringify(newConfig, null, 2);
    const paths = [
      CONFIG_PATH,
      path.resolve(process.cwd(), "public", "data", "config.json"),
      path.resolve(process.cwd(), "public", "config.json"),
      path.resolve(process.cwd(), "dist", "data", "config.json"),
      path.resolve(process.cwd(), "dist", "config.json"),
    ];
    for (const p of paths) {
      try {
        const dir = path.dirname(p);
        if (p.includes("dist") && !fs.existsSync(path.resolve(process.cwd(), "dist"))) continue;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, json, "utf-8");
      } catch (e) {}
    }

    try {
      let portData: any = [];
      if (Array.isArray(newConfig.portfolio)) {
        portData = newConfig.portfolio;
      } else if (fs.existsSync(PORTFOLIO_PATH)) {
        portData = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, "utf-8"));
      }
      const jsCode = `// Velasquez Builders - Pre-bundled default configuration for instant static rendering\nwindow.__DEFAULT_VB_CONFIG__ = ${json};\nwindow.__DEFAULT_PORTFOLIO__ = ${JSON.stringify(portData)};\n`;
      const scriptPaths = [
        path.resolve(process.cwd(), "public", "default-config.js"),
        path.resolve(process.cwd(), "dist", "default-config.js"),
      ];
      for (const sp of scriptPaths) {
        if (sp.includes("dist") && !fs.existsSync(path.resolve(process.cwd(), "dist"))) continue;
        fs.writeFileSync(sp, jsCode, "utf-8");
      }
    } catch (e) {}
  }

  // =========================================================================
  // PORTFOLIO DATABASE ENDPOINTS (portfolioData.json)
  // =========================================================================
  function readPortfolioData(): any[] {
    try {
      if (fs.existsSync(PORTFOLIO_PATH)) {
        const raw = fs.readFileSync(PORTFOLIO_PATH, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return list.sort((a: any, b: any) => Number(a.id || 0) - Number(b.id || 0));
        }
      }
    } catch (e) {
      console.error("Error reading portfolioData.json:", e);
    }
    return [];
  }

  function writeSyncedPortfolio(data: any[]) {
    if (Array.isArray(data)) {
      data.sort((a: any, b: any) => Number(a.id || 0) - Number(b.id || 0));
    }
    const json = JSON.stringify(data, null, 2);
    const paths = [
      PORTFOLIO_PATH,
      path.resolve(process.cwd(), "public", "data", "portfolioData.json"),
      path.resolve(process.cwd(), "public", "portfolioData.json"),
      path.resolve(process.cwd(), "dist", "data", "portfolioData.json"),
      path.resolve(process.cwd(), "dist", "portfolioData.json"),
    ];
    for (const p of paths) {
      try {
        const dir = path.dirname(p);
        if (p.includes("dist") && !fs.existsSync(path.resolve(process.cwd(), "dist"))) continue;
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, json, "utf-8");
      } catch (e) {}
    }
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        parsed.portfolio = data;
        writeSyncedConfig(parsed);
      } catch (e) {
        console.warn("Could not sync config.json portfolio property:", e);
      }
    }
  }

  function writePortfolioData(data: any[]) {
    writeSyncedPortfolio(data);
  }

  // GET /api/portfolio
  app.get("/api/portfolio", (req, res) => {
    try {
      const items = readPortfolioData();
      return res.status(200).json(items);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: "Could not read portfolioData.json", details: error.message });
    }
  });

  // POST / PUT /api/portfolio/update & /api/portfolio/save
  const handlePortfolioUpdate = (req: any, res: any) => {
    try {
      const payload = req.body;
      let items = readPortfolioData();

      // Case 1: Bulk array replacement or wrapped array
      if (Array.isArray(payload)) {
        items = payload;
        writePortfolioData(items);
        return res.status(200).json({
          success: true,
          items,
          count: items.length,
          timestamp: Date.now(),
          data: items,
        });
      }

      if (payload && Array.isArray(payload.items)) {
        items = payload.items;
        writePortfolioData(items);
        return res.status(200).json({
          success: true,
          items,
          count: items.length,
          timestamp: Date.now(),
          data: items,
        });
      }

      // Case 2: Single portfolio item update or insert
      const { id, imageUrl, title, categoryLocation, description } = payload || {};
      if (!id && !imageUrl) {
        return res.status(400).json({ success: false, error: "Item requires 'id' or 'imageUrl'" });
      }

      const index = items.findIndex(
        (it: any) => String(it.id) === String(id) || (imageUrl && it.imageUrl === imageUrl)
      );

      let cleanImageUrl = imageUrl;
      if (cleanImageUrl && cleanImageUrl.startsWith("public/")) {
        cleanImageUrl = "/" + cleanImageUrl.slice(7);
      }

      let targetItem: any;

      if (index !== -1) {
        items[index] = {
          ...items[index],
          ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {}),
          ...(title !== undefined ? { title } : {}),
          ...(categoryLocation !== undefined ? { categoryLocation } : {}),
          ...(description !== undefined ? { description } : {}),
          updatedAt: new Date().toISOString(),
        };
        targetItem = items[index];
      } else {
        targetItem = {
          id: id || String(items.length + 1),
          imageUrl: cleanImageUrl || "/images/gallery/01.webp",
          title: title || "New Project",
          categoryLocation: categoryLocation || "General Construction",
          description: description || "",
          updatedAt: new Date().toISOString(),
        };
        items.push(targetItem);
      }

      writePortfolioData(items);

      // Also sync to config.json's portfolio list
      try {
        if (fs.existsSync(CONFIG_PATH)) {
          const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
          if (!Array.isArray(cfg.portfolio)) cfg.portfolio = [];
          const cfgIdx = cfg.portfolio.findIndex(
            (p: any, i: number) => String(p.id || i + 1) === String(targetItem.id) || p.url === targetItem.imageUrl || p.imageUrl === targetItem.imageUrl
          );
          const updatedConfigItem = {
            id: String(targetItem.id),
            url: targetItem.imageUrl,
            imageUrl: targetItem.imageUrl,
            title: targetItem.title,
            location: targetItem.categoryLocation ? targetItem.categoryLocation.split("•").pop().trim() : "Indianapolis, IN",
            categoryLocation: targetItem.categoryLocation || "General Construction",
            svc: targetItem.categoryLocation ? targetItem.categoryLocation.split("•")[0].trim() : "Construction",
            description: targetItem.description || "",
          };
          if (cfgIdx !== -1) {
            cfg.portfolio[cfgIdx] = { ...cfg.portfolio[cfgIdx], ...updatedConfigItem };
          } else {
            cfg.portfolio.push(updatedConfigItem);
          }
          cfg.portfolio.sort((a: any, b: any) => Number(a.id || 0) - Number(b.id || 0));
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
        }
      } catch (e) {
        console.warn("Could not sync into config.json portfolio", e);
      }

      console.log(`✅ portfolioData.json guardado para item #${targetItem.id}`);
      return res.status(200).json({
        success: true,
        item: targetItem,
        items,
        timestamp: Date.now(),
        data: targetItem,
      });
    } catch (error: any) {
      console.error("Error updating portfolioData.json:", error);
      return res.status(500).json({
        success: false,
        error: "Could not update portfolioData.json",
        details: error.message,
      });
    }
  };

  app.post("/api/portfolio/update", handlePortfolioUpdate);
  app.put("/api/portfolio/update", handlePortfolioUpdate);
  app.post("/api/portfolio/save", handlePortfolioUpdate);
  app.put("/api/portfolio/save", handlePortfolioUpdate);
  app.post("/api/portfolio", handlePortfolioUpdate);

  // DELETE /api/portfolio/:id
  app.delete("/api/portfolio/:id", (req, res) => {
    try {
      const { id } = req.params;
      let items = readPortfolioData();
      const filtered = items.filter((it: any) => String(it.id) !== String(id));
      writePortfolioData(filtered);
      return res.status(200).json({
        success: true,
        items: filtered,
        timestamp: Date.now(),
        data: filtered,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: "Could not delete portfolio item", details: error.message });
    }
  });

  // =========================================================================
  // CRM LEADS ENDPOINTS (/api/crm/leads and /api/leads synced with crmData.json)
  // =========================================================================
  function readCrmData(): any[] {
    try {
      if (fs.existsSync(CRM_DATA_PATH)) {
        const raw = fs.readFileSync(CRM_DATA_PATH, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) return list;
      }
      if (fs.existsSync(LEADS_PATH)) {
        const raw = fs.readFileSync(LEADS_PATH, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) {
      console.error("Error reading CRM data:", e);
    }
    return [];
  }

  function writeCrmData(data: any[]) {
    fs.writeFileSync(CRM_DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
    fs.writeFileSync(LEADS_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  // GET CRM Leads
  const handleLeadsGet = (req: any, res: any) => {
    try {
      const leads = readCrmData();
      return res.status(200).json(leads);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: "Could not read leads", details: error.message });
    }
  };

  app.get("/api/crm/leads", handleLeadsGet);
  app.get("/api/leads", handleLeadsGet);

  // POST CRM Lead (Lead capture & creation with on-site inspection visit support)
  const handleLeadCreate = async (req: any, res: any) => {
    try {
      const leadData = req.body || {};
      const hasVisit = Boolean(
        leadData.visitRequested ||
        leadData.visitDate ||
        leadData.visitAddress
      );

      const lead = {
        id: "lead_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        createdAt: new Date().toISOString(),
        status: leadData.status || (hasVisit ? "Estimate Scheduled" : "New"),
        firstName: leadData.firstName || "",
        lastName: leadData.lastName || "",
        email: leadData.email || "",
        phone: leadData.phone || "",
        service: leadData.service || (hasVisit ? "On-Site Pre-Inspection Visit" : ""),
        projectType: leadData.projectType || "",
        timeline: leadData.timeline || "",
        budget: leadData.budget || "",
        description: leadData.description || "",
        source: leadData.source || (hasVisit ? "On-Site Visit Scheduler" : "Website Quote Form"),
        notes: leadData.notes || "",
        // On-Site Inspection Visit fields
        visitRequested: hasVisit,
        visitDate: leadData.visitDate || "",
        visitTimeSlot: leadData.visitTimeSlot || "Morning (8:00 AM - 12:00 PM)",
        visitAddress: leadData.visitAddress || "",
        visitCity: leadData.visitCity || "Indianapolis, IN",
        visitZip: leadData.visitZip || "",
        visitNotes: leadData.visitNotes || "",
        visitStatus: leadData.visitStatus || (hasVisit ? "Confirmed" : "Pending"),
        history: leadData.history || [
          {
            timestamp: new Date().toISOString(),
            action: hasVisit ? "On-Site Inspection Booked" : "Lead Captured",
            details: hasVisit
              ? `Inspection scheduled for ${leadData.visitDate || 'upcoming date'} (${leadData.visitTimeSlot || 'Morning'}) at ${leadData.visitAddress || 'Client Residence'}`
              : `Received via ${leadData.source || "Website Quote Form"}`,
          },
        ],
      };

      let leads = readCrmData();
      leads.unshift(lead);
      writeCrmData(leads);

      // Optional External Webhook Dispatch
      if (process.env.CRM_WEBHOOK_URL) {
        try {
          await fetch(process.env.CRM_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lead),
          });
        } catch (webhookErr) {
          console.warn("External CRM Webhook delivery notice:", webhookErr);
        }
      }

      return res.status(201).json({
        success: true,
        timestamp: Date.now(),
        lead,
        data: lead,
      });
    } catch (error: any) {
      console.error("Error creating lead:", error);
      return res.status(500).json({ success: false, error: "Could not save lead", details: error.message });
    }
  };

  app.post("/api/crm/leads", handleLeadCreate);
  app.post("/api/leads", handleLeadCreate);
  app.post("/api/crm/inspections", handleLeadCreate);
  app.post("/api/inspections", handleLeadCreate);

  // GET Inspection Visits
  app.get("/api/crm/inspections", (req, res) => {
    try {
      const allLeads = readCrmData();
      const inspections = allLeads.filter(
        (l: any) => l.visitRequested === true || Boolean(l.visitDate) || Boolean(l.visitAddress)
      );
      return res.status(200).json(inspections);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: "Could not read inspections", details: err.message });
    }
  });

  // PUT CRM Lead (Update status / notes)
  const handleLeadUpdate = (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      let leads = readCrmData();
      const idx = leads.findIndex((l: any) => l.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: "Lead not found" });
      }

      const prevStatus = leads[idx].status;
      leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };

      if (!leads[idx].history) leads[idx].history = [];
      if (updates.status && updates.status !== prevStatus) {
        leads[idx].history.push({
          timestamp: new Date().toISOString(),
          action: "Status Changed",
          details: `Changed from "${prevStatus}" to "${updates.status}"`,
        });
      }
      if (updates.noteAdded) {
        leads[idx].history.push({
          timestamp: new Date().toISOString(),
          action: "Note Added",
          details: updates.noteAdded,
        });
      }

      writeCrmData(leads);
      return res.status(200).json({
        success: true,
        timestamp: Date.now(),
        lead: leads[idx],
        data: leads[idx],
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: "Could not update lead", details: error.message });
    }
  };

  app.put("/api/crm/leads/:id", handleLeadUpdate);
  app.put("/api/leads/:id", handleLeadUpdate);

  // DELETE CRM Lead
  const handleLeadDelete = (req: any, res: any) => {
    try {
      const { id } = req.params;
      let leads = readCrmData();
      leads = leads.filter((l: any) => l.id !== id);
      writeCrmData(leads);
      return res.status(200).json({ success: true, timestamp: Date.now() });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: "Could not delete lead", details: error.message });
    }
  };

  app.delete("/api/crm/leads/:id", handleLeadDelete);
  app.delete("/api/leads/:id", handleLeadDelete);

  // =========================================================================
  // VITE & STATIC FILES
  // =========================================================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.get(["/admin", "/admin.html"], (req, res) => {
      res.redirect(301, "/?panel=cms");
    });
    app.get(["/homes", "/homes.html"], (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(process.cwd(), "index.html"));
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          const lower = filePath.toLowerCase();
          if (lower.endsWith(".html") || lower.endsWith(".json")) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            res.setHeader("Surrogate-Control", "no-store");
          } else if (lower.includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else {
            res.setHeader("Cache-Control", "no-cache, must-revalidate, max-age=0");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          }
        },
      })
    );
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Serve static images directly from both public/images and root images
  app.use("/images", express.static(path.join(process.cwd(), "public", "images")));
  app.use("/images", express.static(path.join(process.cwd(), "images")));
  app.use("/public/images", express.static(path.join(process.cwd(), "public", "images")));

  // Serve static CSS directly from public/css and css
  app.use("/css", express.static(path.join(process.cwd(), "public", "css")));
  app.use("/css", express.static(path.join(process.cwd(), "css")));

  // Serve static data directory for JSON configuration and portfolio
  app.use("/data", express.static(path.join(process.cwd(), "public", "data")));
  app.use("/data", express.static(path.join(process.cwd(), "dist", "data")));

  // Serve reload.js client directly
  app.get("/reload.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-cache");
    const reloadPath = path.join(process.cwd(), "public", "reload.js");
    if (fs.existsSync(reloadPath)) {
      res.sendFile(reloadPath);
    } else {
      res.sendFile(path.join(process.cwd(), "reload.js"));
    }
  });

  // Create unified HTTP + WebSocket Server to handle real-time HMR and dynamic reload
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const rawUrl = request.url || "";
    // Cleanly handle both /ws, /ws/ws, and any trailing variations without connection errors
    if (rawUrl === "/ws" || rawUrl === "/ws/ws" || rawUrl.startsWith("/ws")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log("\n  \x1b[32m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   \x1b[36mhttp://localhost:3000/\x1b[0m");
    console.log("  \x1b[32m➜\x1b[0m  \x1b[1mNetwork:\x1b[0m \x1b[36mhttp://192.168.100.4:3000/\x1b[0m");
    console.log("  \x1b[2m➜  press \x1b[1mh + enter\x1b[0m\x1b[2m to show help\x1b[0m\n");
  });
}

startServer();
