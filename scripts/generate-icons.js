const fs = require('fs');
const path = require('path');

// Simple script to generate PWA icons
// This creates simple colored square icons with the app emoji/initial

const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

// Create a simple SVG icon
const createSVG = (size) => {
  const bgColor = '#d97706'; // Amber-600
  const textColor = '#ffffff';
  const fontSize = size * 0.4;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bgColor}" rx="${size * 0.15}"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${fontSize}" 
    font-weight="bold" 
    fill="${textColor}" 
    text-anchor="middle" 
    dominant-baseline="central"
  >📔</text>
</svg>`;
};

// Since we can't generate PNG directly without a library, 
// we'll create SVG files and provide instructions
// OR we can create a simple HTML file that generates them

console.log('Generating icon SVGs...');

const publicDir = path.join(__dirname, '..', 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG files
sizes.forEach(({ size, name }) => {
  const svg = createSVG(size);
  const svgPath = path.join(publicDir, name.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svg);
  console.log(`Created ${svgPath}`);
});

console.log('\n✅ SVG icons created!');
console.log('\nTo convert SVG to PNG, you can:');
console.log('1. Use an online converter: https://cloudconvert.com/svg-to-png');
console.log('2. Use ImageMagick: convert icon-192x192.svg icon-192x192.png');
console.log('3. Use Inkscape: inkscape icon-192x192.svg --export-filename=icon-192x192.png');
console.log('\nOr install sharp and run: npm run generate-icons-png');

