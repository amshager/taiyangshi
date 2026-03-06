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

const SE_SUN = 0;
const SE_MOON = 1;
const SE_MERCURY = 2;
const SE_VENUS = 3;
const SE_MARS = 4;
const SE_JUPITER = 5;
const SE_SATURN = 6;
const SE_URANUS = 7;
const SE_NEPTUNE = 8;
const SE_PLUTO = 9;

const planets = [SE_SUN, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN, SE_URANUS, SE_NEPTUNE, SE_PLUTO];
const aspects = [0, 60, 90, 120, 180, 240, 270, 300];

function getPosition(sw, body, jd) {
  const res = sw.swe_calc_ut(jd, body, 260); // SEFLG_MOSEPH | SEFLG_SPEED
  return res[0];
}

function getAngleDiff(lon1, lon2) {
  let diff = (lon1 - lon2) % 360;
  if (diff < 0) diff += 360;
  return diff;
}

function findNextSignIngress(sw, jd_start) {
  let jd = jd_start;
  const start_lon = getPosition(sw, SE_MOON, jd);
  const current_sign = Math.floor(start_lon / 30);
  const target_lon = (current_sign + 1) * 30;
  
  let deg_to_go = target_lon - start_lon;
  if (deg_to_go < 0) deg_to_go += 360;
  if (deg_to_go === 0) deg_to_go = 30;
  
  jd += deg_to_go / 13.176;
  
  for (let i = 0; i < 10; i++) {
    const res = sw.swe_calc_ut(jd, SE_MOON, 260);
    const lon = res[0];
    const speed = res[3];
    
    let err = target_lon - lon;
    if (err > 180) err -= 360;
    if (err < -180) err += 360;
    
    if (Math.abs(err) < 0.00001) break;
    jd += err / speed;
  }
  return jd;
}

function findLastAspect(sw, jd_ingress) {
  let last_aspect_jd = -Infinity;
  let last_aspect_planet = -1;
  let last_aspect_angle = -1;

  const jd_start = jd_ingress - 3;
  const step = 1 / 24;

  for (let p of planets) {
    let prev_diff = getAngleDiff(getPosition(sw, SE_MOON, jd_ingress), getPosition(sw, p, jd_ingress));
    
    for (let jd = jd_ingress - step; jd >= jd_start; jd -= step) {
      const curr_diff = getAngleDiff(getPosition(sw, SE_MOON, jd), getPosition(sw, p, jd));
      
      for (let asp of aspects) {
        let min_d = Math.min(curr_diff, prev_diff);
        let max_d = Math.max(curr_diff, prev_diff);
        
        if (max_d - min_d > 180) {
          min_d += 360;
          let temp = min_d;
          min_d = max_d;
          max_d = temp;
        }
        
        let asp_adj = asp;
        if (asp_adj < min_d && max_d > 360) asp_adj += 360;
        
        if (asp_adj >= min_d && asp_adj <= max_d) {
          let jd_left = jd;
          let jd_right = jd + step;
          for (let i = 0; i < 20; i++) {
            const jd_mid = (jd_left + jd_right) / 2;
            const mid_diff = getAngleDiff(getPosition(sw, SE_MOON, jd_mid), getPosition(sw, p, jd_mid));
            
            let err_left = getAngleDiff(getPosition(sw, SE_MOON, jd_left), getPosition(sw, p, jd_left)) - asp;
            if (err_left > 180) err_left -= 360;
            if (err_left < -180) err_left += 360;
            
            let err_mid = mid_diff - asp;
            if (err_mid > 180) err_mid -= 360;
            if (err_mid < -180) err_mid += 360;
            
            if (err_left * err_mid <= 0) {
              jd_right = jd_mid;
            } else {
              jd_left = jd_mid;
            }
          }
          
          const exact_jd = (jd_left + jd_right) / 2;
          if (exact_jd > last_aspect_jd) {
            last_aspect_jd = exact_jd;
            last_aspect_planet = p;
            last_aspect_angle = asp;
          }
        }
      }
      prev_diff = curr_diff;
      
      if (last_aspect_jd > jd) {
         break;
      }
    }
  }
  
  return {
    jd: last_aspect_jd,
    planet: last_aspect_planet,
    angle: last_aspect_angle
  };
}

async function test() {
  try {
    const sw = await sweph.init();
    
    // Test with current date
    const now = new Date();
    const jd_now = sw.swe_julday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours() + now.getUTCMinutes() / 60, 1);
    
    const jd_ingress = findNextSignIngress(sw, jd_now);
    const last_aspect = findLastAspect(sw, jd_ingress);
    
    console.log("Now JD:", jd_now);
    console.log("Ingress JD:", jd_ingress);
    console.log("Last Aspect:", last_aspect);
    
    const is_voc = jd_now >= last_aspect.jd && jd_now < jd_ingress;
    console.log("Is VOC right now?", is_voc);
    
  } catch (e) {
    console.error(e);
  }
}
test();







