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

sweph.init().then(sw => {
  try {
    const rsmi_rise = sw.SE_CALC_RISE | sw.SE_BIT_DISC_CENTER | sw.SE_BIT_NO_REFRACTION;
    const res = sw.swe_rise_trans(2451545.0, sw.SE_SUN, "", 260, rsmi_rise, [116.4074, 39.9042, 0], 0, 0);
    console.log("swe_rise_trans result:", typeof res, res);
  } catch (e) {
    console.error("swe_rise_trans error:", e);
  }
});
