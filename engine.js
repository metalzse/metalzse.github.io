const stateKey = `adventure-progress:${STORY.id}`;
const inventoryKey = `adventure-inventory:${STORY.id}`;
const learnedCharactersKey = "adventure-learned-characters";

function t(text, zhuyin) {
  return { text, zhuyin };
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

function learnedCharacterAttributes(text, interactive) {
  const classes = ["story-text"];
  if (interactive) classes.push("learnable-text");
  if (hasLearnedCharacters(text)) classes.push("learned-text");
  return `class="${classes.join(" ")}" data-learn-text="${escapeHtml(text)}"`;
}

function makePlainText(text, options = {}) {
  const interactive = options.interactive !== false;
  return Array.from(String(text)).map(char => {
    if (!isChineseText(char)) return escapeHtml(char);
    return `<span ${learnedCharacterAttributes(char, interactive)}>${escapeHtml(char)}</span>`;
  }).join("");
}

function makeRuby(token, options = {}) {
  if (typeof token === "string") return makePlainText(token, options);
  if (!token || !token.text) return "";
  const interactive = options.interactive !== false;
  const attributes = learnedCharacterAttributes(token.text, interactive);
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
    return `<p class="small">${renderTokens(STORY.labels.emptyBag || [])}</p>`;
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
    element.classList.toggle("learned-text", hasLearnedCharacters(element.dataset.learnText));
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

function renderRoom(roomId) {
  const app = document.getElementById("app");
  const room = STORY.rooms[roomId] || STORY.rooms[STORY.startRoom];

  localStorage.setItem(stateKey, room.id);

  if (room.givesItem && !hasItem(room.givesItem)) {
    addItem(room.givesItem);
  }

  const itemNote = room.givesItem && STORY.items ? `
    <p class="item-note">🎒 ${renderTokens(STORY.labels.gotItem)} ${renderTokens(STORY.items[room.givesItem].name)}</p>
  ` : "";

  const doors = (room.doors || []).map(door => {
    if (doorIsLocked(door)) {
      return `
        <div class="door locked">
          <strong>${renderTokens(door.name)}</strong><br>
          <span class="small">${renderTokens(door.lockedDescription || STORY.labels.locked)}</span>
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
      <h2>${renderTokens(STORY.labels.goal || [t("冒","ㄇㄠˋ"), t("險","ㄒㄧㄢˇ"), t("目","ㄇㄨˋ"), t("標","ㄅㄧㄠ")])}</h2>
      <p>${renderTokens(STORY.goal)}</p>
    </section>
  ` : "";
  const bagLabel = STORY.labels.myBag || [t("我","ㄨㄛˇ"), t("的","ㄉㄜ˙"), t("背","ㄅㄟ"), t("包","ㄅㄠ")];
  const bag = STORY.labels.bag ? `<h2>🎒 ${renderTokens(bagLabel)}</h2>${renderInventory()}` : "";
  const exportLearnedLabel = STORY.labels.exportLearnedCharacters || [
    t("輸","ㄕㄨ"),
    t("出","ㄔㄨ"),
    t("已","ㄧˇ"),
    t("學","ㄒㄩㄝˊ"),
    t("會","ㄏㄨㄟˋ"),
    t("字","ㄗˋ")
  ];

  app.innerHTML = `
    <h1>${renderTokens(room.title)}</h1>
    ${goalBox}
    <section class="content-box description-box">
      <h2>${renderTokens(room.title)}：</h2>
      ${room.description.map(p => `<p>${renderTokens(p)}</p>`).join("")}
    </section>
    ${itemNote}
    ${ending}
    ${bag ? `<section class="content-box bag-box">${bag}</section>` : ""}
    ${doors ? `<h2>${renderTokens(STORY.labels.doors)}</h2>${doors}` : ""}
    ${back}
    <div class="toolbar">
      <button class="tool-button" id="restart">${renderTokens(STORY.labels.restart, { interactive: false })}</button>
      <button class="tool-button" id="resume">${renderTokens(STORY.labels.resume, { interactive: false })}</button>
      <button class="tool-button" id="export-learned">${renderTokens(exportLearnedLabel, { interactive: false })}</button>
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

  document.getElementById("restart").addEventListener("click", () => {
    localStorage.removeItem(stateKey);
    localStorage.removeItem(inventoryKey);
    renderRoom(STORY.startRoom);
    history.replaceState(null, "", `#${STORY.startRoom}`);
  });

  document.getElementById("resume").addEventListener("click", () => {
    const saved = localStorage.getItem(stateKey);
    renderRoom(saved && STORY.rooms[saved] ? saved : STORY.startRoom);
  });

  document.getElementById("export-learned").addEventListener("click", exportLearnedCharacters);
}

function initialRoom() {
  const hash = decodeURIComponent(location.hash.replace("#", ""));
  if (hash && STORY.rooms[hash]) return hash;
  const saved = localStorage.getItem(stateKey);
  if (saved && STORY.rooms[saved]) return saved;
  return STORY.startRoom;
}

window.addEventListener("hashchange", () => {
  const id = decodeURIComponent(location.hash.replace("#", ""));
  if (id && STORY.rooms[id]) renderRoom(id);
});

renderRoom(initialRoom());
