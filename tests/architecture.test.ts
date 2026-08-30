import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PURE_DIRS = ['src/systems', 'src/core'];

function tsFiles(dir: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(tsFiles(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('architecture', () => {
  it('pure logic modules do not import phaser', () => {
    for (const dir of PURE_DIRS) {
      for (const f of tsFiles(dir)) {
        const src = readFileSync(f, 'utf8');
        expect(src, `${f} imports phaser`).not.toMatch(/from ['"]phaser['"]/);
      }
    }
  });
});
