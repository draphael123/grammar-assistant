const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

(async () => {
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const extDir = path.join(root, 'extension');
const landingDir = path.join(root, 'landing');

// Create public directory
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy landing folder to public/landing
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyDir(landingDir, path.join(publicDir, 'landing'));
console.log('Copied landing/ to public/landing/');

// Create extension.zip in public
const zipPath = path.join(publicDir, 'extension.zip');
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

await new Promise((resolve, reject) => {
  output.on('close', () => { console.log('Created public/extension.zip'); resolve(); });
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(extDir, false);
  archive.finalize();
});
})();
