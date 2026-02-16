const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const extDir = path.join(__dirname, '..', 'extension');
const outPath = path.join(__dirname, '..', 'extension.zip');

if (!fs.existsSync(extDir)) {
  console.error('extension folder not found');
  process.exit(1);
}

const output = fs.createWriteStream(outPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => console.log('Created extension.zip'));
archive.pipe(output);
archive.directory(extDir, false);
archive.finalize();
