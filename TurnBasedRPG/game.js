"use strict";

const LEARNED_CHARACTERS_KEY = "adventure-learned-characters";
const LEARNED_CHARACTERS_VERSION_KEY = "adventure-learned-characters-version";
const RPG_WEIGHT_STATE_KEY = "turn-based-rpg-zhuyin-weights-v1";
const STORY_FILES = ["story.js", "story_airport.js", "story_dino.js", "story_wizard.js"];
const FALLBACK_ZHUYIN = {
  "人": "ㄖㄣˊ", "大": "ㄉㄚˋ", "小": "ㄒㄧㄠˇ", "山": "ㄕㄢ", "水": "ㄕㄨㄟˇ",
  "火": "ㄏㄨㄛˇ", "天": "ㄊㄧㄢ", "地": "ㄉㄧˋ", "日": "ㄖˋ", "月": "ㄩㄝˋ",
  "門": "ㄇㄣˊ", "手": "ㄕㄡˇ", "飛": "ㄈㄟ", "走": "ㄗㄡˇ", "來": "ㄌㄞˊ",
  "去": "ㄑㄩˋ", "看": "ㄎㄢˋ", "學": "ㄒㄩㄝˊ", "字": "ㄗˋ", "好": "ㄏㄠˇ"
};
const ENEMY_TYPES = [
  { type: "moss", baseName: "苔岩巨像", timedDefense: false },
  { type: "ember", baseName: "赤焰魔像", timedDefense: true },
  { type: "obsession", baseName: "執念魔像", timedDefense: false, highestWeightDefense: true },
  { type: "tone", baseName: "聲調魔像", timedDefense: false, toneDefense: true },
  { type: "reverse", baseName: "字形魔像", timedDefense: false, reverseDefense: true },
  { type: "healer", baseName: "癒音魔像", timedDefense: false, healingAction: true }
];
const BOSS_TYPE = { type: "boss", baseName: "符文魔王", timedDefense: false };
const BOSS_SPAWN_CHANCE = 0.20;
const BOSS_MAX_HP = 200;
const MIN_ENEMY_UNITS = 2;
const MAX_ENEMY_UNITS = 5;
const TIMED_DEFENSE_SECONDS = 10;
const UNANSWERED_CHARACTER_WEIGHT = 1.75;
const WEIGHT_EXPONENT_BASE = 3.5;
const MIN_ANSWER_BALANCE = -4;
const MAX_ANSWER_BALANCE = 4;
const TONE_ANSWER_OPTIONS = ["1 聲", "2 聲", "3 聲", "4 聲", "˙"];
const HEALING_SPELL_OPTION_COUNT = 6;
const HEALING_SPELL_AMOUNT = 10;
const ZHUYIN_COMPONENTS = [
  "ㄅ", "ㄆ", "ㄇ", "ㄈ", "ㄉ", "ㄊ", "ㄋ", "ㄌ", "ㄍ", "ㄎ", "ㄏ",
  "ㄐ", "ㄑ", "ㄒ", "ㄓ", "ㄔ", "ㄕ", "ㄖ", "ㄗ", "ㄘ", "ㄙ",
  "ㄧ", "ㄨ", "ㄩ", "ㄚ", "ㄛ", "ㄜ", "ㄝ", "ㄞ", "ㄟ", "ㄠ", "ㄡ",
  "ㄢ", "ㄣ", "ㄤ", "ㄥ", "ㄦ", "1聲", "2聲", "3聲", "4聲", "˙"
];
let showWeightDebugInfo = false;

function learnedCharacterNames() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEARNED_CHARACTERS_KEY) || "[]");
    if (!Array.isArray(saved)) return new Set();
    return new Set(saved.map(item => typeof item === "string" ? item : item?.character).filter(Boolean));
  } catch {
    return new Set();
  }
}

function availableBossWords(excludedCharacters = []) {
  const learned = learnedCharacterNames();
  const excluded = new Set(excludedCharacters);
  return Object.entries(window.ZHUYIN_CHARACTER_MAP || {})
    .filter(([character, zhuyin]) => zhuyin && !learned.has(character) && !excluded.has(character))
    .map(([character, zhuyin]) => ({ character, zhuyin }));
}

function canCreateReverseEnemy() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEARNED_CHARACTERS_KEY) || "[]");
    if (!Array.isArray(saved)) return false;
    const pronunciations = new Set();

    saved.forEach(item => {
      const character = typeof item === "string" ? item : item?.character;
      if (!character) return;
      const storedZhuyin = typeof item === "object" && typeof item.zhuyin === "string" ? item.zhuyin.trim() : "";
      const zhuyin = storedZhuyin || window.ZHUYIN_CHARACTER_MAP?.[character] || FALLBACK_ZHUYIN[character] || "";
      if (zhuyin) pronunciations.add(zhuyin);
    });

    return pronunciations.size >= 3;
  } catch {
    return false;
  }
}

function createRegularEnemies(count) {
  const maxHp = 80;
  const enemyTypePool = canCreateReverseEnemy()
    ? ENEMY_TYPES
    : ENEMY_TYPES.filter(enemyType => !enemyType.reverseDefense);
  return Array.from({ length: count }, (_, index) => {
    const enemyType = enemyTypePool[Math.floor(Math.random() * enemyTypePool.length)];
    return {
      ...enemyType,
      name: count === 1 ? enemyType.baseName : `${enemyType.baseName} ${index + 1}`,
      hp: maxHp,
      maxHp
    };
  });
}

function createEnemies() {
  const enemyUnits = Math.floor(Math.random() * (MAX_ENEMY_UNITS - MIN_ENEMY_UNITS + 1)) + MIN_ENEMY_UNITS;
  const bossCandidates = availableBossWords();
  const includeBoss = bossCandidates.length > 0 && Math.random() < BOSS_SPAWN_CHANCE;
  const regularEnemies = createRegularEnemies(enemyUnits - (includeBoss ? 2 : 0));

  if (includeBoss) {
    const firstWord = bossCandidates[Math.floor(Math.random() * bossCandidates.length)];
    return [{
      ...BOSS_TYPE,
      name: BOSS_TYPE.baseName,
      hp: BOSS_MAX_HP,
      maxHp: BOSS_MAX_HP,
      wordList: [firstWord]
    }, ...regularEnemies];
  }

  return regularEnemies;
}

function enemyUnitCount(enemies = state.enemies) {
  return enemies.reduce((total, enemy) => total + (enemy.type === "boss" ? 2 : 1), 0);
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
let weightState = loadWeightState();
let lastQuizCharacter = "";
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
  challengeTitle: $("#challenge-title"),
  challengeWord: $("#challenge-word"),
  challengePronunciation: $("#challenge-pronunciation"),
  challengeTimer: $("#challenge-timer"),
  timerValue: $("#timer-value"),
  timerFill: $("#timer-fill"),
  shieldOptions: $("#shield-options"),
  challengeFeedback: $("#challenge-feedback"),
  spellConfirm: $("#spell-confirm"),
  correctionConfirm: $("#correction-confirm"),
  gameDebugLayout: $(".game-debug-layout"),
  weightDebugPanel: $(".weight-debug-panel"),
  weightDebugToggle: $("#weight-debug-toggle"),
  weightDebugSummary: $("#weight-debug-summary"),
  weightDebugList: $("#weight-debug-list")
};

const randomDamage = () => Math.floor(Math.random() * 7) + 12;
const randomEnemyDamage = () => Math.floor(Math.random() * 6) + 10;
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const wait = (milliseconds) => new Promise((resolve) => {
  pendingTimer = window.setTimeout(resolve, milliseconds);
});

function loadWeightState() {
  try {
    const saved = JSON.parse(localStorage.getItem(RPG_WEIGHT_STATE_KEY) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    const migrated = {};

    Object.entries(saved).forEach(([character, value]) => {
      let balance;
      if (Number.isFinite(value)) balance = Number(value);
      else if (value && typeof value === "object" && Number.isFinite(value.balance)) balance = Number(value.balance);
      else if (value && typeof value === "object") balance = (Number(value.wrong) || 0) - (Number(value.correct) || 0);
      else balance = 0;
      migrated[character] = Math.min(Math.max(Math.round(balance), MIN_ANSWER_BALANCE), MAX_ANSWER_BALANCE);
    });

    localStorage.setItem(RPG_WEIGHT_STATE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return {};
  }
}

function saveWeightState() {
  localStorage.setItem(RPG_WEIGHT_STATE_KEY, JSON.stringify(weightState));
}

function characterBalance(character) {
  const savedBalance = Number(weightState[character]);
  if (!Number.isFinite(savedBalance)) return 0;
  return Math.min(Math.max(Math.round(savedBalance), MIN_ANSWER_BALANCE), MAX_ANSWER_BALANCE);
}

function characterWeight(character) {
  return UNANSWERED_CHARACTER_WEIGHT * WEIGHT_EXPONENT_BASE ** characterBalance(character);
}

function weightedCharacterPick(candidates) {
  const weightedCandidates = candidates.map(entry => ({ ...entry, weight: characterWeight(entry.character) }));
  const pool = lastQuizCharacter && weightedCandidates.length > 1
    ? weightedCandidates.filter(entry => entry.character !== lastQuizCharacter)
    : weightedCandidates;
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = Math.random() * totalWeight;

  for (const entry of pool) {
    threshold -= entry.weight;
    if (threshold <= 0) return entry;
  }
  return pool[pool.length - 1];
}

function highestWeightedCharacterPick(candidates) {
  const weightedCandidates = candidates.map(entry => ({ ...entry, weight: characterWeight(entry.character) }));
  const highestWeight = Math.max(...weightedCandidates.map(entry => entry.weight));
  return randomItem(weightedCandidates.filter(entry => entry.weight === highestWeight));
}

function characterSelectionProbability(candidates, selectedEntry, highestWeightOnly) {
  const weightedCandidates = candidates.map(entry => ({ ...entry, weight: characterWeight(entry.character) }));

  if (highestWeightOnly) {
    const highestWeight = Math.max(...weightedCandidates.map(entry => entry.weight));
    const highestCandidates = weightedCandidates.filter(entry => entry.weight === highestWeight);
    return {
      probability: 1 / highestCandidates.length,
      candidateCount: weightedCandidates.length,
      eligibleCandidateCount: highestCandidates.length,
      excludedLastCharacter: ""
    };
  }

  const excludedLastCharacter = lastQuizCharacter && weightedCandidates.length > 1
    && weightedCandidates.some(entry => entry.character === lastQuizCharacter)
    ? lastQuizCharacter
    : "";
  const pool = lastQuizCharacter && weightedCandidates.length > 1
    ? weightedCandidates.filter(entry => entry.character !== lastQuizCharacter)
    : weightedCandidates;
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  const selected = pool.find(entry => entry.character === selectedEntry.character);
  return {
    probability: selected ? selected.weight / totalWeight : 0,
    candidateCount: weightedCandidates.length,
    eligibleCandidateCount: pool.length,
    excludedLastCharacter
  };
}

function toneAnswerFromZhuyin(zhuyin) {
  if (zhuyin.includes("˙")) return "˙";
  if (zhuyin.includes("ˊ")) return "2 聲";
  if (zhuyin.includes("ˇ")) return "3 聲";
  if (zhuyin.includes("ˋ")) return "4 聲";
  return "1 聲";
}

function zhuyinWithoutTone(zhuyin) {
  return zhuyin.replace(/[ˊˇˋ˙]/g, "");
}

function zhuyinComponents(zhuyin) {
  const toneLabels = { "ˊ": "2聲", "ˇ": "3聲", "ˋ": "4聲", "˙": "˙" };
  const components = [...zhuyin]
    .filter(component => !/\s/u.test(component))
    .map(component => toneLabels[component] || component);
  if (!components.some(component => ["2聲", "3聲", "4聲", "˙"].includes(component))) components.push("1聲");
  return components;
}

function sameComponents(first, second) {
  if (first.length !== second.length) return false;
  const sortedFirst = [...first].sort();
  const sortedSecond = [...second].sort();
  return sortedFirst.every((component, index) => component === sortedSecond[index]);
}

function baselineProbabilityForCharacter(character, candidateCharacters) {
  const uniqueCharacters = [...new Set(candidateCharacters)];
  const totalWeight = uniqueCharacters.reduce((sum, candidate) => sum + characterWeight(candidate), 0);
  return totalWeight > 0 && uniqueCharacters.includes(character) ? characterWeight(character) / totalWeight : 0;
}

function recordQuizResult(character, correct, candidateCharacters = []) {
  const previousWeight = characterWeight(character);
  const previousProbability = baselineProbabilityForCharacter(character, candidateCharacters);
  const previousBalance = characterBalance(character);
  const nextBalance = Math.min(
    Math.max(previousBalance + (correct ? -1 : 1), MIN_ANSWER_BALANCE),
    MAX_ANSWER_BALANCE
  );
  weightState[character] = nextBalance;
  saveWeightState();
  const nextWeight = characterWeight(character);
  const nextProbability = baselineProbabilityForCharacter(character, candidateCharacters);
  renderWeightDebugPanel();
  return { previousWeight, nextWeight, previousProbability, nextProbability, previousBalance, nextBalance };
}

function addWeightChangeLog(character, correct, change) {
  const previousBalance = change.previousBalance > 0 ? `+${change.previousBalance}` : `${change.previousBalance}`;
  const nextBalance = change.nextBalance > 0 ? `+${change.nextBalance}` : `${change.nextBalance}`;
  addLog(`【權重更新】「${character}」${correct ? "答對" : "答錯"}｜差值 ${previousBalance}→${nextBalance}｜權重 ${change.previousWeight.toFixed(2)}×→${change.nextWeight.toFixed(2)}×｜基準機率 ${(change.previousProbability * 100).toFixed(2)}%→${(change.nextProbability * 100).toFixed(2)}%`, "weight-debug-log");
}

function applyWeightDebugVisibility() {
  elements.gameDebugLayout.classList.toggle("weight-debug-hidden", !showWeightDebugInfo);
  elements.weightDebugPanel.hidden = !showWeightDebugInfo;
  elements.weightDebugToggle.textContent = showWeightDebugInfo ? "隱藏權重" : "顯示權重";
  elements.weightDebugToggle.setAttribute("aria-pressed", String(showWeightDebugInfo));

  const challengeSourceBase = elements.challengeSource.dataset.baseText;
  if (challengeSourceBase) {
    const weightDebugLabel = showWeightDebugInfo && state.quiz ? `・權重 ${state.quiz.weight.toFixed(2)}×` : "";
    elements.challengeSource.textContent = `${challengeSourceBase}${weightDebugLabel}`;
  }
}

function renderWeightDebugPanel() {
  const learnedNames = [...learnedCharacterNames()];
  const validEntries = new Map(getLearnedCharacters().map(entry => [entry.character, entry]));
  const rows = learnedNames.map(character => {
    const validEntry = validEntries.get(character);
    return {
      character,
      zhuyin: validEntry?.zhuyin || "缺少注音",
      eligible: Boolean(validEntry),
      balance: characterBalance(character),
      weight: characterWeight(character)
    };
  });
  const totalWeight = rows.reduce((sum, row) => sum + (row.eligible ? row.weight : 0), 0);

  rows.forEach(row => {
    row.probability = row.eligible && totalWeight > 0 ? row.weight / totalWeight : 0;
  });
  rows.sort((first, second) => second.weight - first.weight || first.character.localeCompare(second.character, "zh-Hant"));

  elements.weightDebugSummary.textContent = `${rows.length} 字・可出題 ${validEntries.size}`;
  elements.weightDebugList.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("li");
    empty.className = "weight-debug-empty";
    empty.textContent = "目前沒有已學字";
    elements.weightDebugList.appendChild(empty);
    return;
  }

  const highestWeight = rows[0].weight;
  rows.forEach(row => {
    const item = document.createElement("li");
    item.className = "weight-debug-row";
    if (row.weight === highestWeight) item.classList.add("highest");
    if (!row.eligible) item.classList.add("unavailable");

    const word = document.createElement("span");
    word.className = "weight-debug-word";
    const character = document.createElement("strong");
    character.textContent = row.character;
    const zhuyin = document.createElement("small");
    zhuyin.textContent = row.zhuyin;
    word.append(character, zhuyin);

    const weight = document.createElement("b");
    weight.textContent = `${row.weight.toFixed(2)}×`;
    weight.title = `答錯減答對：${row.balance > 0 ? "+" : ""}${row.balance}`;
    const probability = document.createElement("span");
    probability.textContent = `${(row.probability * 100).toFixed(2)}%`;
    item.append(word, weight, probability);
    elements.weightDebugList.appendChild(item);
  });
}

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
  renderWeightDebugPanel();
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
  const enemy = state.enemies[enemyIndex];
  const bossQuiz = enemy.type === "boss";
  const highestWeightQuiz = Boolean(enemy.highestWeightDefense);
  const toneQuiz = Boolean(enemy.toneDefense);
  const reverseQuiz = Boolean(enemy.reverseDefense);
  const healingQuiz = Boolean(enemy.healingAction);
  const learnedCharacters = getLearnedCharacters();
  const usingFallback = !bossQuiz && learnedCharacters.length === 0;
  const candidates = bossQuiz
    ? enemy.wordList
    : usingFallback
      ? Object.entries(FALLBACK_ZHUYIN).map(([character, zhuyin]) => ({ character, zhuyin }))
      : learnedCharacters;
  const selectedEntry = highestWeightQuiz
    ? highestWeightedCharacterPick(candidates)
    : weightedCharacterPick(candidates);
  const character = selectedEntry.character;
  const pronunciation = selectedEntry.zhuyin;
  const promptPronunciation = toneQuiz ? zhuyinWithoutTone(pronunciation) : pronunciation;
  const correctAnswer = toneQuiz ? toneAnswerFromZhuyin(pronunciation) : reverseQuiz ? character : pronunciation;
  const selectionDebug = characterSelectionProbability(candidates, selectedEntry, highestWeightQuiz);
  const selectionMode = bossQuiz
    ? "魔王字庫"
    : highestWeightQuiz ? "最高權重" : toneQuiz ? "聲調" : reverseQuiz ? "注音選字" : healingQuiz ? "治療組字" : "一般加權";
  lastQuizCharacter = character;
  const reverseDistractors = reverseQuiz
    ? candidates
      .filter(entry => entry.character !== character && entry.zhuyin !== pronunciation)
      .map(entry => entry.character)
    : [];
  const correctComponents = healingQuiz ? zhuyinComponents(pronunciation) : [];
  const componentDistractors = healingQuiz
    ? shuffle(ZHUYIN_COMPONENTS.filter(component => !correctComponents.includes(component)))
    : [];
  const answers = healingQuiz
    ? shuffle([...correctComponents, ...componentDistractors.slice(0, Math.max(0, HEALING_SPELL_OPTION_COUNT - correctComponents.length))])
    : toneQuiz
    ? [...TONE_ANSWER_OPTIONS]
    : reverseQuiz
      ? shuffle([
          correctAnswer,
          ...shuffle(reverseDistractors).slice(0, 2)
        ])
    : shuffle([
        correctAnswer,
        ...shuffle([...new Set(Object.values(zhuyinMap))].filter(answer => answer !== correctAnswer)).slice(0, 2)
      ]);

  return {
    character,
    pronunciation,
    promptPronunciation,
    correctAnswer,
    weight: selectedEntry.weight,
    selectionProbability: selectionDebug.probability,
    candidateCount: selectionDebug.candidateCount,
    eligibleCandidateCount: selectionDebug.eligibleCandidateCount,
    excludedLastCharacter: selectionDebug.excludedLastCharacter,
    rawLearnedCount: learnedCharacterNames().size,
    validLearnedCount: learnedCharacters.length,
    selectionMode,
    candidateCharacters: candidates.map(entry => entry.character),
    answers,
    damage,
    enemyIndex,
    strike,
    totalStrikes,
    timedDefense: state.enemies[enemyIndex].timedDefense,
    bossQuiz,
    highestWeightQuiz,
    toneQuiz,
    reverseQuiz,
    healingQuiz,
    correctComponents,
    selectedComponents: [],
    healAmount: healingQuiz ? HEALING_SPELL_AMOUNT : 0,
    bossWordCount: bossQuiz ? enemy.wordList.length : 0,
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

function addLog(text, className = "") {
  const item = document.createElement("li");
  item.textContent = text;
  if (className) item.classList.add(className);
  elements.log.prepend(item);
}

function battleStartMessage() {
  if (state.enemies.length === 1) return `${state.enemies[0].name}擋住去路（敵人額度 ${enemyUnitCount()}），戰鬥開始！`;
  return `${state.enemies.length} 名敵人擋住去路（敵人額度 ${enemyUnitCount()}），戰鬥開始！`;
}

function setMessage(title, detail, icon) {
  elements.message.innerHTML = `<span class="message-icon" aria-hidden="true">${icon}</span><p><strong>${title}</strong><span>${detail}</span></p>`;
}

function monsterMarkup(enemy) {
  const rune = { boss: "王", obsession: "重", tone: "聲", reverse: "字", healer: "癒" }[enemy.type] || "◇";
  return `<div class="monster-stage sprite enemy-${enemy.type}" aria-label="${enemy.name}">
    <div class="monster">
      <div class="monster-horn horn-left"></div><div class="monster-horn horn-right"></div>
      <div class="monster-head"><span class="eye left-eye"></span><span class="eye right-eye"></span></div>
      <div class="monster-body"><span class="rune">${rune}</span></div>
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
        ${enemy.highestWeightDefense ? '<span class="enemy-trait obsession-trait">鎖定最高權重</span>' : ""}
        ${enemy.toneDefense ? '<span class="enemy-trait tone-trait">聲調判定</span>' : ""}
        ${enemy.reverseDefense ? '<span class="enemy-trait reverse-trait">注音選字</span>' : ""}
        ${enemy.healingAction ? '<span class="enemy-trait healer-trait">全體治療咒語</span>' : ""}
        ${enemy.type === "boss" ? `<span class="enemy-trait boss-trait">占 2 人・魔王字庫 ${enemy.wordList.length} 字</span>` : ""}
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
  elements.playerHp.textContent = `${state.player.hp.toLocaleString()} / ${state.player.maxHp.toLocaleString()}`;
  elements.playerHpBar.style.width = `${state.player.hp}%`;
  state.enemies.forEach((enemy, index) => {
    const unit = elements.enemyParty.querySelector(`[data-enemy-index="${index}"]`);
    if (!unit) return;
    unit.classList.toggle("defeated", enemy.hp === 0);
    unit.querySelector(".enemy-hp").style.width = `${enemy.hp / enemy.maxHp * 100}%`;
    unit.querySelector(".enemy-hp-text").textContent = enemy.hp > 0 ? `${enemy.hp} / ${enemy.maxHp}` : "已擊倒";
    const bossTrait = unit.querySelector(".boss-trait");
    if (bossTrait) bossTrait.textContent = `占 2 人・魔王字庫 ${enemy.wordList.length} 字`;
  });
  const playerCanAct = state.phase === "player" && !state.finished;
  elements.attackButton.disabled = !playerCanAct;
  elements.attackButton.classList.toggle("player-ready", playerCanAct);
}

async function playerAttack() {
  if (state.phase !== "player" || state.finished) return;
  state.phase = "busy";
  updateUI();

  animate(elements.heroSprite, "attack-motion");
  await wait(220);

  const targetIndex = randomItem(livingEnemyIndexes());
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
  setMessage("敵人回合", `${livingCount} 名敵人準備行動…`, "◆");
  await wait(650);
  startEnemyTurn();
}

function startEnemyTurn() {
  state.enemyQueue = livingEnemyIndexes().flatMap((enemyIndex) => {
    const enemy = state.enemies[enemyIndex];
    const doubleStrike = enemy.type === "moss" && Math.random() < 0.20;
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
    enemy.healingAction ? `${enemy.name} 詠唱！` : totalStrikes === 2 ? `${enemy.name} 雙擊！` : `${enemy.name} 攻擊！`,
    enemy.healingAction ? "治療能量正在聚集" : totalStrikes === 2 ? `第 ${strike} 次攻擊` : "注意敵人的動作",
    enemy.healingAction ? "✚" : "◆"
  );
  const attackAnimation = enemy.healingAction
    ? "healer-cast"
    : enemy.type === "boss"
    ? "boss-attack"
    : totalStrikes === 2
      ? (strike === 1 ? "double-strike-one" : "double-strike-two")
      : "attack-motion";
  animate(enemyStage(enemyIndex), attackAnimation);

  // 先讓攻擊動畫完整播放，再顯示注音盾牌題目。
  await wait(600);
  if (state.phase !== "enemy-animation" || state.finished) return;

  const damage = enemy.healingAction ? 0 : randomEnemyDamage();
  state.phase = "defense";
  state.quiz = createQuiz(damage, enemyIndex, strike, totalStrikes);
  const debug = state.quiz;
  const exclusionDebug = debug.excludedLastCharacter ? `排除上一題「${debug.excludedLastCharacter}」` : "未排除上一題";
  addLog(`【權重除錯】${enemy.name}／${debug.selectionMode}｜抽中「${debug.character}」 ${debug.weight.toFixed(2)}×／${(debug.selectionProbability * 100).toFixed(2)}%｜候選 ${debug.candidateCount}→實際池 ${debug.eligibleCandidateCount}｜已學儲存 ${debug.rawLearnedCount}／有效注音 ${debug.validLearnedCount}｜${exclusionDebug}`, "weight-debug-log");
  const defenseTitle = enemy.healingAction ? "破解治療咒語" : totalStrikes === 2 ? `雙擊防禦 ${strike} / 2` : "防禦判定";
  const defenseInstruction = enemy.healingAction
    ? "選出完整注音與聲調，再按確認！"
    : enemy.timedDefense
    ? "10 秒內選出正確注音！"
    : enemy.toneDefense
      ? "選出正確聲調擋下攻擊！"
      : enemy.reverseDefense ? "選出正確中文字擋下攻擊！" : "選出正確注音擋下攻擊！";
  setMessage(defenseTitle, defenseInstruction, enemy.healingAction ? "✚" : "⬟");
  showDefenseChallenge();
  updateUI();
}

function showDefenseChallenge() {
  const quiz = state.quiz;
  const source = quiz.bossQuiz
    ? `魔王獨立字庫 ${quiz.bossWordCount} 字`
    : quiz.highestWeightQuiz
      ? "目前最高權重字"
      : quiz.toneQuiz
        ? (quiz.usingFallback ? "聲調判定・試玩字" : "聲調判定・已學會的字")
      : quiz.reverseQuiz
        ? (quiz.usingFallback ? "注音選字・試玩字" : "注音選字・已學會的字")
      : quiz.healingQuiz
        ? (quiz.usingFallback ? "治療咒語・試玩字" : "治療咒語・已學會的字")
      : quiz.usingFallback ? "尚無已學會的字・使用試玩字" : "已學會的字";
  const strikeLabel = quiz.totalStrikes === 2 ? `雙擊防禦 ${quiz.strike} / 2・` : "";
  const challengeSourceBase = `${strikeLabel}${quiz.timedDefense ? "10 秒限時・" : ""}${source}`;
  const weightDebugLabel = showWeightDebugInfo ? `・權重 ${quiz.weight.toFixed(2)}×` : "";
  elements.challengeSource.dataset.baseText = challengeSourceBase;
  elements.challengeSource.textContent = `${challengeSourceBase}${weightDebugLabel}`;
  elements.challengeTitle.textContent = quiz.healingQuiz
    ? "選出這個字的完整注音與聲調！"
    : quiz.toneQuiz
    ? "選出正確的聲調，擋下攻擊！"
    : quiz.reverseQuiz ? "選出符合注音的中文字，擋下攻擊！" : "選出正確的注音，擋下攻擊！";
  elements.challengeWord.textContent = quiz.reverseQuiz ? quiz.pronunciation : quiz.character;
  elements.challengeWord.setAttribute("aria-label", quiz.toneQuiz
    ? `題目 ${quiz.character}，無聲調注音 ${quiz.promptPronunciation}`
    : quiz.reverseQuiz ? `題目注音 ${quiz.pronunciation}` : `題目 ${quiz.character}`);
  elements.challengePronunciation.textContent = quiz.promptPronunciation;
  elements.challengePronunciation.hidden = !quiz.toneQuiz;
  elements.challengeFeedback.textContent = quiz.healingQuiz
    ? "可複選注音元件，選好後按確認組合"
    : `選對就能擋下 ${quiz.damage} 點傷害`;
  elements.challengeFeedback.className = "challenge-feedback";
  elements.correctionConfirm.hidden = true;
  elements.spellConfirm.hidden = !quiz.healingQuiz;
  elements.spellConfirm.disabled = quiz.healingQuiz;
  elements.challengeCard.classList.toggle("timed-defense", quiz.timedDefense);
  elements.challengeCard.classList.toggle("tone-defense", quiz.toneQuiz);
  elements.challengeCard.classList.toggle("reverse-defense", quiz.reverseQuiz);
  elements.challengeCard.classList.toggle("healing-spell", quiz.healingQuiz);
  elements.challengeCard.classList.remove("timed-out");
  elements.challengeTimer.hidden = !quiz.timedDefense;
  elements.shieldOptions.innerHTML = "";
  elements.shieldOptions.setAttribute("aria-label", quiz.healingQuiz
    ? "選擇完整的注音與聲調"
    : quiz.toneQuiz
    ? "選擇正確的聲調"
    : quiz.reverseQuiz ? "選擇正確的中文字" : "選擇正確的注音");

  quiz.answers.forEach((answer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-shield";
    button.dataset.answer = answer;
    button.setAttribute("aria-pressed", "false");
    const label = document.createElement("span");
    label.textContent = answer;
    button.appendChild(label);
    button.setAttribute("aria-label", `${quiz.healingQuiz ? "注音元件" : "盾牌"} ${answer}`);
    elements.shieldOptions.appendChild(button);
  });

  elements.challenge.hidden = false;
  if (quiz.timedDefense) startDefenseTimer();
  elements.shieldOptions.querySelector("button").focus();
}

function toggleHealingComponent(button) {
  const quiz = state.quiz;
  if (state.phase !== "defense" || !quiz?.healingQuiz || quiz.resolved) return;
  const component = button.dataset.answer;
  const selected = button.getAttribute("aria-pressed") === "true";
  button.setAttribute("aria-pressed", String(!selected));
  button.classList.toggle("selected", !selected);
  quiz.selectedComponents = [...elements.shieldOptions.querySelectorAll('[aria-pressed="true"]')]
    .map(option => option.dataset.answer);
  elements.spellConfirm.disabled = quiz.selectedComponents.length === 0;
  elements.challengeFeedback.textContent = quiz.selectedComponents.length
    ? `已選：${quiz.selectedComponents.join(" ")}`
    : "可複選注音元件，選好後按確認組合";
}

function healLivingEnemies(amount) {
  const healed = [];
  livingEnemyIndexes().forEach(index => {
    const enemy = state.enemies[index];
    const recovered = Math.min(amount, enemy.maxHp - enemy.hp);
    enemy.hp += recovered;
    if (recovered > 0) healed.push(`${enemy.name} +${recovered}`);
    animate(enemyStage(index), "heal-received");
  });
  updateUI();
  return healed;
}

async function resolveHealingSpell() {
  const quiz = state.quiz;
  if (state.phase !== "defense" || !quiz?.healingQuiz || quiz.resolved) return;
  quiz.resolved = true;
  const correct = sameComponents(quiz.selectedComponents, quiz.correctComponents);
  const weightChange = recordQuizResult(quiz.character, correct, quiz.candidateCharacters);
  const buttons = [...elements.shieldOptions.querySelectorAll("button")];
  buttons.forEach(button => {
    button.disabled = true;
    if (quiz.correctComponents.includes(button.dataset.answer)) button.classList.add("correct");
    if (button.classList.contains("selected") && !quiz.correctComponents.includes(button.dataset.answer)) button.classList.add("wrong");
  });
  elements.spellConfirm.hidden = true;

  if (correct) {
    elements.challengeFeedback.textContent = `破解成功！${quiz.correctComponents.join(" ")} 組成 ${quiz.pronunciation}，治療咒語失效。`;
    elements.challengeFeedback.classList.add("success");
    addLog(`答對了！成功拼出「${quiz.character}」的注音 ${quiz.pronunciation}，${state.enemies[quiz.enemyIndex].name} 的治療咒語失效。`);
    addWeightChangeLog(quiz.character, true, weightChange);
    await wait(950);
    completeDefense(true);
    return;
  }

  state.phase = "correction";
  elements.challengeFeedback.textContent = `組合不正確。「${quiz.character}」需要 ${quiz.correctComponents.join(" ")}（${quiz.pronunciation}）。確認後治療咒語將會生效。`;
  elements.challengeFeedback.classList.add("failure");
  elements.correctionConfirm.hidden = false;
  elements.correctionConfirm.focus();
  addLog(`請確認：「${quiz.character}」的完整注音是 ${quiz.pronunciation}。`);
  addWeightChangeLog(quiz.character, false, weightChange);
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
  const weightChange = recordQuizResult(quiz.character, false, quiz.candidateCharacters);
  revealCorrectAnswer();
  elements.challengeCard.classList.add("timed-out");
  elements.challengeFeedback.textContent = `時間到！「${quiz.character}」的正確注音是 ${quiz.correctAnswer}`;
  elements.challengeFeedback.classList.add("failure");
  elements.correctionConfirm.hidden = false;
  elements.correctionConfirm.focus();
  addLog(`時間到，請確認「${quiz.character}」的正確注音：${quiz.correctAnswer}。`);
  addWeightChangeLog(quiz.character, false, weightChange);
}

function expandBossWordList(enemyIndex) {
  const enemy = state.enemies[enemyIndex];
  if (enemy?.type !== "boss") return null;
  const candidates = availableBossWords(enemy.wordList.map(entry => entry.character));
  if (!candidates.length) {
    addLog("符文魔王已經收集完所有尚未學會的故事字。");
    return null;
  }

  const newWord = randomItem(candidates);
  enemy.wordList.push(newWord);
  addLog(`成功防守，符文魔王的獨立字庫增加到 ${enemy.wordList.length} 字。`);
  updateUI();
  return newWord;
}

async function resolveDefense(selectedAnswer) {
  const quiz = state.quiz;
  if (state.phase !== "defense" || !quiz || quiz.resolved) return;
  quiz.resolved = true;
  clearDefenseTimer();
  const blocked = selectedAnswer === quiz.correctAnswer;
  const weightChange = recordQuizResult(quiz.character, blocked, quiz.candidateCharacters);
  const buttons = [...elements.shieldOptions.querySelectorAll("button")];

  buttons.forEach((button) => {
    button.disabled = true;
    if (button.dataset.answer === quiz.correctAnswer) button.classList.add("correct");
    if (button.dataset.answer === selectedAnswer && !blocked) button.classList.add("wrong");
  });

  if (blocked) {
    const bossWordAdded = quiz.bossQuiz ? expandBossWordList(quiz.enemyIndex) : null;
    elements.challengeFeedback.textContent = bossWordAdded
      ? `正確！成功防守，魔王字庫增加到 ${state.enemies[quiz.enemyIndex].wordList.length} 字！`
      : "正確！盾牌擋下了攻擊！";
    elements.challengeFeedback.classList.add("success");
    addLog(quiz.toneQuiz
      ? `答對了！「${quiz.character}」讀作 ${quiz.pronunciation}，是 ${quiz.correctAnswer}，成功擋下攻擊。`
      : quiz.reverseQuiz
        ? `答對了！${quiz.pronunciation} 對應「${quiz.character}」，成功擋下攻擊。`
        : `答對了！「${quiz.character}」的注音是 ${quiz.correctAnswer}，成功擋下攻擊。`);
    addWeightChangeLog(quiz.character, true, weightChange);
    await wait(850);
    completeDefense(true);
  } else {
    state.phase = "correction";
    elements.challengeFeedback.textContent = quiz.toneQuiz
      ? `再看一次：「${quiz.character}」讀作 ${quiz.pronunciation}，正確答案是 ${quiz.correctAnswer}`
      : quiz.reverseQuiz
        ? `再看一次：${quiz.pronunciation} 對應的中文字是「${quiz.character}」`
        : `再看一次：「${quiz.character}」的正確注音是 ${quiz.correctAnswer}`;
    elements.challengeFeedback.classList.add("failure");
    elements.correctionConfirm.hidden = false;
    elements.correctionConfirm.focus();
    addLog(quiz.toneQuiz
      ? `答錯了，請確認「${quiz.character}」讀作 ${quiz.pronunciation}，是 ${quiz.correctAnswer}。`
      : quiz.reverseQuiz
        ? `答錯了，請確認 ${quiz.pronunciation} 對應「${quiz.character}」。`
        : `答錯了，請確認「${quiz.character}」的正確注音：${quiz.correctAnswer}。`);
    addWeightChangeLog(quiz.character, false, weightChange);
  }
}

async function completeDefense(blocked) {
  const quiz = state.quiz;
  if (!quiz || state.finished) return;
  clearDefenseTimer();
  elements.correctionConfirm.hidden = true;
  elements.spellConfirm.hidden = true;
  elements.challenge.hidden = true;

  if (!blocked && !quiz.healingQuiz) {
    state.player.hp = Math.max(0, state.player.hp - quiz.damage);
    animate(elements.heroSprite, "hit");
    addLog(`主角受到 ${quiz.damage} 點傷害。`);
    updateUI();
  }

  if (!blocked && quiz.healingQuiz) {
    state.phase = "enemy-animation";
    setMessage("治療咒語生效！", "所有存活敵人正在恢復生命", "✚");
    // 題目遮罩先關閉，再開始播放戰場上的治療效果。
    await wait(120);
    if (state.finished || state.quiz !== quiz) return;
    const healed = healLivingEnemies(quiz.healAmount);
    addLog(`${state.enemies[quiz.enemyIndex].name} 的治療咒語成功！${healed.length ? healed.join("、") : "所有敵人生命皆已全滿"}。`);
    await wait(700);
    if (state.finished || state.quiz !== quiz) return;
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
  elements.spellConfirm.hidden = true;
  updateUI();
  $("#result-eyebrow").textContent = victory ? "戰鬥結束" : "挑戰失敗";
  $("#result-title").textContent = victory ? "勝利！" : "戰敗…";
  $("#result-emblem").textContent = victory ? "✦" : "◆";
  $("#result-copy").textContent = victory ? `你擊倒了 ${state.enemies.length} 名敵人。` : "主角失去戰鬥能力，再試一次吧。";
  $("#result-rounds").textContent = state.round;
  $("#result-hp").textContent = state.player.hp.toLocaleString();
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
  elements.spellConfirm.hidden = true;
  renderEnemies();
  addLog(battleStartMessage());
  setMessage("輪到你了", "按下攻擊開始戰鬥", "⚔");
  updateUI();
  elements.attackButton.focus();
}

elements.attackButton.addEventListener("click", playerAttack);
elements.shieldOptions.addEventListener("click", (event) => {
  const shield = event.target.closest("[data-answer]");
  if (!shield) return;
  if (state.quiz?.healingQuiz) toggleHealingComponent(shield);
  else resolveDefense(shield.dataset.answer);
});
elements.spellConfirm.addEventListener("click", resolveHealingSpell);
elements.correctionConfirm.addEventListener("click", () => {
  if (state.phase === "correction") completeDefense(false);
});
$("#restart-button").addEventListener("click", restart);
$("#restart-small").addEventListener("click", restart);
elements.weightDebugToggle.addEventListener("click", () => {
  showWeightDebugInfo = !showWeightDebugInfo;
  applyWeightDebugVisibility();
});

renderEnemies();
addLog(battleStartMessage());
updateUI();
applyWeightDebugVisibility();
renderWeightDebugPanel();
loadZhuyinData();
