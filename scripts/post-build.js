import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const buildDir = path.resolve('build');

if (fs.existsSync(distDir)) {
  try {
    fs.cpSync(distDir, buildDir, { recursive: true });
    console.log('[Post-build] Mirrored dist/ to build/ for hosting platform compatibility.');
  } catch (err) {
    console.warn('[Post-build] Could not mirror dist to build:', err.message);
  }
}
