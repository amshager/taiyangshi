/**
 * core/service/solarTerms.js
 *
 * 目标：给定一个阳历时间（JS Date），返回当前节气 + 上/下一个节气及其“开始时刻”（到分钟）。
 *
 * 时间约定：
 * - 输入 date：一个 JS Date，代表一个“绝对时刻”（内部是 UTC 时间戳），你可以把它理解为 tStd。
 * - 输出的 Date 同样是绝对时刻；UI 想显示本地还是 UTC，由 UI 决定。
 *
 * 依赖：
 * - 全局 Astronomy（来自 astronomy.browser.min.js / astronomy-engine）
 *
 * 精度：
 * - 节气交接点用 Astronomy.SearchSunLongitude 反解，理论精度远高于 1 分钟；
 * - 输出时我们把秒数截掉（floor 到分钟），满足“精确到分钟”的展示需求。
 */

/** 24 节气：以太阳视黄经（度）为边界。 */
const SOLAR_TERMS = [
  { name: "立春", lon: 315 },
  { name: "雨水", lon: 330 },
  { name: "惊蛰", lon: 345 },
  { name: "春分", lon: 0 },
  { name: "清明", lon: 15 },
  { name: "谷雨", lon: 30 },
  { name: "立夏", lon: 45 },
  { name: "小满", lon: 60 },
  { name: "芒种", lon: 75 },
  { name: "夏至", lon: 90 },
  { name: "小暑", lon: 105 },
  { name: "大暑", lon: 120 },
  { name: "立秋", lon: 135 },
  { name: "处暑", lon: 150 },
  { name: "白露", lon: 165 },
  { name: "秋分", lon: 180 },
  { name: "寒露", lon: 195 },
  { name: "霜降", lon: 210 },
  { name: "立冬", lon: 225 },
  { name: "小雪", lon: 240 },
  { name: "大雪", lon: 255 },
  { name: "冬至", lon: 270 },
  { name: "小寒", lon: 285 },
  { name: "大寒", lon: 300 },
];

const MS_PER_MIN = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function assertAstronomy() {
  if (typeof Astronomy === "undefined") {
    throw new Error("solarTerms: missing global Astronomy (astronomy-engine).");
  }
  if (typeof Astronomy.SunPosition !== "function" || typeof Astronomy.SearchSunLongitude !== "function") {
    throw new Error("solarTerms: Astronomy.SunPosition / Astronomy.SearchSunLongitude not found.");
  }
}

function norm360(deg) {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

/** 把 Date 截断到“分钟”（直接去掉秒与毫秒，避免显示抖动）。 */
function floorToMinute(date) {
  return new Date(Math.floor(date.getTime() / MS_PER_MIN) * MS_PER_MIN);
}

/**
 * 计算当前节气索引：以 立春(315°) 作为 0 号起点，每 15°一个节气。
 * 返回 0..23
 */
function termIndexFromElon(elonDeg) {
  const x = norm360(elonDeg - 315);
  return Math.floor(x / 15); // 0..23
}

/** Astronomy.SearchSunLongitude 返回 AstroTime；我们统一取 .date（JS Date）。 */
function toDateFromAstroTime(t) {
  if (!t) return null;
  if (t instanceof Date) return t;
  if (typeof t === "object" && t.date instanceof Date) return t.date; // AstroTime
  // 兜底：尝试当成能被 Date 接受的东西
  return new Date(t);
}

/**
 * 在指定“中心时间”附近，搜索太阳到达某黄经的时刻。
 * 为了稳，我们给一个覆盖前后各 40 天的窗口（总 80 天）。
 *
 * @returns {Date} 找到则返回 JS Date；按你的“错误约定：不应该有错误”，找不到就抛异常。
 */
function findSunLongitudeEvent(targetLon, centerDate) {
  // 窗口：centerDate - 40d ... centerDate + 40d
  const start = new Date(centerDate.getTime() - 40 * MS_PER_DAY);
  const limitDays = 80;

  let t = Astronomy.SearchSunLongitude(norm360(targetLon), start, limitDays);
  let d = toDateFromAstroTime(t);

  // 极少数情况下（库版本差异/窗口不合适）可能返回 null；扩大窗口兜底一次。
  if (!d || Number.isNaN(d.getTime())) {
    const start2 = new Date(centerDate.getTime() - 200 * MS_PER_DAY);
    const limitDays2 = 400;
    t = Astronomy.SearchSunLongitude(norm360(targetLon), start2, limitDays2);
    d = toDateFromAstroTime(t);
  }

  if (!d || Number.isNaN(d.getTime())) {
    throw new Error(`solarTerms: failed to find Sun longitude event for lon=${targetLon}`);
  }
  return d;
}

/**
 * 主函数：获取节气信息
 *
 * @param {Date | string | number} inputDate - 推荐直接传 Date
 * @returns {{
 *   current: { name: string, lon: number, startTime: Date, endTime: Date },
 *   previous: { name: string, lon: number, startTime: Date },
 *   next: { name: string, lon: number, startTime: Date },
 *   meta: { sunEclipticLongitude: number, computedAt: Date }
 * }}
 */
export function getSolarTermInfo(inputDate) {
  assertAstronomy();

  const date = inputDate instanceof Date ? inputDate : new Date(inputDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error("solarTerms: invalid inputDate");
  }

  // 太阳视黄经（0..360）
  const elon = norm360(Astronomy.SunPosition(date).elon);

  // 先用黄经粗定位当前节气
  let idx = termIndexFromElon(elon);

  // 用“节气开始时刻”再校验一次：如果算出来的 startTime 竟然在输入时间之后，说明 idx 要往前退一格
  let currentStart = findSunLongitudeEvent(SOLAR_TERMS[idx].lon, date);
  if (currentStart.getTime() > date.getTime()) {
    idx = (idx + 23) % 24;
    currentStart = findSunLongitudeEvent(SOLAR_TERMS[idx].lon, date);
  }

  const prevIdx = (idx + 23) % 24;
  const nextIdx = (idx + 1) % 24;

  const prevStart = findSunLongitudeEvent(SOLAR_TERMS[prevIdx].lon, date);
  const nextStart = findSunLongitudeEvent(SOLAR_TERMS[nextIdx].lon, date);

  return {
    current: {
      name: SOLAR_TERMS[idx].name,
      lon: SOLAR_TERMS[idx].lon,
      startTime: floorToMinute(currentStart),
      endTime: floorToMinute(nextStart),
    },
    previous: {
      name: SOLAR_TERMS[prevIdx].name,
      lon: SOLAR_TERMS[prevIdx].lon,
      startTime: floorToMinute(prevStart),
    },
    next: {
      name: SOLAR_TERMS[nextIdx].name,
      lon: SOLAR_TERMS[nextIdx].lon,
      startTime: floorToMinute(nextStart),
    },
    meta: {
      sunEclipticLongitude: elon,
      computedAt: new Date(),
    },
  };
}

/** （可选）给 UI 用的分钟级格式化：YYYY-MM-DD HH:mm（本地时区） */
export function formatLocalMinute(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
