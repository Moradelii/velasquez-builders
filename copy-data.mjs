// Copia los datos públicos del CMS a dist/data, dist/, public/data y public/
// Genera default-config.js para garantizar carga instantánea offline y estática
// (Cloudflare Pages y SiteGround) sin depender de servidores Node activos.
// NO copia leads.json ni crmData.json (datos privados de clientes).
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

for (const file of ['config.json', 'portfolioData.json']) {
  const src = path.join(root, file);
  if (!fs.existsSync(src)) {
    console.error(`❌ Falta ${file} en la raíz del proyecto`);
    process.exit(1);
  }
  for (const targetDir of targets) {
    const dest = path.join(targetDir, file);
    fs.copyFileSync(src, dest);
  }
  console.log(`✅ ${file} sincronizado en dist/data/, dist/, public/data/ y public/`);
}

// Generar default-config.js con los datos base para asegurar renderizado 100% inmediato
try {
  const cfgContent = fs.readFileSync(path.join(root, 'config.json'), 'utf8');
  const portContent = fs.readFileSync(path.join(root, 'portfolioData.json'), 'utf8');
  
  const jsCode = `// Velasquez Builders - Pre-bundled default configuration for instant static rendering\nwindow.__DEFAULT_VB_CONFIG__ = ${cfgContent.trim()};\nwindow.__DEFAULT_PORTFOLIO__ = ${portContent.trim()};\n`;

  const scriptTargets = [
    path.join(root, 'public', 'default-config.js'),
    path.join(root, 'dist', 'default-config.js')
  ];

  for (const st of scriptTargets) {
    fs.writeFileSync(st, jsCode, 'utf8');
  }
  console.log(`✅ default-config.js generado en public/ y dist/`);
} catch (err) {
  console.error(`⚠️ Error al generar default-config.js:`, err.message);
}
