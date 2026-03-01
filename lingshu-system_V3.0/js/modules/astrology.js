/* js/modules/astrology.js */
const Util = {
    pad2: (n) => String(n).padStart(2, '0'),
    norm360: (deg) => ((deg % 360) + 360) % 360,
    degToDegMin: (deg) => {
        const d = Math.floor(deg + 1e-12);
        const m = Math.floor((deg - d) * 60 + 1e-10);
        return { d, m };
    }
};

const Qi = {
    BRANCH_BY_TROP_SIGN: ['戌','酉','申','未','午','巳','辰','卯','寅','丑','子','亥'],
    tropLonToPalace(lonDeg) { return this.BRANCH_BY_TROP_SIGN[Math.floor(Util.norm360(lonDeg) / 30)]; },
    lonToBranchText(lonDeg) {
        const lon = Util.norm360(lonDeg);
        const idx = Math.floor(lon / 30);
        const { d, m } = Util.degToDegMin(lon - idx * 30);
        return `${this.BRANCH_BY_TROP_SIGN[idx]}${d}°${Util.pad2(m)}′`;
    }
};

const Lahiri = {
    LAHIRI_BASE_DEG: 23.8530556,
    PRECESSION_DEG_PER_YEAR: 50.2388475 / 3600,
    ayanamsaDegrees(dateUtc) {
        const days = (dateUtc.getTime() - Date.UTC(2000, 0, 1)) / 86400000;
        return this.LAHIRI_BASE_DEG + (days / 365.2425) * this.PRECESSION_DEG_PER_YEAR;
    },
};

const Mansions = {
    MANSIONS: [
        {name:'角',ra:[13,25,11.5],span:11.925},{name:'亢',ra:[14,12,53.6],span:9.495},{name:'氐',ra:[14,50,52.6],span:16.995},{name:'房',ra:[15,58,51.0],span:5.580},{name:'心',ra:[16,21,11.2],span:7.665},{name:'尾',ra:[16,51,52.1],span:18.495},{name:'箕',ra:[18,5,48.3],span:9.960},{name:'斗',ra:[18,45,39.2],span:23.835},{name:'牛',ra:[20,21,0.5],span:6.660},{name:'女',ra:[20,47,40.3],span:10.980},{name:'虚',ra:[21,31,33.3],span:8.610},{name:'危',ra:[22,5,46.8],span:14.685},{name:'室',ra:[23,4,45.5],span:17.115},{name:'壁',ra:[0,13,14.1],span:10.995},{name:'奎',ra:[0,57,12.4],span:14.370},{name:'娄',ra:[1,54,38.3],span:12.195},{name:'胃',ra:[2,43,27.0],span:15.360},{name:'昴',ra:[3,44,52.5],span:10.935},{name:'毕',ra:[4,28,36.9],span:16.635},{name:'觜',ra:[5,35,8.2],span:1.410},{name:'参',ra:[5,40,45.5],span:10.545},{name:'井',ra:[6,22,57.6],span:32.145},{name:'鬼',ra:[8,31,35.7],span:1.530},{name:'柳',ra:[8,37,39.3],span:12.480},{name:'星',ra:[9,27,35.2],span:5.970},{name:'张',ra:[9,51,28.6],span:17.070},{name:'翼',ra:[10,59,46.4],span:19.005},{name:'轸',ra:[12,15,48.3],span:17.355}
    ],
    PALACE_BY_MANSION: {'角':'辰','亢':'辰','氐':'卯','房':'卯','心':'卯','尾':'寅','箕':'寅','斗':'丑','牛':'丑','女':'子','虚':'子','危':'子','室':'亥','壁':'亥','奎':'戌','娄':'戌','胃':'酉','昴':'酉','毕':'酉','觜':'申','参':'申','井':'未','鬼':'未','柳':'午','星':'午','张':'午','翼':'巳','轸':'巳'},
    init() { if(this.ready)return; this.STARTS=this.MANSIONS.map(x=>({name:x.name, start: (x.ra[0]+x.ra[1]/60+x.ra[2]/3600)*15, span:x.span})); this.ready=true; },
    getMansion(raDeg) {
        this.init();
        const ra = Util.norm360(raDeg);
        for(const m of this.STARTS) {
            const d = Util.norm360(ra - m.start);
            if(d < m.span - 1e-12) return { mansion: m.name, palace: this.PALACE_BY_MANSION[m.name], enterDeg: d };
        }
        return { mansion:'?', palace:'?', enterDeg: NaN };
    },
    mansionText(raDeg) { 
        const r = this.getMansion(raDeg); 
        const degStr = (typeof r.enterDeg === 'number') ? r.enterDeg.toFixed(2) : '--';
        return `${r.palace}/${r.mansion} 入 ${degStr}°`; 
    }
};

const Overlap = {
    check(tropDeg, raDeg) {
        const q = Qi.tropLonToPalace(tropDeg);
        const m = Mansions.getMansion(raDeg);
        return { overlap: q===m.palace };
    }
};

export function calculateAstroData(dateUtc) {
    if (typeof Astronomy === 'undefined') return null;
    const t = new Astronomy.AstroTime(dateUtc);
    const vSun = Astronomy.GeoVector(Astronomy.Body.Sun, t, false);
    const vMoon = Astronomy.GeoVector(Astronomy.Body.Moon, t, false);
    const tropSun = Astronomy.Ecliptic(vSun).elon;
    const tropMoon = Astronomy.Ecliptic(vMoon).elon;
    const ayan = Lahiri.ayanamsaDegrees(dateUtc);
    const raSun = Astronomy.EquatorFromVector(vSun).ra * 15;
    const raMoon = Astronomy.EquatorFromVector(vMoon).ra * 15;

    return {
        ayanamsa: ayan,
        sun: { trop: Qi.lonToBranchText(tropSun), sid: Qi.lonToBranchText(tropSun - ayan), mans: Mansions.mansionText(raSun), ov: Overlap.check(tropSun, raSun) },
        moon: { trop: Qi.lonToBranchText(tropMoon), sid: Qi.lonToBranchText(tropMoon - ayan), mans: Mansions.mansionText(raMoon), ov: Overlap.check(tropMoon, raMoon) }
    };
}