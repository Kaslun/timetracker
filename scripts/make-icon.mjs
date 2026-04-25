// Generate a tiny but valid build/icon.ico (PNG-encoded) for Windows.
// Uses zlib + PNG construction so we don't pull a heavy image dependency.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SIZE = 256;
const ACCENT = [0xb8, 0x63, 0x3a]; // warm terracotta — matches default theme
const BG = [0xf6, 0xf2, 0xec]; // cream

function buildRGBA() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const rOuter = SIZE * 0.46;
  const rInner = SIZE * 0.34;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= rInner) {
        buf[i + 0] = ACCENT[0];
        buf[i + 1] = ACCENT[1];
        buf[i + 2] = ACCENT[2];
        buf[i + 3] = 0xff;
      } else if (d <= rOuter) {
        buf[i + 0] = BG[0];
        buf[i + 1] = BG[1];
        buf[i + 2] = BG[2];
        buf[i + 3] = 0xff;
      } else {
        buf[i + 0] = 0;
        buf[i + 1] = 0;
        buf[i + 2] = 0;
        buf[i + 3] = 0;
      }
    }
  }
  return buf;
}

function crc32() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
}
const crc = crc32();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, checksum]);
}

function buildPNG(rgba, w, h) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Filter byte (0) per row + raw RGBA
  const stride = w * 4;
  const filtered = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    filtered[y * (stride + 1)] = 0;
    rgba.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = deflateSync(filtered);

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idatData), chunk('IEND', Buffer.alloc(0))]);
}

function buildICO(pngBuf) {
  const ICONDIR = Buffer.alloc(6);
  ICONDIR.writeUInt16LE(0, 0); // reserved
  ICONDIR.writeUInt16LE(1, 2); // type = icon
  ICONDIR.writeUInt16LE(1, 4); // count

  const entry = Buffer.alloc(16);
  entry[0] = 0; // 256 width
  entry[1] = 0; // 256 height
  entry[2] = 0; // colorCount
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(pngBuf.length, 8); // size
  entry.writeUInt32LE(6 + 16, 12); // offset

  return Buffer.concat([ICONDIR, entry, pngBuf]);
}

const rgba = buildRGBA();
const png = buildPNG(rgba, SIZE, SIZE);
const ico = buildICO(png);
const target = join(__dirname, '..', 'build', 'icon.ico');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, ico);
console.log(`Wrote ${target} (${ico.length} bytes)`);
