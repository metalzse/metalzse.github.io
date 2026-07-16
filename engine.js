const stateKey = `adventure-progress:${STORY.id}`;
const inventoryKey = `adventure-inventory:${STORY.id}`;
const learnedCharactersKey = "adventure-learned-characters";
const readingDifficultyKey = "adventure-reading-difficulty";
const gameInfoSeenKey = "adventure-game-info-version";
const readingDifficulties = ["easy", "practice", "challenge"];

const defaultLabels = {
  goal: [t("冒","ㄇㄠˋ"), t("險","ㄒㄧㄢˇ"), t("目","ㄇㄨˋ"), t("標","ㄅㄧㄠ"), "："],
  description: [t("地","ㄉㄧˋ"), t("點","ㄉㄧㄢˇ"), t("描","ㄇㄧㄠˊ"), t("述","ㄕㄨˋ")],
  doors: [t("可","ㄎㄜˇ"), t("以","ㄧˇ"), t("走","ㄗㄡˇ"), t("的","ㄉㄜ˙"), t("門","ㄇㄣˊ")],
  restart: [t("重","ㄔㄨㄥˊ"), t("新","ㄒㄧㄣ"), t("開","ㄎㄞ"), t("始","ㄕˇ")],
  myBag: [t("我","ㄨㄛˇ"), t("的","ㄉㄜ˙"), t("背","ㄅㄟ"), t("包","ㄅㄠ"), "："],
  emptyBag: [t("背","ㄅㄟ"), t("包","ㄅㄠ"), t("還","ㄏㄞˊ"), t("是","ㄕˋ"), t("空","ㄎㄨㄥ"), t("的","ㄉㄜ˙"), "。"],
  gotItem: [t("你","ㄋㄧˇ"), t("得","ㄉㄜˊ"), t("到","ㄉㄠˋ"), t("了","ㄌㄜ˙")],
  locked: [t("這","ㄓㄜˋ"), t("扇","ㄕㄢˋ"), t("門","ㄇㄣˊ"), t("還","ㄏㄞˊ"), t("不","ㄅㄨˋ"), t("能","ㄋㄥˊ"), t("開","ㄎㄞ"), "。"],
  exportLearnedCharacters: [
    t("輸","ㄕㄨ"),
    t("出","ㄔㄨ"),
    t("學","ㄒㄩㄝˊ"),
    t("會","ㄏㄨㄟˋ"),
    t("的","ㄉㄜ˙"),
    t("字","ㄗˋ")
  ]
};

const homeLabels = {
  subtitle: [
    t("請","ㄑㄧㄥˇ"),
    t("選","ㄒㄩㄢˇ"),
    t("擇","ㄗㄜˊ"),
    t("要","ㄧㄠˋ"),
    t("使","ㄕˇ"),
    t("用","ㄩㄥˋ"),
    t("的","ㄉㄜ˙"),
    t("功","ㄍㄨㄥ"),
    t("能","ㄋㄥˊ"),
    "。"
  ],
  storyTitle: [
    t("注","ㄓㄨˋ"),
    t("音","ㄧㄣ"),
    t("冒","ㄇㄠˋ"),
    t("險","ㄒㄧㄢˇ"),
    t("故","ㄍㄨˋ"),
    t("事","ㄕˋ")
  ],
  storyDescription: [
    t("讀","ㄉㄨˊ"),
    t("故","ㄍㄨˋ"),
    t("事","ㄕˋ"),
    "，",
    t("找","ㄓㄠˇ"),
    t("門","ㄇㄣˊ"),
    "，",
    t("完","ㄨㄢˊ"),
    t("成","ㄔㄥˊ"),
    t("任","ㄖㄣˋ"),
    t("務","ㄨˋ"),
    "。"
  ],
  flashcardTitle: [
    t("注","ㄓㄨˋ"),
    t("音","ㄧㄣ"),
    t("練","ㄌㄧㄢˋ"),
    t("習","ㄒㄧˊ"),
    t("卡","ㄎㄚˇ")
  ],
  flashcardDescription: [
    t("隨","ㄙㄨㄟˊ"),
    t("機","ㄐㄧ"),
    t("練","ㄌㄧㄢˋ"),
    t("習","ㄒㄧˊ"),
    "37",
    t("個","ㄍㄜˋ"),
    t("注","ㄓㄨˋ"),
    t("音","ㄧㄣ"),
    "，",
    t("記","ㄐㄧˋ"),
    t("錄","ㄌㄨˋ"),
    t("答","ㄉㄚˊ"),
    t("對","ㄉㄨㄟˋ"),
    t("答","ㄉㄚˊ"),
    t("錯","ㄘㄨㄛˋ"),
    "，",
    t("看","ㄎㄢˋ"),
    t("結","ㄐㄧㄝˊ"),
    t("算","ㄙㄨㄢˋ"),
    t("分","ㄈㄣ"),
    t("數","ㄕㄨˋ"),
    "。"
  ],
  menuButton: [
    t("回","ㄏㄨㄟˊ"),
    t("到","ㄉㄠˋ"),
    t("遊","ㄧㄡˊ"),
    t("戲","ㄒㄧˋ"),
    t("選","ㄒㄩㄢˇ"),
    t("單","ㄉㄢ")
  ]
};

function t(text, zhuyin) {
  return { text, zhuyin };
}

function label(key) {
  return STORY.labels?.[key] || defaultLabels[key] || [];
}

function isChineseText(text) {
  return /[\u3400-\u9fff\uf900-\ufaff]/u.test(text);
}

function charactersInText(text) {
  return [...new Set(Array.from(String(text)).filter(isChineseText))];
}

function getLearnedCharacters() {
  try {
    return JSON.parse(localStorage.getItem(learnedCharactersKey) || "[]");
  } catch {
    return [];
  }
}

function setLearnedCharacters(characters) {
  localStorage.setItem(learnedCharactersKey, JSON.stringify([...new Set(characters)]));
}

function hasLearnedCharacters(text) {
  const characters = charactersInText(text);
  if (!characters.length) return false;
  const learnedCharacters = getLearnedCharacters();
  return characters.every(character => learnedCharacters.includes(character));
}

function getReadingDifficulty() {
  const saved = localStorage.getItem(readingDifficultyKey);
  return readingDifficulties.includes(saved) ? saved : "easy";
}

function setReadingDifficulty(difficulty) {
  if (!readingDifficulties.includes(difficulty)) return;
  localStorage.setItem(readingDifficultyKey, difficulty);
}

function shouldShowZhuyin(text, options = {}) {
  if (options.showZhuyin === true) return true;
  if (options.showZhuyin === false) return false;
  const difficulty = getReadingDifficulty();
  if (difficulty === "easy") return true;
  if (difficulty === "challenge") return false;
  return !hasLearnedCharacters(text);
}

function toggleLearnedCharacters(text) {
  const characters = charactersInText(text);
  if (!characters.length) return false;

  const learnedCharacters = getLearnedCharacters();
  const learned = characters.every(character => learnedCharacters.includes(character));

  if (learned) {
    setLearnedCharacters(learnedCharacters.filter(character => !characters.includes(character)));
    return false;
  }

  setLearnedCharacters([...learnedCharacters, ...characters]);
  return true;
}

function learnedCharactersOutput() {
  const characters = getLearnedCharacters();
  if (!characters.length) return "";
  return [
    "已學會的字",
    `共 ${characters.length} 字`,
    "",
    characters.join("\n"),
    ""
  ].join("\n");
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportLearnedCharacters() {
  const output = learnedCharactersOutput();
  if (!output) {
    window.alert("目前沒有已學會的字。");
    return;
  }
  downloadText("learned-characters.txt", output);
}

function learnedCharacterAttributes(text, interactive, options = {}) {
  const classes = ["story-text"];
  if (interactive) classes.push("learnable-text");
  if (hasLearnedCharacters(text)) classes.push("learned-text");
  if (options.hasZhuyin && !shouldShowZhuyin(text, options)) classes.push("zhuyin-hidden");
  return `class="${classes.join(" ")}" data-learn-text="${escapeHtml(text)}"`;
}

function makePlainText(text, options = {}) {
  const interactive = options.interactive !== false;
  return Array.from(String(text)).map(char => {
    if (!isChineseText(char)) return escapeHtml(char);
    return `<span ${learnedCharacterAttributes(char, interactive, options)}>${escapeHtml(char)}</span>`;
  }).join("");
}

function makeRuby(token, options = {}) {
  if (typeof token === "string") return makePlainText(token, options);
  if (!token || !token.text) return "";
  const interactive = options.interactive !== false;
  const attributes = learnedCharacterAttributes(token.text, interactive, { ...options, hasZhuyin: Boolean(token.zhuyin) });
  if (!token.zhuyin) return `<span ${attributes}>${escapeHtml(token.text)}</span>`;
  return `<ruby ${attributes}>${escapeHtml(token.text)}<rt>${escapeHtml(token.zhuyin)}</rt></ruby>`;
}

function renderTokens(tokens, options = {}) {
  return (tokens || []).map(token => makeRuby(token, options)).join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInventory() {
  try {
    return JSON.parse(localStorage.getItem(inventoryKey) || "[]");
  } catch {
    return [];
  }
}

function setInventory(items) {
  localStorage.setItem(inventoryKey, JSON.stringify([...new Set(items)]));
}

function hasItem(itemId) {
  return getInventory().includes(itemId);
}

function addItem(itemId) {
  const items = getInventory();
  if (!items.includes(itemId)) items.push(itemId);
  setInventory(items);
}

function renderInventory() {
  if (!STORY.items) return "";
  const items = getInventory();
  if (!items.length) {
    return `<p class="small">${renderTokens(label("emptyBag"))}</p>`;
  }
  return `<p class="small">${items.map(id => renderTokens(STORY.items[id]?.name || [id])).join("　")}</p>`;
}

function doorIsLocked(door) {
  return door.requires && !hasItem(door.requires);
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function syncLearnedCharacters(app) {
  app.querySelectorAll("[data-learn-text]").forEach(element => {
    const text = element.dataset.learnText;
    element.classList.toggle("learned-text", hasLearnedCharacters(text));
    element.classList.toggle("zhuyin-hidden", Boolean(element.querySelector("rt")) && !shouldShowZhuyin(text));
  });
}

function bindLearningClicks(app) {
  app.querySelectorAll(".learnable-text").forEach(element => {
    element.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const text = element.dataset.learnText;
      if (!text) return;
      toggleLearnedCharacters(text);
      syncLearnedCharacters(app);
    });
  });
}

function difficultyLabel(difficulty) {
  const labels = {
    easy: [t("簡","ㄐㄧㄢˇ"), t("單","ㄉㄢ")],
    practice: [t("練","ㄌㄧㄢˋ"), t("習","ㄒㄧˊ")],
    challenge: [t("挑","ㄊㄧㄠˇ"), t("戰","ㄓㄢˋ")]
  };
  return labels[difficulty] || labels.easy;
}

function renderDifficultyControls(options = {}) {
  const current = getReadingDifficulty();
  const renderOptions = { interactive: false, ...options };
  return `
    <div class="difficulty-control" role="group" aria-label="閱讀難度">
      <span class="difficulty-label">${renderTokens([t("難","ㄋㄢˊ"), t("度","ㄉㄨˋ"), "："], renderOptions)}</span>
      ${readingDifficulties.map(difficulty => `
        <button
          class="tool-button difficulty-button${difficulty === current ? " active" : ""}"
          type="button"
          data-difficulty="${difficulty}"
          aria-pressed="${difficulty === current ? "true" : "false"}"
        >
          ${renderTokens(difficultyLabel(difficulty), renderOptions)}
        </button>
      `).join("")}
    </div>
  `;
}

function updateDifficultyControls(root) {
  root.querySelectorAll("[data-difficulty]").forEach(button => {
    const active = button.dataset.difficulty === getReadingDifficulty();
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function bindDifficultyControls(root, onChange) {
  root.querySelectorAll("[data-difficulty]").forEach(button => {
    button.addEventListener("click", () => {
      setReadingDifficulty(button.dataset.difficulty);
      updateDifficultyControls(document);
      if (onChange) onChange(button.dataset.difficulty);
    });
  });
}

function gameInfoVersion() {
  return typeof GAME_INFO === "object" && GAME_INFO ? GAME_INFO.version || "default" : "";
}

function shouldShowGameInfo() {
  const version = gameInfoVersion();
  return Boolean(version) && localStorage.getItem(gameInfoSeenKey) !== version;
}

function markGameInfoSeen() {
  const version = gameInfoVersion();
  if (version) localStorage.setItem(gameInfoSeenKey, version);
}

function renderGameInfoSection(section) {
  return `
    <section class="game-info-section">
      <h3>${renderTokens(section.heading || [], { interactive: false, showZhuyin: true })}</h3>
      ${(section.body || []).map(paragraph => `
        <p>${renderTokens(paragraph, { interactive: false, showZhuyin: true })}</p>
      `).join("")}
    </section>
  `;
}

function showGameInfoDialog() {
  if (typeof GAME_INFO !== "object" || !GAME_INFO) return;

  const overlay = document.createElement("div");
  overlay.className = "game-info-overlay";
  overlay.setAttribute("role", "presentation");
  overlay.innerHTML = `
    <section class="game-info-dialog" role="dialog" aria-modal="true" aria-labelledby="game-info-title">
      <h2 id="game-info-title">${renderTokens(GAME_INFO.title || [], { interactive: false, showZhuyin: true })}</h2>
      <div class="game-info-body">
        ${(GAME_INFO.sections || []).map(renderGameInfoSection).join("")}
      </div>
      ${renderDifficultyControls({ showZhuyin: true })}
      <div class="game-info-actions">
        <button class="tool-button primary-button" id="game-info-close" type="button">
          ${renderTokens(GAME_INFO.closeLabel || [t("開","ㄎㄞ"), t("始","ㄕˇ")], { interactive: false, showZhuyin: true })}
        </button>
      </div>
    </section>
  `;

  document.body.appendChild(overlay);
  const dialog = overlay.querySelector(".game-info-dialog");
  const closeButton = overlay.querySelector("#game-info-close");

  bindDifficultyControls(overlay, () => {
    const currentRoom = localStorage.getItem(stateKey);
    renderRoom(currentRoom && STORY.rooms[currentRoom] ? currentRoom : STORY.startRoom);
    updateDifficultyControls(document);
  });

  function closeGameInfoDialog() {
    markGameInfoSeen();
    overlay.remove();
    document.removeEventListener("keydown", closeOnEscape);
  }

  function closeOnEscape(event) {
    if (event.key !== "Escape" || !document.body.contains(overlay)) return;
    closeGameInfoDialog();
  }

  closeButton.addEventListener("click", closeGameInfoDialog);

  overlay.addEventListener("click", event => {
    if (event.target !== overlay) return;
    closeGameInfoDialog();
  });

  document.addEventListener("keydown", closeOnEscape);

  closeButton.focus();
  dialog.scrollTop = 0;
}

function renderHome() {
  const app = document.getElementById("app");
  const renderOptions = { interactive: false, showZhuyin: true };

  app.innerHTML = `
    <section class="home-screen" aria-label="功能選單">
      <p class="home-subtitle">${renderTokens(homeLabels.subtitle, renderOptions)}</p>
      <div class="game-menu">
        <a class="game-entry" href="#${escapeHtml(STORY.startRoom)}" id="enter-story">
          <span class="game-entry-icon" aria-hidden="true">📖</span>
          <span class="game-entry-copy">
            <strong>${renderTokens(homeLabels.storyTitle, renderOptions)}</strong>
            <span class="small">${renderTokens(homeLabels.storyDescription, renderOptions)}</span>
          </span>
        </a>
        <a class="game-entry" href="ZhuYingFlashCard/index.html">
          <span class="game-entry-icon" aria-hidden="true">ㄅ</span>
          <span class="game-entry-copy">
            <strong>${renderTokens(homeLabels.flashcardTitle, renderOptions)}</strong>
            <span class="small">${renderTokens(homeLabels.flashcardDescription, renderOptions)}</span>
          </span>
        </a>
      </div>
    </section>
  `;

  scrollToTop();

  document.getElementById("enter-story").addEventListener("click", event => {
    event.preventDefault();
    const roomId = enterStory();
    history.replaceState(null, "", `#${roomId}`);
  });
}

function enterStory(roomId) {
  const targetRoom = roomId || initialRoom();
  renderRoom(targetRoom);
  if (shouldShowGameInfo()) showGameInfoDialog();
  return targetRoom;
}

function renderRoom(roomId) {
  const app = document.getElementById("app");
  const room = STORY.rooms[roomId] || STORY.rooms[STORY.startRoom];

  localStorage.setItem(stateKey, room.id);

  if (room.givesItem && !hasItem(room.givesItem)) {
    addItem(room.givesItem);
  }

  const itemNote = room.givesItem && STORY.items ? `
    <p class="item-note">🎒 ${renderTokens(label("gotItem"))} ${renderTokens(STORY.items[room.givesItem].name)}</p>
  ` : "";

  const doors = (room.doors || []).map(door => {
    if (doorIsLocked(door)) {
      return `
        <div class="door locked">
          <strong>${renderTokens(door.name)}</strong><br>
          <span class="small">${renderTokens(door.lockedDescription || label("locked"))}</span>
        </div>
      `;
    }
    return `
      <a class="door" href="#${escapeHtml(door.to)}" data-room="${escapeHtml(door.to)}">
        <strong>${renderTokens(door.name)}</strong><br>
        <span class="small">${renderTokens(door.description)}</span>
      </a>
    `;
  }).join("");

  const back = room.back ? `
    <a class="door back" href="#${escapeHtml(room.back.to)}" data-room="${escapeHtml(room.back.to)}">
      ⬅ ${renderTokens(room.back.label)}
    </a>
  ` : "";

  const ending = room.ending ? `<p class="ending">${renderTokens(room.ending)}</p>` : "";
  const goalBox = room.id === STORY.startRoom && STORY.goal ? `
    <section class="content-box goal-box">
      <h2>${renderTokens(label("goal"))}</h2>
      <p>${renderTokens(STORY.goal)}</p>
    </section>
  ` : "";
  const bag = STORY.items ? `<h2>🎒 ${renderTokens(label("myBag"))}</h2>${renderInventory()}` : "";

  app.innerHTML = `
    <header class="page-header">
      ${renderDifficultyControls()}
    </header>
    <h1>${renderTokens(room.title)}</h1>
    ${goalBox}
    <section class="content-box description-box">
      <h2>${renderTokens(room.title)}：</h2>
      ${room.description.map(p => `<p>${renderTokens(p)}</p>`).join("")}
    </section>
    ${itemNote}
    ${ending}
    ${bag ? `<section class="content-box bag-box">${bag}</section>` : ""}
    ${doors ? `<h2>${renderTokens(label("doors"))}</h2>${doors}` : ""}
    ${back}
    <div class="toolbar">
      <button class="tool-button" id="game-menu">${renderTokens(homeLabels.menuButton, { interactive: false })}</button>
      <button class="tool-button" id="restart">${renderTokens(label("restart"), { interactive: false })}</button>
      <button class="tool-button" id="export-learned">${renderTokens(label("exportLearnedCharacters"), { interactive: false })}</button>
    </div>
  `;

  scrollToTop();
  bindLearningClicks(app);

  app.querySelectorAll("[data-room]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      renderRoom(link.dataset.room);
      history.replaceState(null, "", `#${link.dataset.room}`);
    });
  });

  document.getElementById("game-menu").addEventListener("click", () => {
    renderHome();
    history.replaceState(null, "", location.pathname + location.search);
  });

  document.getElementById("restart").addEventListener("click", () => {
    localStorage.removeItem(stateKey);
    localStorage.removeItem(inventoryKey);
    renderRoom(STORY.startRoom);
    history.replaceState(null, "", `#${STORY.startRoom}`);
  });

  document.getElementById("export-learned").addEventListener("click", exportLearnedCharacters);

  bindDifficultyControls(app, () => renderRoom(room.id));
}

function initialRoom() {
  const hash = decodeURIComponent(location.hash.replace("#", ""));
  if (hash && STORY.rooms[hash]) return hash;
  const saved = localStorage.getItem(stateKey);
  if (saved && STORY.rooms[saved]) return saved;
  return STORY.startRoom;
}

function currentHashId() {
  return decodeURIComponent(location.hash.replace("#", ""));
}

function renderCurrentRoute() {
  const id = currentHashId();
  if (id && STORY.rooms[id]) {
    enterStory(id);
    return;
  }
  renderHome();
}

window.addEventListener("hashchange", () => {
  renderCurrentRoute();
});

renderCurrentRoute();
