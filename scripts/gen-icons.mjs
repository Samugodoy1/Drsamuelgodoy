// Generates all PWA / favicon icon sizes from public/icon-512.png.
// Run once with: node scripts/gen-icons.mjs
//
// No rounded corners are applied here on purpose — iOS/Android mask the
// icons themselves. The maskable variant places the mark at ~66% inside a
// solid safe-zone background so it survives aggressive platform cropping.
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '..', 'public');
const SRC = path.join(PUBLIC, 'icon-512.png');

// Safe-zone background for the maskable icon.
const BG = {r: 0xfb, g: 0xf9, b: 0xf7, alpha: 1};

const sizes = [
  {file: 'apple-touch-icon.png', size: 180},
  {file: 'icon-192.png', size: 192},
  {file: 'favicon-32.png', size: 32},
  {file: 'favicon-16.png', size: 16},
];

async function run() {
  for (const {file, size} of sizes) {
    await sharp(SRC)
      .resize(size, size, {fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}})
      .png()
      .toFile(path.join(PUBLIC, file));
    console.log(`✓ ${file} (${size}x${size})`);
  }

  // Maskable: mark reduced to ~66% and centered over solid #FBF9F7.
  const canvas = 512;
  const mark = Math.round(canvas * 0.66); // ~338px
  const resized = await sharp(SRC)
    .resize(mark, mark, {fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}})
    .png()
    .toBuffer();
  await sharp({
    create: {width: canvas, height: canvas, channels: 4, background: BG},
  })
    .composite([{input: resized, gravity: 'center'}])
    .png()
    .toFile(path.join(PUBLIC, 'icon-512-maskable.png'));
  console.log('✓ icon-512-maskable.png (512x512, mark ~66% on #FBF9F7)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
