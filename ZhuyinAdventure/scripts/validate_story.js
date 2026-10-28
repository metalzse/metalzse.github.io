'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filename = path.resolve(process.argv[2] || 'story.js');
const source = fs.readFileSync(filename, 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(source, context, { filename });
const story = JSON.parse(vm.runInContext('JSON.stringify(STORY)', context));
const text = tokens => tokens.map(token => typeof token === 'string' ? token : token.text).join('');
const han = /\p{Script=Han}/u;
let tokenCount = 0;
function checkTokens(tokens, location) {
  assert(Array.isArray(tokens) && tokens.length, `${location}: missing text`);
  for (const token of tokens) {
    if (typeof token === 'string') {
      assert(!han.test(token), `${location}: unannotated Chinese ${token}`);
    } else {
      assert.equal([...token.text].length, 1, `${location}: annotate one character at a time`);
      assert(han.test(token.text), `${location}: expected Chinese character`);
      assert(/^[\u3105-\u312f]+[ˊˇˋ˙]?$/.test(token.zhuyin), `${location}: invalid tone position`);
      const special = { 小: 'ㄒㄧㄠˇ', 頭: 'ㄊㄡˊ', 看: 'ㄎㄢˋ', 吧: 'ㄅㄚ' };
      if (special[token.text]) assert.equal(token.zhuyin, special[token.text]);
      tokenCount++;
    }
  }
}
checkTokens(story.goal, 'goal');
Object.entries(story.labels).forEach(([key, value]) => checkTokens(value, `labels.${key}`));
Object.entries(story.items).forEach(([key, item]) => checkTokens(item.name, `items.${key}`));
const rooms = Object.values(story.rooms);
assert.equal(rooms.length, 12);
assert.equal(story.startRoom, '01');
assert.equal(new Set(rooms.map(room => room.id)).size, 12);
const expectedNames = ['火山研究站', '大門口', '山中樹林', '小石路', '水池', '木頭小屋', '山上小路', '熱氣谷', '山洞', '黑石谷', '石頭研究室', '研究發現室'];
const expectedDescriptions = [
  ['山上有一個小小的研究站。', '研究人員要找一種有小洞的黑色石頭。'],
  ['大門外有兩條小路。', '左邊有樹林，右邊有高山。'],
  ['樹林裡有好多高高的大樹。', '樹下有一條小石路。'],
  ['小路上有大大小小的石頭。', '左邊有水池，右邊有小木屋。'],
  ['水上有一塊小小的石頭。', '石頭有好多洞，竟然不會沉下去！'],
  ['小屋裡有好多工具和包包。', '一個採石包放在木桌上。'],
  ['山上有一條彎彎的小路。', '遠方有白色的熱氣升上天空。'],
  ['山谷的地上有白色熱氣。', '研究人員畫好了安全的小路。'],
  ['大山洞裡有黑色的石頭。', '這是很久以前的岩漿冷卻下來變成的。'],
  ['黑石谷裡有好多黑色石頭。', '一塊小石頭上有好多小洞。'],
  ['研究室裡有一台大大的觀察機器。', '機器可以把石頭的小洞放大。'],
  ['岩漿裡有氣體，會留下好多小洞。', '你找到了火山石，也解開了小洞的祕密！']
];
const expectedDoors = { '01': ['02', '11'], '02': ['03', '07'], '03': ['04'], '04': ['05', '06'], '05': [], '06': [], '07': ['08'], '08': ['09', '10'], '09': [], '10': [], '11': ['12'], '12': [] };
const parents = { '02': '01', '03': '02', '04': '03', '05': '04', '06': '04', '07': '02', '08': '07', '09': '08', '10': '08', '11': '02', '12': '11' };
rooms.forEach(room => {
  const index = Number(room.id) - 1;
  assert.equal(story.rooms[room.id], room);
  assert.equal(text(room.name), expectedNames[index]);
  assert.deepEqual(room.title, room.name);
  checkTokens(room.name, `${room.id}.name`);
  checkTokens(room.title, `${room.id}.title`);
  assert.equal(room.description.length, 2);
  room.description.forEach((line, i) => {
    checkTokens(line, `${room.id}.description.${i}`);
    assert.equal(text(line), expectedDescriptions[index][i]);
  });
  assert(room.icon);
  assert(room.doors.length <= 2);
  assert.deepEqual(room.doors.map(door => door.to), expectedDoors[room.id]);
  room.doors.forEach(door => {
    assert(story.rooms[door.to]);
    assert.equal(door.icon, story.rooms[door.to].icon);
    assert.deepEqual(door.name, story.rooms[door.to].name);
    checkTokens(door.name, `${room.id}.door.name`);
    checkTokens(door.description, `${room.id}.door.description`);
    if (door.lockedDescription) checkTokens(door.lockedDescription, `${room.id}.door.lockedDescription`);
    for (const key of ['requires', 'visibleRequires']) if (door[key]) assert(story.items[door[key]]);
  });
  if (room.id !== story.startRoom) {
    assert.equal(room.back.to, parents[room.id]);
    assert.equal(room.back.icon, story.rooms[room.back.to].icon);
    assert.equal(text(room.back.label), '回到' + text(story.rooms[room.back.to].name));
    checkTokens(room.back.label, `${room.id}.back`);
  } else assert(!room.back);
  for (const key of ['itemDescription', 'itemLockedDescription', 'lockedDescription', 'ending']) {
    if (room[key]) checkTokens(room[key], `${room.id}.${key}`);
  }
  for (const key of ['givesItem', 'itemRequires', 'requires']) if (room[key]) assert(story.items[room[key]]);
});
assert.equal(rooms.filter(room => room.ending).length, 1);
assert.equal(text(story.rooms['12'].ending), '⭐ 任務完成！');
assert.equal(story.rooms['06'].givesItem, 'sampling_bag');
assert.equal(story.rooms['10'].givesItem, 'volcanic_stone');
assert.equal(story.rooms['10'].itemRequires, 'sampling_bag');
assert(!story.rooms['05'].givesItem && !story.rooms['09'].givesItem);
assert.equal(story.rooms['01'].doors[1].visibleRequires, 'volcanic_stone');
assert.equal(story.rooms['11'].requires, 'volcanic_stone');
assert.equal(story.rooms['12'].requires, 'volcanic_stone');
assert.equal(story.rooms['11'].doors[0].requires, 'volcanic_stone');

// Exercise the actual renderer and storage, including direct URLs and reloads.
const engineSource = fs.readFileSync(path.join(path.dirname(filename), 'engine.js'), 'utf8');
const storage = new Map();
function boot(hash = '') {
  const app = { innerHTML: '', querySelectorAll: () => [] };
  const button = { addEventListener() {} };
  const sandbox = vm.createContext({
    window: { scrollTo() {}, addEventListener() {} },
    document: {
      getElementById: id => id === 'app' ? app : button,
      querySelectorAll: () => [], documentElement: {}, body: {}
    },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
    location: { hash }, history: { replaceState() {} }
  });
  vm.runInContext(source, sandbox, { filename });
  vm.runInContext(engineSource, sandbox, { filename: 'engine.js' });
  return { sandbox, app, run: code => vm.runInContext(code, sandbox) };
}
let game = boot('#12');
assert.equal(game.run('localStorage.getItem(stateKey)'), '01');
assert(!game.app.innerHTML.includes('data-room="11"'));
game.run('renderRoom("11")');
assert.equal(game.run('localStorage.getItem(stateKey)'), '01');
for (const id of ['02', '07', '08', '10']) game.run(`renderRoom("${id}")`);
assert.equal(game.run('hasItem("volcanic_stone")'), false);
assert(game.app.innerHTML.replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]*>/g, '').includes('你沒有採石包，不能帶走石頭。先回去找包包吧！'));
for (const id of ['08', '07', '02', '03', '04', '05', '04', '06']) game.run(`renderRoom("${id}")`);
assert.equal(game.run('hasItem("sampling_bag")'), true);
game = boot();
assert.equal(game.run('hasItem("sampling_bag")'), true);
for (const id of ['04', '03', '02', '07', '08', '09', '08', '10']) game.run(`renderRoom("${id}")`);
assert.equal(game.run('hasItem("volcanic_stone")'), true);
for (const id of ['08', '07', '02', '01']) game.run(`renderRoom("${id}")`);
assert(game.app.innerHTML.includes('data-room="11"'));
for (const id of ['11', '12']) game.run(`renderRoom("${id}")`);
assert.equal(game.run('localStorage.getItem(stateKey)'), '12');
assert(game.app.innerHTML.includes('class="ending"'));
assert.equal(game.run('getInventory().length'), 2);
game = boot();
assert.equal(game.run('localStorage.getItem(stateKey)'), '12');
assert.equal(game.run('getInventory().length'), 2);
game.run('renderRoom("11")');
assert.equal(game.run('localStorage.getItem(stateKey)'), '11');
game.run('renderRoom("10"); renderRoom("06")');
assert.equal(game.run('getInventory().length'), 2);
console.log(`PASS: 12 rooms, approved descriptions, ${tokenCount} annotated characters, map/icons/returns, item gates, ending guard, complete route and saved progress.`);
