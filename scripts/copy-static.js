const fs = require('fs');
const path = require('path');

const files = ['index.html', 'styles.css', 'titlebar.css'];
const sourceDir = path.resolve(__dirname, '../src/renderer');
const targetDir = path.resolve(__dirname, '../dist/renderer');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const file of files) {
  const source = path.join(sourceDir, file);
  const target = path.join(targetDir, file);

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${file} to dist/renderer`);
  } else {
    console.warn(`Warning: ${source} not found`);
  }
}

// Copy assets directory
const assetsSourceDir = path.resolve(__dirname, '../assets');
const assetsTargetDir = path.resolve(__dirname, '../dist/assets');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(assetsSourceDir)) {
  copyDirectory(assetsSourceDir, assetsTargetDir);
  console.log('Copied assets directory to dist/assets');
} else {
  console.warn('Warning: assets directory not found');
}
