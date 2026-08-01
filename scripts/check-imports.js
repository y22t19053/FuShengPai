// ===== scripts/check-imports.js · 导入门禁（ESM 版） =====
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
}

walk(srcDir);

let failed = false;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  const matches = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)];
  for (const m of matches) {
    const spec = m[1];
    if (!spec.startsWith('.')) continue;
    let target = path.resolve(path.dirname(file), spec);
    if (!target.endsWith('.js')) target += '.js';
    if (!fs.existsSync(target)) {
      console.error(`❌ ${rel}: import '${spec}' 找不到目标文件 ${target}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('✅ import 检查通过');