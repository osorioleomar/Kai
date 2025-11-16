const fs = require('fs');
const path = require('path');

// This script requires 'sharp' to be installed
// Run: npm install --save-dev sharp

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed.');
  console.log('Please run: npm install --save-dev sharp');
  process.exit(1);
}

const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

const bgColor = '#d97706'; // Amber-600
const textColor = '#ffffff';

async function generateIcon(size, filename) {
  const fontSize = Math.floor(size * 0.4);
  const textX = size / 2;
  const textY = size / 2;
  
  // Create SVG
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${bgColor}" rx="${size * 0.15}"/>
      <text 
        x="${textX}" 
        y="${textY}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        fill="${textColor}" 
        text-anchor="middle" 
        dominant-baseline="central"
      >📔</text>
    </svg>
  `;

  const publicDir = path.join(__dirname, '..', 'public');
  const outputPath = path.join(publicDir, filename);

  try {
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Created ${filename} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Error creating ${filename}:`, error.message);
  }
}

async function generateAllIcons() {
  console.log('Generating PWA icons...\n');
  
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  for (const { size, name } of sizes) {
    await generateIcon(size, name);
  }

  console.log('\n✨ All icons generated successfully!');
}

generateAllIcons().catch(console.error);

