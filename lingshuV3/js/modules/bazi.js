
/* js/modules/bazi.js */
import { computeGanzhi, getWuXingFromNayin } from './ganzhi.js';
import { updateCalendarView, setOnDateSelect, getLunarPhaseStatus } from './calendar.js';
import { calculateAstroData } from './astrology.js';
import { calculateSanHeXiu, calculateLunarMansion, checkMieMo } from './luck.js'; 
import { getLunarDate, getSolarTermData } from './lunar.js'; 
// Yi Module is now handled in calendar.js for title display
import { UI } from '../dom.js'; 
import { CHINA_GEO_DATA } from './cityData.js'; // Updated import to use your static data

let state = {
    mode: 'AUTO', 
    manualDate: null, 
    lat: 39.9042, 
    lon: 116.4074,
    locationName: '北京' // Default name if no GPS
};

// 五行映射表
const WUXING_MAP = {
    '甲': 'mu', '乙': 'mu', '寅': 'mu', '卯': 'mu',
    '丙': 'huo', '丁': 'huo', '巳': 'huo', '午': 'huo',
    '戊': 'tu', '己': 'tu', '辰': 'tu', '戌': 'tu', '丑': 'tu', '未': 'tu',
    '庚': 'jin', '辛': 'jin', '申': 'jin', '酉': 'jin',
    '壬': 'shui', '癸': 'shui', '亥': 'shui', '子': 'shui'
};

function getElClass(char) {
    return WUXING_MAP[char] ? `el-${WUXING_MAP[char]}` : '';
}

/**
 * Find nearest district/city in CHINA_GEO_DATA
 * Simple Euclidean distance search.
 * @param {number} lat 
 * @param {number} lon 
 * @returns {string} Name of the district or city
 */
function findNearestPlace(lat, lon) {
    let minDist = Infinity;
    let bestName = "";

    // Iterate Provinces
    for (const [provName, cities] of Object.entries(CHINA_GEO_DATA)) {
        // Iterate Cities
        for (const [cityName, districts] of Object.entries(cities)) {
            // Iterate Districts
            for (const [distName, coords] of Object.entries(districts)) {
                // coords is [lng, lat]
                const dLat = lat - coords[1];
                const dLon = lon - coords[0];
                const distSq = dLat*dLat + dLon*dLon;
                
                if (distSq < minDist) {
                    minDist = distSq;
                    // Prefer district name, if distinct from city, else use city
                    bestName = distName !== cityName ? distName : cityName;
                }
            }
        }
    }
    
    // If we found something reasonable (within China roughly), return it.
    // Otherwise return a generic text or empty if too far (optional check)
    return bestName || "未知地点";
}

/**
 * Unified UI Updater for GPS Status
 * @param {number} lat 
 * @param {number} lon 
 * @param {number|null} accuracy Null if manual mode
 * @param {string} type 'AUTO' or 'MANUAL'
 * @param {string} manualName Optional name override for manual mode
 */
function updateGpsUI(lat, lon, accuracy, type, manualName = null) {
    if (!UI.gpsCoords || !UI.gpsAcc || !UI.gpsDot) return;

    const latStr = lat.toFixed(2);
    const lonStr = lon.toFixed(2);
    
    // Update Dot Style
    if (type === 'AUTO') {
        UI.gpsDot.className = 'gps-dot active';
        UI.gpsDot.title = "自动定位中";
    } else {
        UI.gpsDot.className = 'gps-dot manual'; // Amber color for manual
        UI.gpsDot.title = "手动定位模式";
    }

    // Display Coordinates
    UI.gpsCoords.innerText = `${lonStr}E,${latStr}N`;

    // Determine Location Name
    let displayLoc = manualName;
    if (!displayLoc) {
        // If no manual name provided, reverse geocode
        displayLoc = findNearestPlace(lat, lon);
    }
    
    // Update Subtext (Name + Accuracy)
    if (type === 'AUTO' && accuracy !== null) {
        UI.gpsAcc.innerText = `${displayLoc} ±${Math.round(accuracy)}m`;
    } else {
        // Manual mode, just show name
        UI.gpsAcc.innerText = displayLoc;
    }
}

// GPS 初始化
function initGPS() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                // 增加空值检查，防止 toFixed 报错
                if (typeof latitude === 'number') state.lat = latitude;
                if (typeof longitude === 'number') state.lon = longitude;
                
                // Update UI using helper
                updateGpsUI(state.lat, state.lon, accuracy, 'AUTO');
                
                if (state.mode === 'AUTO') updateAll();
            },
            (err) => { 
                if(UI.gpsCoords) UI.gpsCoords.innerText = "GPS OFF"; 
                if(UI.gpsAcc) UI.gpsAcc.innerText = "";
            },
            { enableHighAccuracy: true }
        );
    }
}

function createPillarHTML(pillar) {
    const ganClass = getElClass(pillar.gan);
    const zhiClass = getElClass(pillar.zhi);
    const nyWx = getWuXingFromNayin(pillar.nayin); 
    const nyMap = {金:'jin',木:'mu',水:'shui',火:'huo',土:'tu'};
    const nyClass = nyWx ? `el-${nyMap[nyWx]}` : '';

    return `
        <div class="pillar-item">
            <div class="gz-char ${ganClass}">${pillar.gan}</div>
            <div class="gz-char ${zhiClass}">${pillar.zhi}</div>
            <div class="nayin-sub ${nyClass}">${pillar.nayin}</div>
        </div>
    `;
}

// 格式化日期 MM/DD HH:mm (使用 zero-padding)
function formatTermDate(d) {
    if (!d) return '--/-- --:--';
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dt = d.getDate().toString().padStart(2, '0');
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${m}/${dt} ${hh}:${mm}`;
}

function updateAll() {
    let targetDate = state.mode === 'AUTO' ? new Date() : state.manualDate;

    // 0. 更新日历标题 (已移至 calendar.js 处理)
    
    // 1. 更新法定时间 UI
    if (UI.legalTime) {
        const pad = n => n.toString().padStart(2,'0');
        UI.legalTime.innerText = `${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}:${pad(targetDate.getSeconds())}`;
    }
    
    // 2. 更新模式图标
    if (UI.modeDisplay) {
        if (state.mode === 'AUTO') {
            UI.modeDisplay.innerText = "自动";
            UI.iconPause.style.display = 'block'; UI.iconPlay.style.display = 'none';
        } else if (state.mode === 'MANUAL_PLAY') {
            UI.modeDisplay.innerText = "回放";
            UI.iconPause.style.display = 'block'; UI.iconPlay.style.display = 'none';
        } else {
            UI.modeDisplay.innerText = "暂停";
            UI.iconPause.style.display = 'none'; UI.iconPlay.style.display = 'block';
        }
    }

    // 3. 核心计算
    if (typeof Astronomy !== 'undefined') {
        
        try {
            const jsOffset = targetDate.getTimezoneOffset();
            const tzOffset = -jsOffset; 

            const result = computeGanzhi({
                dateUTC: targetDate, 
                lat: state.lat, 
                lon: state.lon, 
                tzOffsetMinutes: tzOffset
            });

            // 显示真太阳时
            const { trueSolarClock, eotMinutes } = result.trueSolar;
            const pad = n => n.toString().padStart(2,'0');
            if(UI.tsTime) UI.tsTime.innerText = `${pad(trueSolarClock.getUTCHours())}:${pad(trueSolarClock.getUTCMinutes())}:${pad(trueSolarClock.getUTCSeconds())}`;
            
            // 计算 Delta
            const lonOffset = state.lon * 4;
            const deltaMins = lonOffset - tzOffset + eotMinutes;
            const deltaSign = deltaMins >= 0 ? '+' : '';
            
            if(UI.timeDelta) {
                // 确保 deltaMins 是数字
                const val = (typeof deltaMins === 'number') ? deltaMins.toFixed(1) : '--';
                UI.timeDelta.innerText = `Δ ${deltaSign}${val}m`;
            }

            // 显示四柱
            const { year, month, day, hour } = result.pillars;
            if(UI.gzBox) {
                UI.gzBox.innerHTML = `
                    ${createPillarHTML(year)}
                    ${createPillarHTML(month)}
                    ${createPillarHTML(day)}
                    ${createPillarHTML(hour)}
                `;
            }

            // 吉凶与宿值计算
            if (UI.luckXiu && UI.luckLunarXiu && UI.luckOmens) {
                // A. 计算三合宿 (日宿)
                const sanHeXiuName = calculateSanHeXiu(targetDate);
                UI.luckXiu.innerText = sanHeXiuName ? `${sanHeXiuName}宿` : '--';

                // B. 计算农历宿 (月表)
                const lunarData = getLunarDate(targetDate);
                const lunarXiuName = calculateLunarMansion(lunarData.lunarMonth, lunarData.lunarDay);
                UI.luckLunarXiu.innerText = lunarXiuName ? `${lunarXiuName}宿` : '--';
                
                // C. 计算吉凶 (灭没日) - 依据【三合宿】
                const lunarStatus = getLunarPhaseStatus(targetDate);
                const mieMoResult = checkMieMo(sanHeXiuName, lunarStatus);
                
                // 清空旧标签
                UI.luckOmens.innerHTML = '';
                
                // 如果有灭没凶兆
                if (mieMoResult) {
                    const tag = document.createElement('div');
                    tag.className = 'omen-tag bad';
                    tag.innerText = `⚠ ${mieMoResult}`; 
                    UI.luckOmens.appendChild(tag);
                }
            }

            // 节气更新 (New)
            if (UI.termPivot && UI.termInfo) {
                const termData = getSolarTermData(targetDate);
                if (termData) {
                    const { currentTerm, nextTermName, prevTermDate, nextTermDate, seasonElement, currentPentad } = termData;

                    // 更新 Pivot (当前节气)
                    // 拆分两个字以垂直排列
                    const cTerm = currentTerm || "--";
                    const char1 = cTerm.charAt(0);
                    const char2 = cTerm.charAt(1) || "";
                    UI.termPivot.innerHTML = `<span>${char1}</span><span>${char2}</span>`;
                    
                    // 应用五行季节颜色
                    UI.termPivot.className = 'hud-center-pivot'; 
                    UI.termPivot.classList.add(`season-${seasonElement}`);

                    // 更新 Term Info (上一节气 ~ 下一节气)
                    const prevStr = formatTermDate(prevTermDate);
                    const nextStr = formatTermDate(nextTermDate);
                    
                    UI.termInfo.innerHTML = `
                        <div class="ti-line"><span class="ti-name">${currentTerm}</span><span class="ti-time">${prevStr}</span></div>
                        <div class="ti-line"><span class="ti-name">${nextTermName}</span><span class="ti-time">${nextStr}</span></div>
                    `;

                    // 更新七十二候
                    if (UI.pentad) {
                        UI.pentad.innerText = currentPentad || '';
                    }
                }
            }
            
            // Yi Calendar updates are now handled in updateCalendarView (calendar.js)
            // since it lives in the title area.

        } catch (e) { 
            console.error("排盘错误:", e); 
        }

        try {
            if (UI.ayanVal) {
                const astro = calculateAstroData(targetDate);
                // 增加判空
                if (astro && typeof astro.ayanamsa === 'number') {
                    UI.ayanVal.innerText = `Lahiri Ayan: ${astro.ayanamsa.toFixed(4)}°`;
                    UI.sunTrop.innerText = astro.sun.trop;
                    UI.sunSid.innerText  = astro.sun.sid;
                    UI.sunMans.innerText = astro.sun.mans;
                    UI.sunOv.innerHTML   = astro.sun.ov.overlap ? '<span class="ov-yes">是</span>' : '<span class="ov-no">否</span>';
                    UI.moonTrop.innerText = astro.moon.trop;
                    UI.moonSid.innerText  = astro.moon.sid;
                    UI.moonMans.innerText = astro.moon.mans;
                    UI.moonOv.innerHTML   = astro.moon.ov.overlap ? '<span class="ov-yes">是</span>' : '<span class="ov-no">否</span>';
                }
            }
        } catch (e) {
            console.error("天文数据错误:", e);
        }
    }

    // 4. 通知日历刷新 (传入坐标以计算 Topocentric 角距)
    updateCalendarView(targetDate, state.lat, state.lon);
}

// Controls
function addTime(sign) {
    const val = UI.stepSel.value;
    const unit = val.slice(-1);
    const amount = parseInt(val.slice(0, -1)) * sign;
    let base = state.mode === 'AUTO' ? new Date() : new Date(state.manualDate);
    
    if (unit === 'm') base.setMinutes(base.getMinutes() + amount);
    if (unit === 'h') base.setHours(base.getHours() + amount);
    if (unit === 'd') base.setDate(base.getDate() + amount);
    if (unit === 'M') base.setMonth(base.getMonth() + amount);
    if (unit === 'y') base.setFullYear(base.getFullYear() + amount);
    
    state.manualDate = base; 
    state.mode = 'MANUAL'; 
    updateAll();
}

function toggleFlow() {
    if (state.mode === 'AUTO' || state.mode === 'MANUAL_PLAY') {
        state.manualDate = state.mode === 'AUTO' ? new Date() : state.manualDate;
        state.mode = 'MANUAL';
    } else { 
        state.mode = 'MANUAL_PLAY'; 
    }
    updateAll();
}

function resetNow() { 
    state.mode = 'AUTO'; 
    // Re-trigger GPS init to refresh active status
    initGPS();
    updateAll(); 
}

function saveSettings() {
    const tVal = UI.inputTime.value;
    const latVal = parseFloat(UI.inputLat.value);
    const lonVal = parseFloat(UI.inputLon.value);
    
    if (tVal) { state.manualDate = new Date(tVal); state.mode = 'MANUAL'; }
    if (!isNaN(latVal)) state.lat = latVal;
    if (!isNaN(lonVal)) state.lon = lonVal;
    
    // Determine Location Name
    let manualLocationName = null;
    const prov = UI.selProv.value;
    const city = UI.selCity.value;
    const dist = UI.selDist.value;
    
    // If user used selectors, use that name
    if (dist) manualLocationName = dist;
    else if (city) manualLocationName = city;
    
    // Update GPS Status UI to Manual Mode with specific name or nearest guess
    updateGpsUI(state.lat, state.lon, null, 'MANUAL', manualLocationName);

    UI.modal.classList.add('hidden'); 
    updateAll();
}

// --- City Selector Logic (Updated to use static CHINA_GEO_DATA) ---

function initCitySelectors() {
    if (!UI.selProv || !UI.selCity || !UI.selDist) return;

    // 1. Populate Provinces
    // 假设 CHINA_GEO_DATA 的结构是 { "省名": { "市名": { "区名": [lng, lat] } } }
    const provinces = Object.keys(CHINA_GEO_DATA);
    UI.selProv.innerHTML = `<option value="">- 省/直辖市 -</option>` + 
        provinces.map(p => `<option value="${p}">${p}</option>`).join('');

    // Reset helpers
    const resetCity = () => UI.selCity.innerHTML = `<option value="">- 市 -</option>`;
    const resetDist = () => UI.selDist.innerHTML = `<option value="">- 区/县 -</option>`;

    // Event: Province Change
    UI.selProv.addEventListener('change', (e) => {
        const prov = e.target.value;
        resetCity();
        resetDist();
        
        if (prov && CHINA_GEO_DATA[prov]) {
            const cities = Object.keys(CHINA_GEO_DATA[prov]);
            UI.selCity.innerHTML = `<option value="">- 市 -</option>` + 
                cities.map(c => `<option value="${c}">${c}</option>`).join('');
        }
    });

    // Event: City Change
    UI.selCity.addEventListener('change', (e) => {
        const prov = UI.selProv.value;
        const city = e.target.value;
        resetDist();

        if (prov && city && CHINA_GEO_DATA[prov] && CHINA_GEO_DATA[prov][city]) {
            const dists = Object.keys(CHINA_GEO_DATA[prov][city]);
            UI.selDist.innerHTML = `<option value="">- 区/县 -</option>` + 
                dists.map(d => `<option value="${d}">${d}</option>`).join('');
        }
    });

    // Event: District Change -> Set Lat/Lon
    UI.selDist.addEventListener('change', (e) => {
        const prov = UI.selProv.value;
        const city = UI.selCity.value;
        const dist = e.target.value;

        if (prov && city && dist && CHINA_GEO_DATA[prov][city] && CHINA_GEO_DATA[prov][city][dist]) {
            const coords = CHINA_GEO_DATA[prov][city][dist]; // [lon, lat]
            if (Array.isArray(coords) && coords.length === 2) {
                UI.inputLon.value = coords[0];
                UI.inputLat.value = coords[1];
            }
        }
    });
}

export function mountBazi() {
    initGPS();
    initCitySelectors(); // Initialize selectors
    
    if(UI.btnPrev) UI.btnPrev.addEventListener('click', () => addTime(-1));
    if(UI.btnNext) UI.btnNext.addEventListener('click', () => addTime(1));
    if(UI.btnFlow) UI.btnFlow.addEventListener('click', toggleFlow);
    if(UI.btnReset) UI.btnReset.addEventListener('click', resetNow);
    
    if(UI.btnSettings) UI.btnSettings.addEventListener('click', () => {
        const now = state.mode === 'AUTO' ? new Date() : state.manualDate;
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        UI.inputTime.value = localIso;
        UI.inputLat.value = state.lat; 
        UI.inputLon.value = state.lon;
        // Reset selectors on open (optional, or keep them stateful)
        UI.selProv.value = "";
        UI.selCity.innerHTML = `<option value="">- 市 -</option>`;
        UI.selDist.innerHTML = `<option value="">- 区/县 -</option>`;
        
        UI.modal.classList.remove('hidden');
    });
    
    if(UI.btnConfirm) UI.btnConfirm.addEventListener('click', saveSettings);
    if(UI.btnCancel) UI.btnCancel.addEventListener('click', () => UI.modal.classList.add('hidden'));

    setOnDateSelect((d) => {
        const ref = state.mode === 'AUTO' ? new Date() : state.manualDate;
        state.manualDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), ref.getHours(), ref.getMinutes(), ref.getSeconds());
        state.mode = 'MANUAL'; 
        updateAll();
    });

    setInterval(() => {
        if (state.mode === 'AUTO') {
            updateAll();
        } else if (state.mode === 'MANUAL_PLAY') { 
            state.manualDate.setSeconds(state.manualDate.getSeconds() + 1); 
            updateAll(); 
        }
    }, 1000);

    updateAll();
    console.log("Module: Bazi Pro (Combined Logic) Mounted");
}
