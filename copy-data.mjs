// Sincroniza datos estáticos para Cloudflare Pages y SiteGround
// Garantiza que el System Dashboard y el sitio funcionen al 100% sin servidor Node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  path.join(root, 'dist', 'data'),
  path.join(root, 'dist'),
  path.join(root, 'public', 'data'),
  path.join(root, 'public')
];

for (const targetDir of targets) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Sincronizar archivos de datos
const dataFiles = ['config.json', 'portfolioData.json', 'leads.json', 'crmData.json'];
for (const file of dataFiles) {
  const src = path.join(root, file);
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ Archivo ${file} no encontrado en la raíz`);
    continue;
  }
  for (const targetDir of targets) {
    const dest = path.join(targetDir, file);
    fs.copyFileSync(src, dest);
  }
  console.log(`✅ ${file} sincronizado en dist/data/, dist/, public/data/ y public/`);
}

// 2. Generar mediaCatalog.json escaneando la arquitectura pública de imágenes
function buildMediaCatalog() {
  const catalog = { gallery: [], logo: [], video: [] };
  const baseDir = path.join(root, 'public', 'images');

  ['gallery', 'logo', 'video'].forEach((folder) => {
    const folderPath = path.join(baseDir, folder);
    if (!fs.existsSync(folderPath)) return;

    function scan(currentDir, relPrefix) {
      const entries = fs.readdirSync(currentDir);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const fullPath = path.join(currentDir, entry);
        const rel = relPrefix ? `${relPrefix}/${entry}` : entry;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scan(fullPath, rel);
        } else {
          catalog[folder].push({
            filename: entry,
            path: `/images/${folder}/${rel}`,
            size: stat.size,
            updatedAt: Math.round(stat.mtimeMs),
            urlWithCacheBuster: `/images/${folder}/${rel}?v=${Math.round(stat.mtimeMs)}`
          });
        }
      }
    }

    scan(folderPath, '');
    catalog[folder].sort((a, b) => a.filename.localeCompare(b.filename));
  });

  return catalog;
}

const mediaCatalog = buildMediaCatalog();
const mediaCatalogJson = JSON.stringify(mediaCatalog, null, 2);

for (const targetDir of targets) {
  const dest = path.join(targetDir, 'mediaCatalog.json');
  fs.writeFileSync(dest, mediaCatalogJson, 'utf8');
}
console.log(`✅ mediaCatalog.json generado con éxito (${mediaCatalog.gallery.length} fotos, ${mediaCatalog.logo.length} logos, ${mediaCatalog.video.length} videos)`);

// 3. Generar default-config.js con todos los datos precargados para 0ms de espera
try {
  const cfgContent = fs.existsSync(path.join(root, 'config.json'))
    ? fs.readFileSync(path.join(root, 'config.json'), 'utf8')
    : '{}';
  const portContent = fs.existsSync(path.join(root, 'portfolioData.json'))
    ? fs.readFileSync(path.join(root, 'portfolioData.json'), 'utf8')
    : '[]';
  const leadsContent = fs.existsSync(path.join(root, 'leads.json'))
    ? fs.readFileSync(path.join(root, 'leads.json'), 'utf8')
    : '[]';

  const jsCode = `// Velasquez Builders - Pre-bundled default configuration for instant static rendering & dashboard
window.__DEFAULT_VB_CONFIG__ = ${cfgContent.trim()};
window.__DEFAULT_PORTFOLIO__ = ${portContent.trim()};
window.__DEFAULT_LEADS__ = ${leadsContent.trim()};
window.__DEFAULT_MEDIA__ = ${mediaCatalogJson.trim()};
`;

  const scriptTargets = [
    path.join(root, 'public', 'default-config.js'),
    path.join(root, 'dist', 'default-config.js')
  ];

  for (const st of scriptTargets) {
    fs.writeFileSync(st, jsCode, 'utf8');
  }
  console.log(`✅ default-config.js generado en public/ y dist/ con configuración, portafolio, leads y medios.`);
} catch (err) {
  console.error(`⚠️ Error al generar default-config.js:`, err.message);
}
