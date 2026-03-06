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
    try {
        const sw = await sweph.init();
        const date = new Date('2026-03-03T03:29:33-08:00');
        const jd_now = sw.swe_julday(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600, 1);
        
        console.log("Calculating True Node...");
        const SE_TRUE_NODE = 11;
        try {
            console.log(sw.swe_calc_ut(jd_now, SE_TRUE_NODE, 260));
        } catch (e) {
            console.error(e.message);
        }

        console.log("Calculating Mean Node...");
        const SE_MEAN_NODE = 10;
        try {
            console.log(sw.swe_calc_ut(jd_now, SE_MEAN_NODE, 260));
        } catch (e) {
            console.error(e.message);
        }

        console.log("Calculating Mean Apog...");
        const SE_MEAN_APOG = 12;
        try {
            console.log(sw.swe_calc_ut(jd_now, SE_MEAN_APOG, 260));
        } catch (e) {
            console.error(e.message);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
