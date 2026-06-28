const stateKey = `adventure-progress:${STORY.id}`;
const inventoryKey = `adventure-inventory:${STORY.id}`;

function t(text, zhuyin) {
  return { text, zhuyin };
}

function makeRuby(token) {
  if (typeof token === "string") return escapeHtml(token);
  if (!token || !token.text) return "";
  if (!token.zhuyin) return escapeHtml(token.text);
  return `<ruby>${escapeHtml(token.text)}<rt>${escapeHtml(token.zhuyin)}</rt></ruby>`;
}

function renderTokens(tokens) {
  return tokens.map(makeRuby).join("");
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
      <button class="tool-button" id="restart">${renderTokens(STORY.labels.restart)}</button>
      <button class="tool-button" id="resume">${renderTokens(STORY.labels.resume)}</button>
    </div>
  `;

  scrollToTop();

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
