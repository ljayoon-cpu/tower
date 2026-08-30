import { readFileSync } from 'node:fs';
import { SFX_KEYS } from '../../src/core/audio';

it.each(SFX_KEYS)('%s has a decodable, audible, unclipped PCM asset with a quiet tail', (key) => {
  const wav = readFileSync(`public/sfx/${key}.wav`);
  expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
  expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
  expect(wav.readUInt16LE(20)).toBe(1); // PCM
  expect(wav.readUInt16LE(22)).toBe(1); // mono
  expect(wav.readUInt16LE(34)).toBe(16);
  expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
  const count = (wav.length - 44) / 2;
  const duration = count / wav.readUInt32LE(24);
  expect(duration).toBeGreaterThan(0.05);
  expect(duration).toBeLessThan(1.5);
  let peak = 0, energy = 0;
  for (let i = 44; i < wav.length; i += 2) {
    const sample = wav.readInt16LE(i) / 32768;
    peak = Math.max(peak, Math.abs(sample)); energy += sample * sample;
  }
  expect(peak).toBeLessThan(0.96);
  expect(Math.sqrt(energy / count)).toBeGreaterThan(0.025);
  expect(wav.readInt16LE(44)).toBe(0);
  expect(wav.readInt16LE(wav.length - 2)).toBe(0);
});
