// Copia los datos públicos del CMS a dist/data para que el sitio estático (Cloudflare Pages)
// los lea sin servidor. NO copia leads.json ni crmData.json (datos privados de clientes).
import fs from 'node:fs';
import path from 'node:path';

const out = path.join(process.cwd(), 'dist', 'data');
fs.mkdirSync(out, { recursive: true });

for (const file of ['config.json', 'portfolioData.json']) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Falta ${file} en la raíz del proyecto`);
    process.exit(1);
  }
  fs.copyFileSync(file, path.join(out, file));
  console.log(`✅ ${file} -> dist/data/${file}`);
}
