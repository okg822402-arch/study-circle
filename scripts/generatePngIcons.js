// Simple pure Node.js script to create high quality PNG icons without external C++ binary dependencies
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateStudyCirclePng(size, isMaskable = false) {
  const width = size;
  const height = size;
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);

  // Colors
  const bgNavy = [27, 43, 75, 255];     // #1B2B4B
  const teal = [61, 122, 138, 255];     // #3D7A8A
  const white = [255, 255, 255, 255];   // #FFFFFF
  const amber = [232, 168, 62, 255];    // #E8A83E
  const darkTeal = [36, 81, 94, 255];   // #24515E

  const cx = width / 2;
  const cy = height / 2;
  const cornerRadius = isMaskable ? 0 : Math.round(width * 0.22);
  const mainRadius = width * 0.25;
  const nodeRadius = width * 0.055;
  const centerRadius = width * 0.08;

  // Orbit node centers
  const nodes = [
    { x: cx, y: cy - mainRadius },
    { x: cx + mainRadius * Math.cos(Math.PI / 6), y: cy + mainRadius * Math.sin(Math.PI / 6) },
    { x: cx - mainRadius * Math.cos(Math.PI / 6), y: cy + mainRadius * Math.sin(Math.PI / 6) }
  ];

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Squircle background check
      let inCard = true;
      if (!isMaskable) {
        const dx = Math.abs(x - cx) - (cx - cornerRadius);
        const dy = Math.abs(y - cy) - (cy - cornerRadius);
        if (dx > 0 && dy > 0 && (dx * dx + dy * dy > cornerRadius * cornerRadius)) {
          inCard = false;
        }
      }

      if (!inCard) {
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Default background navy
      let r = bgNavy[0], g = bgNavy[1], b = bgNavy[2], a = 255;

      const distCenter = Math.hypot(x - cx, y - cy);

      // Main collaborative circle ring (stroke ~ width * 0.045)
      const ringThickness = width * 0.035;
      if (Math.abs(distCenter - mainRadius) <= ringThickness) {
        r = white[0]; g = white[1]; b = white[2];
      }

      // Center core amber
      if (distCenter <= centerRadius) {
        if (distCenter <= centerRadius * 0.45) {
          r = white[0]; g = white[1]; b = white[2];
        } else {
          r = amber[0]; g = amber[1]; b = amber[2];
        }
      }

      // Orbiting peer nodes
      for (const node of nodes) {
        const dNode = Math.hypot(x - node.x, y - node.y);
        if (dNode <= nodeRadius) {
          if (dNode >= nodeRadius - width * 0.015) {
            r = white[0]; g = white[1]; b = white[2];
          } else {
            r = teal[0]; g = teal[1]; b = teal[2];
          }
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // Compression
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // Interlace
  const ihdrChunk = makePngChunk('IHDR', ihdr);

  // IDAT (Deflated)
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makePngChunk('IDAT', compressed);

  // IEND
  const iendChunk = makePngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('public/icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'icon-192.png'), generateStudyCirclePng(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), generateStudyCirclePng(512));
fs.writeFileSync(path.join(outDir, 'maskable-icon-512.png'), generateStudyCirclePng(512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), generateStudyCirclePng(180));

console.log('Successfully generated PNG icons: 192x192, 512x512, maskable 512x512, apple-touch 180x180.');
