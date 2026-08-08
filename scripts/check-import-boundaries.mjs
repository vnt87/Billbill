import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const billDirs = [
  path.join(rootDir, 'src/components'),
  path.join(rootDir, 'src/lib'),
  path.join(rootDir, 'functions/api/bills'),
];

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) getAllFiles(filePath, fileList);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(file)) fileList.push(filePath);
  }
  return fileList;
}

const violations = [];
for (const dir of billDirs) {
  for (const file of getAllFiles(dir)) {
    const content = fs.readFileSync(file, 'utf8');
    if (/from\s+['"][^'"]*tournaments[^'"]*['"]|import\s*\(['"][^'"]*tournaments[^'"]*['"]\)/.test(content)) {
      violations.push(path.relative(rootDir, file));
    }
  }
}

if (violations.length) {
  console.error('Bill app import boundary violations found:');
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log('Bill app import boundary check passed!');
