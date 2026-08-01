// ===== scripts/check-imports.js · 导入完整性检查（增强版） =====
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exportCache = new Map();

function listFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'scripts') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(listFiles(full));
    else if (/\.(js|mjs)$/.test(entry.name)) results.push(full);
  }
  return results;
}

// 解析文件的导出名称（支持 async function、export * from 等）
function findExportNames(file) {
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();

  // 匹配 export function / async function / const / let / var / class
  const re = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(src)) !== null) names.add(m[1]);

  // 匹配 export { a, b } 或 export { a as b }
  const re2 = /export\s*\{([^}]+)\}/g;
  while ((m = re2.exec(src)) !== null) {
    m[1].split(',').forEach(s => {
      const name = s.trim().split(/\s+as\s+/)[1]?.trim() || s.trim();
      if (name) names.add(name);
    });
  }

  // 匹配 export * from './xxx' （递归解析再导出）
  const re3 = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
  while ((m = re3.exec(src)) !== null) {
    const from = m[1];
    if (!from.startsWith('.')) continue;
    let target = path.resolve(path.dirname(file), from);
    if (!fs.existsSync(target)) target += '.js';
    if (fs.existsSync(target)) {
      const subNames = getExports(target);
      for (const n of subNames) names.add(n);
    }
  }

  return names;
}

function getExports(file) {
  if (!exportCache.has(file)) exportCache.set(file, findExportNames(file));
  return exportCache.get(file);
}

let failed = false;
for (const file of listFiles(root)) {
  const src = fs.readFileSync(file, 'utf8');
  const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(src)) !== null) {
    const importedNames = m[1].split(',').map(s => (s.trim().split(/\s+as\s+/)[1] || s.trim()).trim()).filter(Boolean);
    const from = m[2];
    if (!from.startsWith('.')) continue;
    let target = path.resolve(path.dirname(file), from);
    if (!fs.existsSync(target)) target += '.js';
    if (!fs.existsSync(target)) {
      console.error(`❌ ${file}: 导入路径不存在 ${from}`);
      failed = true;
      continue;
    }
    const exports = getExports(target);
    for (const name of importedNames) {
      if (!exports.has(name)) {
        console.error(`❌ ${file}: 导入 '${name}' 在 ${from} 中不存在`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log('✅ 所有导入均匹配目标文件导出。');