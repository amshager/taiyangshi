async function test() {
  const res = await fetch('http://localhost:3000/api/astro-details?date=2026-03-03T03:29:33-08:00&lat=39.9042&lon=116.4074');
  const text = await res.text();
  console.log(text);
}
test();
