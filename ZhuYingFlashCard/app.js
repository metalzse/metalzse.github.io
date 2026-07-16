const STORAGE_KEY = "zhuyin-flashcard-state-v1";
const INFO_SEEN_KEY = "zhuyin-flashcard-info-version";
const INFO_VERSION = "2026-07-16-1";
const MAX_VALID_RESPONSE_SECONDS = 20;
const MAX_TIME_SAMPLES_PER_SYMBOL = 18;
const UNANSWERED_SYMBOL_WEIGHT = 1.75;
const WRONG_WEIGHT_BASE = 2.15;
const CORRECT_WEIGHT_BASE = 0.72;
const MIN_SYMBOL_WEIGHT = 0.16;
const MAX_SYMBOL_WEIGHT = 30;

const ZHUYIN_SYMBOLS = [
  { symbol: "ㄅ", group: "聲母" },
  { symbol: "ㄆ", group: "聲母" },
  { symbol: "ㄇ", group: "聲母" },
  { symbol: "ㄈ", group: "聲母" },
  { symbol: "ㄉ", group: "聲母" },
  { symbol: "ㄊ", group: "聲母" },
  { symbol: "ㄋ", group: "聲母" },
  { symbol: "ㄌ", group: "聲母" },
  { symbol: "ㄍ", group: "聲母" },
  { symbol: "ㄎ", group: "聲母" },
  { symbol: "ㄏ", group: "聲母" },
  { symbol: "ㄐ", group: "聲母" },
  { symbol: "ㄑ", group: "聲母" },
  { symbol: "ㄒ", group: "聲母" },
  { symbol: "ㄓ", group: "聲母" },
  { symbol: "ㄔ", group: "聲母" },
  { symbol: "ㄕ", group: "聲母" },
  { symbol: "ㄖ", group: "聲母" },
  { symbol: "ㄗ", group: "聲母" },
  { symbol: "ㄘ", group: "聲母" },
  { symbol: "ㄙ", group: "聲母" },
  { symbol: "ㄧ", group: "介音" },
  { symbol: "ㄨ", group: "介音" },
  { symbol: "ㄩ", group: "介音" },
  { symbol: "ㄚ", group: "韻母" },
  { symbol: "ㄛ", group: "韻母" },
  { symbol: "ㄜ", group: "韻母" },
  { symbol: "ㄝ", group: "韻母" },
  { symbol: "ㄞ", group: "韻母" },
  { symbol: "ㄟ", group: "韻母" },
  { symbol: "ㄠ", group: "韻母" },
  { symbol: "ㄡ", group: "韻母" },
  { symbol: "ㄢ", group: "韻母" },
  { symbol: "ㄣ", group: "韻母" },
  { symbol: "ㄤ", group: "韻母" },
  { symbol: "ㄥ", group: "韻母" },
  { symbol: "ㄦ", group: "韻母" }
];

const elements = {
  totalAttempts: document.querySelector("#totalAttempts"),
  correctTotal: document.querySelector("#correctTotal"),
  wrongTotal: document.querySelector("#wrongTotal"),
  validTimeCount: document.querySelector("#validTimeCount"),
  currentSymbol: document.querySelector("#currentSymbol"),
  symbolGroup: document.querySelector("#symbolGroup"),
  symbolWeight: document.querySelector("#symbolWeight"),
  symbolList: document.querySelector("#symbolList"),
  correctButton: document.querySelector("#correctButton"),
  wrongButton: document.querySelector("#wrongButton"),
  infoButton: document.querySelector("#infoButton"),
  resetButton: document.querySelector("#resetButton"),
  idleNote: document.querySelector("#idleNote")
};

let state = loadState();
let currentCard = null;
let shownAt = performance.now();

function createEmptyState() {
  return {
    totalAttempts: 0,
    correctTotal: 0,
    wrongTotal: 0,
    symbols: Object.fromEntries(
      ZHUYIN_SYMBOLS.map(({ symbol }) => [
        symbol,
        {
          correct: 0,
          wrong: 0,
          seen: 0,
          validCorrectTimes: []
        }
      ])
    )
  };
}

function loadState() {
  const freshState = createEmptyState();

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") {
      return freshState;
    }

    const merged = {
      ...freshState,
      totalAttempts: Number(saved.totalAttempts) || 0,
      correctTotal: Number(saved.correctTotal) || 0,
      wrongTotal: Number(saved.wrongTotal) || 0
    };

    ZHUYIN_SYMBOLS.forEach(({ symbol }) => {
      const savedSymbol = saved.symbols?.[symbol] || {};
      const correct = Number(savedSymbol.correct) || 0;
      const wrong = Number(savedSymbol.wrong) || 0;

      merged.symbols[symbol] = {
        correct,
        wrong,
        seen: Number(savedSymbol.seen) || correct + wrong,
        validCorrectTimes: Array.isArray(savedSymbol.validCorrectTimes)
          ? savedSymbol.validCorrectTimes
              .map(Number)
              .filter((seconds) => Number.isFinite(seconds) && seconds <= MAX_VALID_RESPONSE_SECONDS)
              .slice(-MAX_TIME_SAMPLES_PER_SYMBOL)
          : []
      };
    });

    return merged;
  } catch {
    return freshState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function allValidTimes() {
  return ZHUYIN_SYMBOLS.flatMap(({ symbol }) => state.symbols[symbol].validCorrectTimes);
}

function calculateWeight(symbol) {
  const stats = state.symbols[symbol];
  if (stats.seen === 0) {
    return UNANSWERED_SYMBOL_WEIGHT;
  }

  const mistakeDebt = Math.max(0, stats.wrong - stats.correct);
  const masteryCredit = Math.max(0, stats.correct - stats.wrong);
  const answerMultiplier =
    mistakeDebt > 0
      ? WRONG_WEIGHT_BASE ** mistakeDebt
      : CORRECT_WEIGHT_BASE ** Math.max(1, masteryCredit);

  return clamp(answerMultiplier, MIN_SYMBOL_WEIGHT, MAX_SYMBOL_WEIGHT);
}

function weightedPick() {
  const weightedSymbols = ZHUYIN_SYMBOLS.map((item) => ({
    ...item,
    weight: calculateWeight(item.symbol)
  }));

  let pool = weightedSymbols;
  if (currentCard && weightedSymbols.length > 1) {
    pool = weightedSymbols.filter((item) => item.symbol !== currentCard.symbol);
  }

  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let threshold = Math.random() * totalWeight;

  for (const item of pool) {
    threshold -= item.weight;
    if (threshold <= 0) {
      return item;
    }
  }

  return pool[pool.length - 1];
}

function showNextCard() {
  currentCard = weightedPick();
  shownAt = performance.now();

  elements.currentSymbol.textContent = currentCard.symbol;
  elements.symbolGroup.textContent = currentCard.group;
  elements.symbolWeight.textContent = `權重 ${currentCard.weight.toFixed(2)}x`;
}

function answer(isCorrect) {
  if (!currentCard) {
    return;
  }

  const stats = state.symbols[currentCard.symbol];
  const elapsedSeconds = (performance.now() - shownAt) / 1000;

  stats.seen += 1;
  state.totalAttempts += 1;

  if (isCorrect) {
    stats.correct += 1;
    state.correctTotal += 1;

    if (elapsedSeconds <= MAX_VALID_RESPONSE_SECONDS) {
      stats.validCorrectTimes.push(Number(elapsedSeconds.toFixed(2)));
      stats.validCorrectTimes = stats.validCorrectTimes.slice(-MAX_TIME_SAMPLES_PER_SYMBOL);
    }
  } else {
    stats.wrong += 1;
    state.wrongTotal += 1;
  }

  saveState();
  render();
  showNextCard();
}

function renderSummary() {
  elements.totalAttempts.textContent = state.totalAttempts;
  elements.correctTotal.textContent = state.correctTotal;
  elements.wrongTotal.textContent = state.wrongTotal;
  elements.validTimeCount.textContent = allValidTimes().length;
  elements.idleNote.textContent = `超時剔除 ${MAX_VALID_RESPONSE_SECONDS}s`;
}

function renderSymbolList() {
  const rows = ZHUYIN_SYMBOLS.map((item) => ({
    ...item,
    stats: state.symbols[item.symbol],
    weight: calculateWeight(item.symbol)
  })).sort((a, b) => {
    if (b.weight === a.weight) {
      return b.stats.wrong - a.stats.wrong;
    }

    return b.weight - a.weight;
  });

  const maxWeight = Math.max(...rows.map((row) => row.weight));

  elements.symbolList.replaceChildren(
    ...rows.map((row) => {
      const averageTime = average(row.stats.validCorrectTimes);
      const mistakeDebt = Math.max(0, row.stats.wrong - row.stats.correct);
      const rowElement = document.createElement("article");
      const width = `${Math.max(6, (row.weight / maxWeight) * 100).toFixed(1)}%`;

      rowElement.className = "symbol-row";
      rowElement.innerHTML = `
        <span class="symbol-badge">${row.symbol}</span>
        <span class="symbol-info">
          <span class="symbol-stats">
            <span class="weight">${row.weight.toFixed(2)}x</span>
            <span class="symbol-details">對 ${row.stats.correct} / 錯 ${row.stats.wrong}</span>
          </span>
          <span class="meter" aria-hidden="true">
            <span class="meter-fill" style="--meter-width: ${width}"></span>
          </span>
          <span class="symbol-details">欠熟 ${mistakeDebt} · 平均 ${averageTime === null ? "—" : `${averageTime.toFixed(1)}s`}</span>
        </span>
      `;

      return rowElement;
    })
  );
}

function render() {
  renderSummary();
  renderSymbolList();
}

function shouldShowInstructions() {
  return localStorage.getItem(INFO_SEEN_KEY) !== INFO_VERSION;
}

function markInstructionsSeen() {
  localStorage.setItem(INFO_SEEN_KEY, INFO_VERSION);
}

function isInstructionsOpen() {
  return Boolean(document.querySelector(".practice-info-overlay"));
}

function showInstructions() {
  if (isInstructionsOpen()) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "practice-info-overlay";
  overlay.setAttribute("role", "presentation");
  overlay.innerHTML = `
    <section class="practice-info-dialog" role="dialog" aria-modal="true" aria-labelledby="practice-info-title">
      <h2 id="practice-info-title">如何使用</h2>
      <div class="practice-info-body">
        <section class="practice-info-section">
          <h3>練習方式</h3>
          <p>此功能會隨機展示注音符號，使用者看到符號後，說出這個注音的發音。</p>
          <p>由旁邊的人評斷發音是否正確，再點擊「對」或「錯」。</p>
        </section>
        <section class="practice-info-section">
          <h3>結算</h3>
          <p>練習一段時間後，按「結算」看看答對多少、答錯多少和總結分數。</p>
        </section>
      </div>
      <div class="practice-info-actions">
        <button class="settle-button primary" id="practice-info-close" type="button">開始練習</button>
      </div>
    </section>
  `;

  document.body.appendChild(overlay);

  const closeButton = overlay.querySelector("#practice-info-close");

  function closeInstructions() {
    markInstructionsSeen();
    overlay.remove();
    document.removeEventListener("keydown", closeOnEscape);
    shownAt = performance.now();
  }

  function closeOnEscape(event) {
    if (event.key === "Escape" && document.body.contains(overlay)) {
      closeInstructions();
    }
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeInstructions();
    }
  });

  closeButton.addEventListener("click", closeInstructions);
  document.addEventListener("keydown", closeOnEscape);
  closeButton.focus();
}

function resetState() {
  state = createEmptyState();
  saveState();
  render();
  showNextCard();
}

elements.correctButton.addEventListener("click", () => answer(true));
elements.wrongButton.addEventListener("click", () => answer(false));
elements.infoButton.addEventListener("click", showInstructions);
elements.resetButton.addEventListener("click", resetState);

document.addEventListener("keydown", (event) => {
  if (isInstructionsOpen()) {
    return;
  }

  if (event.key === "ArrowRight" || event.key === "Enter") {
    answer(true);
  }

  if (event.key === "ArrowLeft" || event.key === "Backspace") {
    answer(false);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    shownAt = performance.now();
  }
});

render();
showNextCard();
if (shouldShowInstructions()) {
  showInstructions();
}
