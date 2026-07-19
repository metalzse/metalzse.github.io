"use strict";

const LEARNED_CHARACTERS_KEY = "adventure-learned-characters";
const LEARNED_CHARACTERS_VERSION_KEY = "adventure-learned-characters-version";
const STORY_FILES = ["story.js", "story_airport.js", "story_dino.js", "story_wizard.js"];
const FALLBACK_ZHUYIN = {
  "人": "ㄖㄣˊ", "大": "ㄉㄚˋ", "小": "ㄒㄧㄠˇ", "山": "ㄕㄢ", "水": "ㄕㄨㄟˇ",
  "火": "ㄏㄨㄛˇ", "天": "ㄊㄧㄢ", "地": "ㄉㄧˋ", "日": "ㄖˋ", "月": "ㄩㄝˋ",
  "門": "ㄇㄣˊ", "手": "ㄕㄡˇ", "飛": "ㄈㄟ", "走": "ㄗㄡˇ", "來": "ㄌㄞˊ",
  "去": "ㄑㄩˋ", "看": "ㄎㄢˋ", "學": "ㄒㄩㄝˊ", "字": "ㄗˋ", "好": "ㄏㄠˇ"
};
const ENEMY_TYPES = [
  { type: "moss", baseName: "苔岩巨像", timedDefense: false },
  { type: "ember", baseName: "赤焰魔像", timedDefense: true }
];
const TIMED_DEFENSE_SECONDS = 10;

function createEnemies() {
  const count = Math.floor(Math.random() * 3) + 1;
  const maxHp = 120;
  return Array.from({ length: count }, (_, index) => {
    const enemyType = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    return {
      ...enemyType,
      name: count === 1 ? enemyType.baseName : `${enemyType.baseName} ${index + 1}`,
      hp: maxHp,
      maxHp
    };
  });
}

const createState = () => ({
  round: 1,
  phase: "player",
  finished: false,
  player: { hp: 100, maxHp: 100 },
  enemies: createEnemies(),
  enemyQueue: [],
  quiz: null
});

let state = createState();
let pendingTimer;
let defenseTimerInterval;
let defenseTimerDeadline = 0;
let zhuyinMap = { ...FALLBACK_ZHUYIN, ...(window.ZHUYIN_CHARACTER_MAP || {}) };

const $ = (selector) => document.querySelector(selector);
const elements = {
  round: $("#round-number"),
  playerHp: $("#player-hp-text"),
  playerHpBar: $("#player-hp-bar"),
  enemyParty: $("#enemy-party"),
  attackButton: $('[data-action="attack"]'),
  message: $("#turn-message"),
  log: $("#battle-log"),
  overlay: $("#result-overlay"),
  heroSprite: $(".hero"),
  challenge: $("#defense-challenge"),
  challengeCard: $(".challenge-card"),
  challengeSource: $("#challenge-source"),
  challengeWord: $("#challenge-word"),
  challengeTimer: $("#challenge-timer"),
  timerValue: $("#timer-value"),
  timerFill: $("#timer-fill"),
  shieldOptions: $("#shield-options"),
  challengeFeedback: $("#challenge-feedback"),
  correctionConfirm: $("#correction-confirm")
};

const randomDamage = () => Math.floor(Math.random() * 7) + 12;
const randomEnemyDamage = () => Math.floor(Math.random() * 6) + 10;
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const wait = (milliseconds) => new Promise((resolve) => {
  pendingTimer = window.setTimeout(resolve, milliseconds);
});

async function loadZhuyinData() {
  const sharedMap = window.ZHUYIN_CHARACTER_MAP || {};
  if (Object.keys(sharedMap).length) {
    zhuyinMap = { ...FALLBACK_ZHUYIN, ...sharedMap };
    backfillLearnedCharacterPronunciations();
    return;
  }

  // 舊頁面未載入共用字典時，保留透過 HTTP 讀取故事檔案的備援。
  const tokenPattern = /t\(\s*["']([\u3400-\u9fff\uf900-\ufaff])["']\s*,\s*["']([^"']+)["']\s*\)/gu;
  const loadedEntries = {};

  await Promise.all(STORY_FILES.map(async (filename) => {
    try {
      const response = await fetch(`../ZhuyinAdventure/${filename}`);
      if (!response.ok) return;
      const source = await response.text();
      for (const match of source.matchAll(tokenPattern)) {
        if (!loadedEntries[match[1]]) loadedEntries[match[1]] = match[2];
      }
    } catch {
      // 直接以 file:// 開啟時仍可使用內建的試玩字。
    }
  }));

  zhuyinMap = { ...FALLBACK_ZHUYIN, ...loadedEntries };
  backfillLearnedCharacterPronunciations();
}

function backfillLearnedCharacterPronunciations() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEARNED_CHARACTERS_KEY) || "[]");
    if (!Array.isArray(saved)) return;
    const entries = new Map();

    saved.forEach(item => {
      const character = typeof item === "string" ? item : item?.character;
      if (typeof character !== "string" || !character) return;
      const storedZhuyin = typeof item === "object" && typeof item.zhuyin === "string" ? item.zhuyin.trim() : "";
      const zhuyin = storedZhuyin || zhuyinMap[character] || "";
      const current = entries.get(character);
      if (!current || (!current.zhuyin && zhuyin)) entries.set(character, { character, zhuyin });
    });

    localStorage.setItem(LEARNED_CHARACTERS_KEY, JSON.stringify([...entries.values()]));
    localStorage.setItem(LEARNED_CHARACTERS_VERSION_KEY, "2");
  } catch {
    // 無法讀取舊紀錄時保留空字庫，不影響戰鬥。
  }
}

function getLearnedCharacters() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEARNED_CHARACTERS_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    const entries = new Map();

    saved.forEach(item => {
      const character = typeof item === "string" ? item : item?.character;
      if (typeof character !== "string" || !character) return;
      const storedZhuyin = typeof item === "object" && typeof item.zhuyin === "string" ? item.zhuyin.trim() : "";
      const zhuyin = storedZhuyin || zhuyinMap[character] || "";
      if (zhuyin && !entries.has(character)) entries.set(character, { character, zhuyin });
    });

    return [...entries.values()];
  } catch {
    return [];
  }
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function createQuiz(damage, enemyIndex, strike = 1, totalStrikes = 1) {
  const learnedCharacters = getLearnedCharacters();
  const usingFallback = learnedCharacters.length === 0;
  const candidates = usingFallback
    ? Object.entries(FALLBACK_ZHUYIN).map(([character, zhuyin]) => ({ character, zhuyin }))
    : learnedCharacters;
  const selectedEntry = randomItem(candidates);
  const character = selectedEntry.character;
  const correctAnswer = selectedEntry.zhuyin;
  const wrongAnswerPool = [...new Set(Object.values(zhuyinMap))].filter((answer) => answer !== correctAnswer);
  const wrongAnswers = shuffle(wrongAnswerPool).slice(0, 2);

  return {
    character,
    correctAnswer,
    answers: shuffle([correctAnswer, ...wrongAnswers]),
    damage,
    enemyIndex,
    strike,
    totalStrikes,
    timedDefense: state.enemies[enemyIndex].timedDefense,
    usingFallback,
    resolved: false
  };
}

function animate(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), 600);
}

function addLog(text) {
  const item = document.createElement("li");
  item.textContent = text;
  elements.log.prepend(item);
  while (elements.log.children.length > 5) elements.log.lastElementChild.remove();
}

function setMessage(title, detail, icon) {
  elements.message.innerHTML = `<span class="message-icon" aria-hidden="true">${icon}</span><p><strong>${title}</strong><span>${detail}</span></p>`;
}

function monsterMarkup(enemy) {
  return `<div class="monster-stage sprite enemy-${enemy.type}" aria-label="${enemy.name}">
    <div class="monster">
      <div class="monster-horn horn-left"></div><div class="monster-horn horn-right"></div>
      <div class="monster-head"><span class="eye left-eye"></span><span class="eye right-eye"></span></div>
      <div class="monster-body"><span class="rune">◇</span></div>
      <div class="monster-arm arm-left"></div><div class="monster-arm arm-right"></div>
    </div>
  </div>`;
}

function renderEnemies() {
  elements.enemyParty.innerHTML = state.enemies.map((enemy, index) => `
    <section class="enemy-unit enemy-unit-${enemy.type}" data-enemy-index="${index}" aria-label="${enemy.name}">
      <div class="enemy-nameplate">
        <strong>${enemy.name}</strong>
        ${enemy.timedDefense ? '<span class="enemy-trait">10 秒限時</span>' : ""}
        <div class="meter"><div class="meter-fill enemy-hp"></div></div>
        <span class="enemy-hp-text"></span>
      </div>
      ${monsterMarkup(enemy)}
    </section>
  `).join("");
}

function enemyStage(index) {
  return elements.enemyParty.querySelector(`[data-enemy-index="${index}"] .monster-stage`);
}

function livingEnemyIndexes() {
  return state.enemies.map((enemy, index) => enemy.hp > 0 ? index : -1).filter((index) => index >= 0);
}

function updateUI() {
  elements.round.textContent = state.round;
  elements.playerHp.textContent = `${state.player.hp} / ${state.player.maxHp}`;
  elements.playerHpBar.style.width = `${state.player.hp}%`;
  state.enemies.forEach((enemy, index) => {
    const unit = elements.enemyParty.querySelector(`[data-enemy-index="${index}"]`);
    if (!unit) return;
    unit.classList.toggle("defeated", enemy.hp === 0);
    unit.querySelector(".enemy-hp").style.width = `${enemy.hp / enemy.maxHp * 100}%`;
    unit.querySelector(".enemy-hp-text").textContent = enemy.hp > 0 ? `${enemy.hp} / ${enemy.maxHp}` : "已擊倒";
  });
  elements.attackButton.disabled = state.phase !== "player" || state.finished;
}

async function playerAttack() {
  if (state.phase !== "player" || state.finished) return;
  state.phase = "busy";
  updateUI();

  animate(elements.heroSprite, "attack-motion");
  await wait(220);

  const targetIndex = livingEnemyIndexes()[0];
  const target = state.enemies[targetIndex];
  const damage = randomDamage();
  target.hp = Math.max(0, target.hp - damage);
  animate(enemyStage(targetIndex), "hit");
  addLog(`主角攻擊 ${target.name}，造成 ${damage} 點傷害。`);
  updateUI();

  if (livingEnemyIndexes().length === 0) {
    endBattle(true);
    return;
  }

  const livingCount = livingEnemyIndexes().length;
  setMessage("敵人回合", `${livingCount} 名敵人準備攻擊…`, "◆");
  await wait(650);
  startEnemyTurn();
}

function startEnemyTurn() {
  state.enemyQueue = livingEnemyIndexes().flatMap((enemyIndex) => {
    const enemy = state.enemies[enemyIndex];
    const doubleStrike = !enemy.timedDefense && Math.random() < 0.20;
    if (!doubleStrike) return [{ enemyIndex, strike: 1, totalStrikes: 1 }];

    addLog(`${state.enemies[enemyIndex].name} 使出雙擊！`);
    return [
      { enemyIndex, strike: 1, totalStrikes: 2 },
      { enemyIndex, strike: 2, totalStrikes: 2 }
    ];
  });
  startEnemyAttack();
}

async function startEnemyAttack() {
  if (state.finished) return;
  const attackEvent = state.enemyQueue.shift();
  if (!attackEvent) {
    finishEnemyTurn(false);
    return;
  }
  const { enemyIndex, strike, totalStrikes } = attackEvent;
  const enemy = state.enemies[enemyIndex];
  state.phase = "enemy-animation";
  setMessage(
    totalStrikes === 2 ? `${enemy.name} 雙擊！` : `${enemy.name} 攻擊！`,
    totalStrikes === 2 ? `第 ${strike} 次攻擊` : "注意敵人的動作",
    "◆"
  );
  const attackAnimation = totalStrikes === 2
    ? (strike === 1 ? "double-strike-one" : "double-strike-two")
    : "attack-motion";
  animate(enemyStage(enemyIndex), attackAnimation);

  // 先讓攻擊動畫完整播放，再顯示注音盾牌題目。
  await wait(600);
  if (state.phase !== "enemy-animation" || state.finished) return;

  const damage = randomEnemyDamage();
  state.phase = "defense";
  state.quiz = createQuiz(damage, enemyIndex, strike, totalStrikes);
  const defenseTitle = totalStrikes === 2 ? `雙擊防禦 ${strike} / 2` : "防禦判定";
  setMessage(defenseTitle, enemy.timedDefense ? "10 秒內選出正確注音！" : "選出正確注音擋下攻擊！", "⬟");
  showDefenseChallenge();
  updateUI();
}

function showDefenseChallenge() {
  const quiz = state.quiz;
  const source = quiz.usingFallback ? "尚無已學會的字・使用試玩字" : "已學會的字";
  const strikeLabel = quiz.totalStrikes === 2 ? `雙擊防禦 ${quiz.strike} / 2・` : "";
  elements.challengeSource.textContent = `${strikeLabel}${quiz.timedDefense ? "10 秒限時・" : ""}${source}`;
  elements.challengeWord.textContent = quiz.character;
  elements.challengeFeedback.textContent = `選對就能擋下 ${quiz.damage} 點傷害`;
  elements.challengeFeedback.className = "challenge-feedback";
  elements.correctionConfirm.hidden = true;
  elements.challengeCard.classList.toggle("timed-defense", quiz.timedDefense);
  elements.challengeCard.classList.remove("timed-out");
  elements.challengeTimer.hidden = !quiz.timedDefense;
  elements.shieldOptions.innerHTML = "";

  quiz.answers.forEach((answer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-shield";
    button.dataset.answer = answer;
    const label = document.createElement("span");
    label.textContent = answer;
    button.appendChild(label);
    button.setAttribute("aria-label", `盾牌 ${answer}`);
    elements.shieldOptions.appendChild(button);
  });

  elements.challenge.hidden = false;
  if (quiz.timedDefense) startDefenseTimer();
  elements.shieldOptions.querySelector("button").focus();
}

function clearDefenseTimer() {
  window.clearInterval(defenseTimerInterval);
  defenseTimerInterval = undefined;
  defenseTimerDeadline = 0;
}

function startDefenseTimer() {
  clearDefenseTimer();
  defenseTimerDeadline = Date.now() + TIMED_DEFENSE_SECONDS * 1000;

  const updateTimer = () => {
    const remaining = Math.max(0, defenseTimerDeadline - Date.now());
    elements.timerValue.textContent = Math.ceil(remaining / 1000);
    elements.timerFill.style.width = `${remaining / (TIMED_DEFENSE_SECONDS * 1000) * 100}%`;
    if (remaining <= 0) handleDefenseTimeout();
  };

  updateTimer();
  defenseTimerInterval = window.setInterval(updateTimer, 100);
}

function revealCorrectAnswer() {
  elements.shieldOptions.querySelectorAll("button").forEach(button => {
    button.disabled = true;
    if (button.dataset.answer === state.quiz.correctAnswer) button.classList.add("correct");
  });
}

function handleDefenseTimeout() {
  const quiz = state.quiz;
  if (state.phase !== "defense" || !quiz?.timedDefense || quiz.resolved) return;
  quiz.resolved = true;
  state.phase = "correction";
  clearDefenseTimer();
  revealCorrectAnswer();
  elements.challengeCard.classList.add("timed-out");
  elements.challengeFeedback.textContent = `時間到！「${quiz.character}」的正確注音是 ${quiz.correctAnswer}`;
  elements.challengeFeedback.classList.add("failure");
  elements.correctionConfirm.hidden = false;
  elements.correctionConfirm.focus();
  addLog(`時間到，請確認「${quiz.character}」的正確注音：${quiz.correctAnswer}。`);
}

async function resolveDefense(selectedAnswer) {
  const quiz = state.quiz;
  if (state.phase !== "defense" || !quiz || quiz.resolved) return;
  quiz.resolved = true;
  clearDefenseTimer();
  const blocked = selectedAnswer === quiz.correctAnswer;
  const buttons = [...elements.shieldOptions.querySelectorAll("button")];

  buttons.forEach((button) => {
    button.disabled = true;
    if (button.dataset.answer === quiz.correctAnswer) button.classList.add("correct");
    if (button.dataset.answer === selectedAnswer && !blocked) button.classList.add("wrong");
  });

  if (blocked) {
    elements.challengeFeedback.textContent = "正確！盾牌擋下了攻擊！";
    elements.challengeFeedback.classList.add("success");
    addLog(`答對了！「${quiz.character}」的注音是 ${quiz.correctAnswer}，成功擋下攻擊。`);
    await wait(850);
    completeDefense(true);
  } else {
    state.phase = "correction";
    elements.challengeFeedback.textContent = `再看一次：「${quiz.character}」的正確注音是 ${quiz.correctAnswer}`;
    elements.challengeFeedback.classList.add("failure");
    elements.correctionConfirm.hidden = false;
    elements.correctionConfirm.focus();
    addLog(`答錯了，請確認「${quiz.character}」的正確注音：${quiz.correctAnswer}。`);
  }
}

function completeDefense(blocked) {
  const quiz = state.quiz;
  if (!quiz || state.finished) return;
  clearDefenseTimer();
  elements.correctionConfirm.hidden = true;
  elements.challenge.hidden = true;

  if (!blocked) {
    state.player.hp = Math.max(0, state.player.hp - quiz.damage);
    animate(elements.heroSprite, "hit");
    addLog(`主角受到 ${quiz.damage} 點傷害。`);
    updateUI();
  }

  if (state.player.hp === 0) {
    endBattle(false);
    return;
  }

  const nextAttack = state.enemyQueue[0];
  const continuingDoubleStrike = Boolean(
    nextAttack &&
    quiz.totalStrikes === 2 &&
    quiz.enemyIndex === nextAttack.enemyIndex &&
    nextAttack.strike === 2
  );
  state.quiz = null;
  if (state.enemyQueue.length > 0) {
    state.phase = "busy";
    setMessage(
      continuingDoubleStrike ? "雙擊尚未結束！" : "下一名敵人",
      continuingDoubleStrike ? "準備第二次獨立防禦判定…" : "準備迎接下一次攻擊…",
      "◆"
    );
    continueEnemyTurn();
    return;
  }

  finishEnemyTurn(blocked);
}

async function continueEnemyTurn() {
  await wait(450);
  if (state.phase === "busy" && !state.finished) startEnemyAttack();
}

function finishEnemyTurn(blocked) {
  state.round += 1;
  state.phase = "player";
  setMessage(blocked ? "完美防禦！" : "輪到你了", blocked ? "主角沒有受到傷害" : "按下攻擊繼續戰鬥", blocked ? "⬟" : "⚔");
  updateUI();
  elements.attackButton.focus();
}

function endBattle(victory) {
  clearDefenseTimer();
  state.finished = true;
  state.phase = "finished";
  elements.challenge.hidden = true;
  updateUI();
  $("#result-eyebrow").textContent = victory ? "戰鬥結束" : "挑戰失敗";
  $("#result-title").textContent = victory ? "勝利！" : "戰敗…";
  $("#result-emblem").textContent = victory ? "✦" : "◆";
  $("#result-copy").textContent = victory ? `你擊倒了 ${state.enemies.length} 名敵人。` : "主角失去戰鬥能力，再試一次吧。";
  $("#result-rounds").textContent = state.round;
  $("#result-hp").textContent = state.player.hp;
  window.setTimeout(() => {
    elements.overlay.hidden = false;
    $("#restart-button").focus();
  }, 400);
}

function restart() {
  window.clearTimeout(pendingTimer);
  clearDefenseTimer();
  state = createState();
  elements.log.innerHTML = "";
  elements.overlay.hidden = true;
  elements.challenge.hidden = true;
  renderEnemies();
  addLog(`${state.enemies.length} 名苔岩巨像擋住去路，戰鬥開始！`);
  setMessage("輪到你了", "按下攻擊開始戰鬥", "⚔");
  updateUI();
  elements.attackButton.focus();
}

elements.attackButton.addEventListener("click", playerAttack);
elements.shieldOptions.addEventListener("click", (event) => {
  const shield = event.target.closest("[data-answer]");
  if (shield) resolveDefense(shield.dataset.answer);
});
elements.correctionConfirm.addEventListener("click", () => {
  if (state.phase === "correction") completeDefense(false);
});
$("#restart-button").addEventListener("click", restart);
$("#restart-small").addEventListener("click", restart);

renderEnemies();
addLog(`${state.enemies.length} 名苔岩巨像擋住去路，戰鬥開始！`);
updateUI();
loadZhuyinData();
