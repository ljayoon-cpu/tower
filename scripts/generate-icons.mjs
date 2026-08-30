import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const background = [15, 16, 32, 255];
const navy = [29, 33, 65, 255];
const rim = [104, 216, 255, 255];
const tower = [250, 236, 172, 255];
const shadow = [9, 10, 23, 150];

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function makeIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels.set(color, i);
  };
  const fillPolygon = (points, color) => {
    const minY = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(...points.map(([, y]) => y))));
    for (let y = minY; y <= maxY; y++) {
      const intersections = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) for (let x = Math.ceil(intersections[i]); x <= Math.floor(intersections[i + 1]); x++) set(x, y, color);
    }
  };
  const s = size / 512;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, background);
  fillPolygon([[256, 44], [444, 116], [412, 332], [256, 468], [100, 332], [68, 116]].map(([x, y]) => [x * s, y * s]), shadow);
  fillPolygon([[256, 30], [454, 108], [420, 326], [256, 482], [92, 326], [58, 108]].map(([x, y]) => [x * s, y * s]), rim);
  fillPolygon([[256, 52], [428, 120], [398, 314], [256, 450], [114, 314], [84, 120]].map(([x, y]) => [x * s, y * s]), navy);
  fillPolygon([[256, 116], [350, 300], [300, 300], [300, 365], [212, 365], [212, 300], [162, 300]].map(([x, y]) => [x * s, y * s]), tower);
  fillPolygon([[256, 154], [306, 254], [274, 254], [274, 328], [238, 328], [238, 254], [206, 254]].map(([x, y]) => [x * s, y * s]), rim);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
for (const size of [192, 512]) writeFileSync(`public/icons/icon-${size}.png`, makeIcon(size));
