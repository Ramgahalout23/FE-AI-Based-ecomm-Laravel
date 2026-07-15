/**
 * Remove all unused imports from admin JSX files in one pass.
 * Runs eslint once with JSON output, parses results, then fixes files.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

console.log('1. Running eslint on admin pages...');
const stdout = execSync(
  `npx eslint src/pages/admin/ src/components/admin/ --no-ignore --max-warnings 200 --format json 2>&1 || true`,
  { cwd: root, timeout: 120000, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
);

const data = JSON.parse(stdout);
const fileErrors = {};

for (const file of data) {
  if (!file.filePath || !file.messages) continue;
  const errors = file.messages.filter(
    m => m.ruleId === 'no-unused-vars' && m.message.includes("defined but never used")
  );
  if (errors.length > 0) {
    fileErrors[file.filePath] = errors.map(e => ({
      line: e.line,
      name: e.message.match(/'([^']+)'/)[1],
    }));
  }
}

const totalFiles = Object.keys(fileErrors).length;
const totalErrors = Object.values(fileErrors).flat().length;
console.log(`\nFound ${totalErrors} unused imports across ${totalFiles} files.\n`);

for (const [filePath, errors] of Object.entries(fileErrors)) {
  // Deduplicate names
  const names = [...new Set(errors.map(e => e.name))];
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;

  for (const importName of names) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes(importName) || !line.trim().startsWith('import ')) continue;

      // Case 1: Named imports: import { ..., X, ... } from '...'
      const braceMatch = line.match(/\{([^}]+?)\}/);
      if (braceMatch) {
        const insideBraces = braceMatch[1];
        const imports = insideBraces.split(',').map(s => s.trim()).filter(Boolean);
        
        const isPresent = imports.some(i => {
          const name = i.split(/\s+as\s+/).pop().trim();
          // Make sure it's not a comment artifact
          return name === importName && !name.startsWith('//');
        });
        if (!isPresent) continue;

        const filtered = imports.filter(i => {
          const name = i.split(/\s+as\s+/).pop().trim();
          return name !== importName;
        });

        if (filtered.length === 0) {
          // Remove the entire import line
          // Also clean up blank lines around it
          const prevBlank = i > 0 && lines[i - 1].trim() === '';
          const nextBlank = i < lines.length - 1 && lines[i + 1].trim() === '';
          
          if (prevBlank && nextBlank) {
            lines.splice(i, 1); // Remove just this line
          } else if (prevBlank) {
            lines.splice(i - 1, 2); // Remove blank line above + this line
            i--;
          } else {
            lines.splice(i, 1);
            i--;
          }
        } else {
          const newBraceContent = filtered.join(', ');
          lines[i] = line.replace(braceMatch[0], `{ ${newBraceContent} }`);
        }
        modified = true;
        break; // Found and processed this import name
      }

      // Case 2: Default import: import X from '...'
      const defMatch = line.match(/^import\s+(\w+)\s+from\s+['"]/);
      if (defMatch && defMatch[1] === importName) {
        // Check it's a real import statement, not a type only
        const prevBlank = i > 0 && lines[i - 1].trim() === '';
        if (prevBlank) {
          lines.splice(i - 1, 2);
          i--;
        } else {
          lines.splice(i, 1);
          i--;
        }
        modified = true;
        break;
      }
    }
  }

  if (modified) {
    const relPath = path.relative(root, filePath);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    const fixedCount = names.length;
    console.log(`  ${relPath}: removed ${fixedCount} unused import${fixedCount > 1 ? 's' : ''}`);
  }
}

console.log(`\n✅ Done! Fixed ${Object.keys(fileErrors).length} files.`);
