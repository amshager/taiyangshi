import sweph from 'sweph-wasm';
sweph({}).then(sw => {
  try {
    const res = sw.swe_rise_trans(2451545.0, sw.SE_SUN, "", 260, sw.SE_CALC_RISE, [116.4074, 39.9042, 0], 0, 0);
    console.log(typeof res, res);
  } catch (e) {
    console.error(e);
  }
});
