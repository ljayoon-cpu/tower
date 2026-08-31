// Original procedural effects: no recordings or third-party samples.
// Run `npm run sfx:generate` to reproduce the mono 22.05 kHz PCM WAV assets.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rate = 22050;
const out = fileURLToPath(new URL('../public/sfx/', import.meta.url));
mkdirSync(out, { recursive: true });
const note = (start, duration, from, to = from, gain = .3, wave = 'sine') => ({ start, duration, from, to, gain, wave });
const effects = {
  arrow: [note(0,.12,1450,430,.35,'triangle'), note(0,.045,0,0,.15,'noise')],
  cannon: [note(0,.28,155,38,.65), note(0,.17,0,0,.24,'noise')],
  frost: [note(0,.2,1900,1250,.28),note(.04,.23,2600,1800,.17)],
  bolt: [note(0,.13,850,180,.3,'saw'), note(.015,.12,0,0,.24,'noise')],
  sniper: [note(0,.055,1800,520,.32,'triangle'), note(.02,.11,520,140,.22,'saw')],
  poison: [note(0,.18,240,120,.26,'sine'), note(.04,.16,0,0,.11,'noise')],
  hit: [note(0,.08,380,120,.24,'triangle')],
  leak: [note(0,.17,330,220,.3,'triangle'),note(.18,.2,220,147,.27,'triangle')],
  place: [note(0,.08,440,620,.3,'triangle'),note(.065,.12,880,880,.25,'triangle')],
  merge: [note(0,.12,523,523,.3,'triangle'),note(.09,.12,659,659,.3,'triangle'),note(.18,.12,784,784,.3,'triangle'),note(.27,.3,1047,1100,.28)],
  sell: [note(0,.12,1397,1397,.24),note(.1,.22,1760,1760,.23)],
  wave: [note(0,.15,392,392,.3,'triangle'),note(.16,.15,523,523,.3,'triangle'),note(.32,.3,784,784,.28,'triangle')],
  clear: [note(0,.16,523,523,.3,'triangle'),note(.16,.16,659,659,.3,'triangle'),note(.32,.16,784,784,.3,'triangle'),note(.5,.65,1047,1047,.23),note(.5,.65,784,784,.15),note(.5,.65,659,659,.12)],
  lose: [note(0,.24,392,370,.3,'triangle'),note(.25,.24,330,311,.3,'triangle'),note(.5,.65,262,196,.28,'triangle')],
  click: [note(0,.07,720,880,.24,'triangle')],
};

for (const [key, notes] of Object.entries(effects)) {
  const length = Math.ceil((Math.max(...notes.map(n => n.start + n.duration)) + .025) * rate);
  const samples = new Float64Array(length);
  let seed = 731;
  for (const n of notes) {
    let phase = 0;
    const count = Math.floor(n.duration * rate);
    for (let i = 0; i < count; i++) {
      const t = i / rate, progress = i / count;
      phase += (n.from + (n.to - n.from) * progress) / rate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const value = n.wave === 'noise' ? seed / 2147483648 - 1
        : n.wave === 'triangle' ? 2 / Math.PI * Math.asin(Math.sin(phase * Math.PI * 2))
        : n.wave === 'saw' ? 2 * (phase % 1) - 1 : Math.sin(phase * Math.PI * 2);
      // Short attack and zero-valued release avoid clicks at sample boundaries.
      const envelope = Math.min(1,t/.006) * Math.pow(1 - progress, 1.7);
      samples[Math.floor(n.start * rate) + i] += value * envelope * n.gain;
    }
  }
  const wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF',0); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(rate,24); wav.writeUInt32LE(rate*2,28); wav.writeUInt16LE(2,32);
  wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(length*2,40);
  for (let i=0;i<length;i++) wav.writeInt16LE(Math.round(Math.max(-.95,Math.min(.95,samples[i]))*32767),44+i*2);
  writeFileSync(`${out}/${key}.wav`,wav);
  console.log(`${key}.wav: ${(length/rate).toFixed(2)}s, ${wav.length} bytes`);
}
