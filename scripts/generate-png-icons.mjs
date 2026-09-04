import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

// Minimal CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function generatePng(width, height, isMaskable = false) {
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep dark cyberpunk gradient background: #090d16 to #020617
      const gradT = y / height;
      let r = Math.round(9 - 7 * gradT);
      let g = Math.round(13 - 7 * gradT);
      let b = Math.round(22 + 1 * gradT);
      let a = 255;

      if (!isMaskable && dist > radius) {
        // Soft rounded icon corners
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy)) - (width * 0.38);
        if (cornerDist > 0) {
          const cornerAlpha = Math.max(0, 1 - cornerDist / 12);
          a = Math.round(255 * cornerAlpha);
        }
      }

      // Draw equalizer bars in center
      // 7 bars between x: 0.25 to 0.75
      const barCount = 7;
      const barAreaW = width * 0.55;
      const barStartX = cx - barAreaW / 2;
      const barW = barAreaW / (barCount * 1.5);
      const barGap = barW * 0.5;

      const heights = [0.25, 0.45, 0.65, 0.8, 0.58, 0.38, 0.2];

      for (let i = 0; i < barCount; i++) {
        const bx = barStartX + i * (barW + barGap);
        const bh = heights[i] * (height * 0.5);
        const by = cy + (height * 0.2) - bh;

        if (x >= bx && x <= bx + barW && y >= by && y <= cy + (height * 0.2)) {
          // Glow gradient: Cyan -> Indigo -> Pink
          const colRatio = i / (barCount - 1);
          if (colRatio < 0.5) {
            // Cyan to Indigo
            const sub = colRatio * 2;
            r = Math.round(34 * (1 - sub) + 129 * sub);
            g = Math.round(211 * (1 - sub) + 140 * sub);
            b = Math.round(238 * (1 - sub) + 248 * sub);
          } else {
            // Indigo to Pink
            const sub = (colRatio - 0.5) * 2;
            r = Math.round(129 * (1 - sub) + 244 * sub);
            g = Math.round(140 * (1 - sub) + 114 * sub);
            b = Math.round(248 * (1 - sub) + 182 * sub);
          }
          a = 255;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: 0 (deflate)
  ihdr[11] = 0; // Filter: 0 (standard)
  ihdr[12] = 0; // Interlace: 0 (none)

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Apple Touch Icon (180x180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180));
console.log('Created apple-touch-icon.png');

// 2. PWA 192x192
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192));
console.log('Created pwa-192x192.png');

// 3. PWA 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512));
console.log('Created pwa-512x512.png');

// 4. PWA Maskable 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
console.log('Created pwa-maskable-512x512.png');

// 5. Favicon
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(64, 64));
console.log('Created favicon.ico');
