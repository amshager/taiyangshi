const sw = require('sweph-wasm');
sw.default().then(swe => {
  const res = swe.swe_rise_trans(2451545.0, swe.SE_SUN, "", 260, swe.SE_CALC_RISE, [116.4074, 39.9042, 0], 0, 0);
  console.log(typeof res, res);
});
