import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const billDomainPatterns = [
  'src/types',
  'src/lib/api',
  'src/components/pages/Calculator',
  'src/components/pages/History',
  'src/components/pages/BillDetails',
  'functions/api/bills'
];

const tournamentDomainDirs = [
  path.join(rootDir, 'src/features/tournaments'),
  path.join(rootDir, 'shared/tournaments'),
  path.join(rootDir, 'functions/api/tournaments'),
  path.join(rootDir, 'functions/_shared/tournaments')
];

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

let violations = [];

// 1. Check that tournament files do not import bill domain modules
for (const tournamentDir of tournamentDomainDirs) {
  const files = getAllFiles(tournamentDir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(rootDir, file);

    for (const pattern of billDomainPatterns) {
      // Check import / require statements
      const regex = new RegExp(`from\\s+['"]([^'"]*${pattern}[^'"]*)['"]|import\\s*\\(['"]([^'"]*${pattern}[^'"]*)['"]\\)`, 'g');
      if (regex.test(content)) {
        violations.push(`${relativePath} illegally imports bill module matching "${pattern}"`);
      }
    }
  }
}

// 2. Check that bill files do not import tournament modules
const billDirs = [
  path.join(rootDir, 'src/components'),
  path.join(rootDir, 'src/lib'),
  path.join(rootDir, 'functions/api/bills')
];

for (const billDir of billDirs) {
  const files = getAllFiles(billDir);
  for (const file of files) {
    const relativePath = path.relative(rootDir, file);
    // Ignore tournament feature directory if nested under src/components (it's in src/features anyway)
    if (relativePath.includes('tournaments')) continue;

    const content = fs.readFileSync(file, 'utf-8');
    if (/from\s+['"].*tournaments.*['"]|import\s*\(['"].*tournaments.*['"]\)/.test(content)) {
      violations.push(`${relativePath} illegally imports tournament module`);
    }
  }
}

if (violations.length > 0) {
  console.error('❌ Import boundary violations found:');
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
} else {
  console.log('✅ Import boundary check passed!');
}
