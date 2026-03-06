import sweph from 'sweph-wasm';

async function test() {
    const sw = await sweph.init();
    const jd_start = sw.swe_julday(2026, 3, 1, 0, sw.SE_GREG_CAL);
    const jd_end = sw.swe_julday(2026, 3, 31, 23.999, sw.SE_GREG_CAL);
    
    const geopos = [116.4074, 39.9042, 0];
    const ifl = sw.SEFLG_SWIEPH;
    
    let jd = jd_start;
    while (jd < jd_end) {
        const res = sw.swe_lun_eclipse_when_loc(jd, ifl, geopos, false);
        console.log("Lunar eclipse loc res:", res);
        if (res && res.data && res.data[0] > 0) {
            jd = res.data[0] + 10;
        } else {
            break;
        }
    }
    
    jd = jd_start;
    while (jd < jd_end) {
        const res = sw.swe_lun_eclipse_when(jd, ifl, 0, false);
        console.log("Lunar eclipse global res:", res);
        if (res && res.data && res.data[0] > 0) {
            jd = res.data[0] + 10;
        } else {
            break;
        }
    }
}

test();
