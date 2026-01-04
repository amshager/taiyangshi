/* logic.js */
import { getSolarTermInfo, formatLocalMinute } from "./solarTerms.js";

// === 全局配置 ===
const config = {
    lon: parseFloat(localStorage.getItem('user_lon')) || 116.46,
    lat: parseFloat(localStorage.getItem('user_lat')) || 39.92,
    isGPS: false,
    gpsAcc: 0 // 【新增】GPS精度
};

// === 核心算法 (保持不变) ===
function getEOT(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

function formatOffset(min) {
    const sign = min >= 0 ? "+" : "-";
    const abs = Math.abs(min);
    const m = Math.floor(abs);
    const s = Math.floor((abs - m) * 60);
    return `${sign}${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}

// === 渲染逻辑 ===
function updateDisplay() {
    const now = new Date();

    const deltaLonMin = (config.lon - 120.0) * 4;
    const eotMin = getEOT(now);
    const totalMs = (deltaLonMin + eotMin) * 60 * 1000;
    const solarTime = new Date(now.getTime() + totalMs);

    const h = String(solarTime.getHours()).padStart(2, '0');
    const m = String(solarTime.getMinutes()).padStart(2, '0');
    const s = String(solarTime.getSeconds()).padStart(2, '0');
    document.getElementById('mainTime').innerText = `${h}:${m}:${s}`;

    document.getElementById('stdTime').innerText = now.toLocaleTimeString('en-GB', {hour12:false});
    document.getElementById('lonDisplay').innerText = config.lon.toFixed(2);
    document.getElementById('latDisplay').innerText = config.lat.toFixed(2);
    document.getElementById('eotDisplay').innerText = formatOffset(eotMin);
    document.getElementById('offsetDisplay').innerText = formatOffset(deltaLonMin);

    // 【修复】GPS 标签与精度显示
    const tag = document.getElementById('gpsTag');
    const accText = document.getElementById('gpsAccText');
    if(config.isGPS) {
        tag.classList.add('active');
        accText.innerText = `±${Math.round(config.gpsAcc)}m`; // 显示精度
    } else {
        tag.classList.remove('active');
        accText.innerText = ""; // 隐藏精度
    }

    // 渲染节气 (保持不变)
    try {
        const info = getSolarTermInfo(now);
        document.getElementById('currName').innerText = info.current.name;
        document.getElementById('prevName').innerText = info.previous.name;
        document.getElementById('prevTime').innerText = formatLocalMinute(info.previous.startTime);
        document.getElementById('nextName').innerText = info.next.name;
        document.getElementById('nextTime').innerText = formatLocalMinute(info.next.startTime);
    } catch(e) { console.error(e); }
}

// === 模态框交互 ===
const modal = document.getElementById('settingsModal');
const inpLon = document.getElementById('inpLon');
const inpLat = document.getElementById('inpLat');
const statusMsg = document.getElementById('statusMsg');

window.openSettings = function() {
    inpLon.value = config.lon;
    inpLat.value = config.lat;
    statusMsg.innerText = "";
    modal.classList.add('open');
}

window.saveAndClose = function() {
    const l = parseFloat(inpLon.value);
    const la = parseFloat(inpLat.value);
    if(!isNaN(l) && !isNaN(la)) {
        config.lon = l;
        config.lat = la;
        config.isGPS = false; // 手动输入
        config.gpsAcc = 0;    // 清空精度
        localStorage.setItem('user_lon', l);
        localStorage.setItem('user_lat', la);
        updateDisplay();
        modal.classList.remove('open');
    } else {
        statusMsg.innerText = "数值无效";
        statusMsg.style.color = "red";
    }
}

// 【修复】获取 GPS 并记录精度
window.getGPS = function() {
    if (!("geolocation" in navigator)) {
        statusMsg.innerText = "不支持定位"; return;
    }
    statusMsg.innerText = "搜星中...";
    statusMsg.style.color = "#0ff";
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            config.lon = pos.coords.longitude;
            config.lat = pos.coords.latitude;
            config.isGPS = true;
            config.gpsAcc = pos.coords.accuracy; // 记录精度
            
            inpLon.value = config.lon;
            inpLat.value = config.lat;
            
            localStorage.setItem('user_lon', config.lon);
            localStorage.setItem('user_lat', config.lat);
            
            statusMsg.innerText = "定位成功";
            statusMsg.style.color = "#0f0";
            
            setTimeout(() => {
                updateDisplay();
                modal.classList.remove('open');
            }, 1000);
        },
        (err) => {
            statusMsg.innerText = "定位失败";
            statusMsg.style.color = "red";
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
}

// === 启动 (尝试后台静默定位) ===
if("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition((pos) => {
        config.lon = pos.coords.longitude;
        config.lat = pos.coords.latitude;
        config.gpsAcc = pos.coords.accuracy; // 记录精度
        config.isGPS = true;
        updateDisplay();
    }, null, {timeout: 5000});
}

setInterval(updateDisplay, 1000);
updateDisplay();
