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
