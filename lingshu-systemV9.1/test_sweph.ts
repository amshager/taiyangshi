import sweph from 'sweph-wasm';
import fs from 'fs';
import { fileURLToPath } from 'url';

const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (typeof url === 'string' && url.startsWith('file://')) {
    const buffer = fs.readFileSync(fileURLToPath(url));
    return new Response(buffer, { headers: { 'Content-Type': 'application/wasm' } });
  }
  return originalFetch(url, options);
};

async function test() {
  const sw = await sweph.init();
  const jd = sw.swe_julday(2026, 3, 2, 12, 1);
  const houses = sw.swe_houses(jd, 39.9, 116.4, 'R');
  console.log(houses);
}
test();
