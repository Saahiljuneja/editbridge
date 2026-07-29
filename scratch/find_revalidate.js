const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, '..', 'node_modules', 'next'));
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('revalidateTag')) {
    console.log('Found revalidateTag in:', file);
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('revalidateTag')) {
        console.log(`  Line ${index + 1}: ${line}`);
      }
    });
  }
});
