import sweph from 'sweph-wasm';

async function test() {
  const sw = await sweph.init();
  console.log(Object.keys(sw));
}
test();
