const STORAGE_KEY = "zhuyin-flashcard-state-v1";
const TARGET_ACCURACY = 0.9;
const HEATMAP_SENSITIVITY = 3;
const SCORE_SPIN_TICKS = 30;

const ZHUYIN_CHART_ROWS = [
  ["ㄅ", "ㄆ", "ㄇ", "ㄈ"],
  ["ㄉ", "ㄊ", "ㄋ", "ㄌ"],
  ["ㄍ", "ㄎ", "ㄏ"],
  ["ㄐ", "ㄑ", "ㄒ"],
  ["ㄓ", "ㄔ", "ㄕ", "ㄖ"],
  ["ㄗ", "ㄘ", "ㄙ"],
  ["ㄧ", "ㄨ", "ㄩ"],
  ["ㄚ", "ㄛ", "ㄜ", "ㄝ"],
  ["ㄞ", "ㄟ", "ㄠ", "ㄡ"],
  ["ㄢ", "ㄣ", "ㄤ", "ㄥ"],
  ["ㄦ"]
];

const ZHUYIN_SYMBOLS = ZHUYIN_CHART_ROWS.flat();

const elements = {
  total: document.querySelector("#summaryTotal"),
  correct: document.querySelector("#summaryCorrect"),
  wrong: document.querySelector("#summaryWrong"),
  accuracy: document.querySelector("#summaryAccuracy"),
  scoreDisplay: document.querySelector("#scoreDisplay"),
  scoreValue: document.querySelector("#scoreValue"),
  scorePracticed: document.querySelector("#scorePracticed"),
  scoreMastered: document.querySelector("#scoreMastered"),
  grid: document.querySelector("#heatmapGrid"),
  restartButton: document.querySelector("#restartButton")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function getSymbolStats(state, symbol) {
  const saved = state.symbols?.[symbol] || {};
  const correct = Number(saved.correct) || 0;
  const wrong = Number(saved.wrong) || 0;
  const attempts = correct + wrong;

  return {
    correct,
    wrong,
    attempts,
    accuracy: attempts === 0 ? null : correct / attempts
  };
}

function formatAccuracy(accuracy) {
  return accuracy === null ? "—" : `${Math.round(accuracy * 100)}%`;
}

function formatScore(score) {
  return String(score).padStart(3, "0");
}

function heatColor(accuracy) {
  if (accuracy === null) {
    return {
      background: "#f1efe8",
      border: "#ded7cb"
    };
  }

  const normalized = Math.min(Math.max(accuracy / TARGET_ACCURACY, 0), 1);
  const progress = normalized ** HEATMAP_SENSITIVITY;
  const hue = Math.round(4 + progress * 126);

  return {
    background: `hsl(${hue} 58% 86%)`,
    border: `hsl(${hue} 46% 58%)`
  };
}

function renderSummary(state) {
  const total = Number(state.totalAttempts) || 0;
  const correct = Number(state.correctTotal) || 0;
  const wrong = Number(state.wrongTotal) || 0;
  const accuracy = total === 0 ? null : correct / total;

  elements.total.textContent = total;
  elements.correct.textContent = correct;
  elements.wrong.textContent = wrong;
  elements.accuracy.textContent = formatAccuracy(accuracy);
}

function calculatePracticeScore(state) {
  const symbolResults = ZHUYIN_SYMBOLS.map((symbol) => {
    const stats = getSymbolStats(state, symbol);
    const targetProgress = stats.accuracy === null ? 0 : Math.min(stats.accuracy / TARGET_ACCURACY, 1);

    return {
      practiced: stats.attempts > 0,
      mastered: stats.accuracy !== null && stats.accuracy >= TARGET_ACCURACY,
      targetProgress
    };
  });

  const practicedCount = symbolResults.filter((result) => result.practiced).length;
  const masteredCount = symbolResults.filter((result) => result.mastered).length;
  const totalProgress = symbolResults.reduce((sum, result) => sum + result.targetProgress, 0);
  const score = Math.round((totalProgress / ZHUYIN_SYMBOLS.length) * 100);

  return {
    score,
    practicedCount,
    masteredCount,
    totalSymbols: ZHUYIN_SYMBOLS.length
  };
}

function animateScore(finalScore) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    elements.scoreValue.textContent = formatScore(finalScore);
    return;
  }

  let ticks = 0;
  elements.scoreDisplay.classList.add("is-spinning");
  elements.scoreValue.textContent = formatScore(Math.floor(Math.random() * 101));

  const timer = setInterval(() => {
    ticks += 1;
    const remainingTicks = SCORE_SPIN_TICKS - ticks;
    const isSettling = remainingTicks < 6;
    const spread = Math.max(2, remainingTicks * 3);
    const rollingScore = isSettling
      ? Math.min(Math.max(finalScore + Math.round((Math.random() - 0.5) * spread), 0), 100)
      : Math.floor(Math.random() * 101);

    elements.scoreValue.textContent = formatScore(rollingScore);

    if (ticks >= SCORE_SPIN_TICKS) {
      clearInterval(timer);
      elements.scoreValue.textContent = formatScore(finalScore);
      elements.scoreDisplay.classList.remove("is-spinning");
      elements.scoreDisplay.classList.add("is-settled");
    }
  }, 48);
}

function renderScore(state) {
  const result = calculatePracticeScore(state);

  elements.scorePracticed.textContent = `${result.practicedCount}/${result.totalSymbols}`;
  elements.scoreMastered.textContent = `${result.masteredCount}/${result.totalSymbols}`;
  animateScore(result.score);
}

function renderHeatmap(state) {
  elements.grid.replaceChildren(
    ...ZHUYIN_CHART_ROWS.map((row) => {
      const rowElement = document.createElement("div");
      rowElement.className = "heatmap-row";

      rowElement.replaceChildren(
        ...row.map((symbol) => {
          const stats = getSymbolStats(state, symbol);
          const color = heatColor(stats.accuracy);
          const cell = document.createElement("article");

          cell.className = "heatmap-cell";
          cell.style.setProperty("--heat-bg", color.background);
          cell.style.setProperty("--heat-border", color.border);
          cell.innerHTML = `
            <span class="heat-symbol">${symbol}</span>
            <span class="heat-rate">${formatAccuracy(stats.accuracy)}</span>
            <span class="heat-detail">對 ${stats.correct}</span>
            <span class="heat-detail">錯 ${stats.wrong}</span>
          `;

          return cell;
        })
      );

      return rowElement;
    })
  );
}

function returnToPractice() {
  window.location.href = "index.html";
}

const state = loadState();
renderScore(state);
renderSummary(state);
renderHeatmap(state);
elements.restartButton.addEventListener("click", returnToPractice);
