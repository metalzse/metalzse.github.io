const sharedLearnedCharactersKey = "adventure-learned-characters";
const learnedCharactersVersionKey = "adventure-learned-characters-version";
const learnedCharactersVersion = "2";
const rpgWeightStateKey = "turn-based-rpg-zhuyin-weights-v1";
const storyFiles = ["story.js", "story_airport.js", "story_dino.js", "story_wizard.js"];
const flashcardStateKey = "zhuyin-flashcard-state-v1";
const adventureRecordPrefixes = [
  "adventure-progress:",
  "adventure-inventory:"
];

function isChineseText(text) {
  return /[\u3400-\u9fff\uf900-\ufaff]/u.test(text);
}

function charactersInText(text) {
  return [...new Set(Array.from(String(text)).filter(isChineseText))];
}

function normalizeLearnedCharacters(value) {
  if (!Array.isArray(value)) return [];
  const entries = new Map();

  value.forEach(item => {
    if (typeof item === "string") {
      charactersInText(item).forEach(character => {
        if (!entries.has(character)) entries.set(character, { character, zhuyin: "" });
      });
      return;
    }

    if (!item || typeof item !== "object") return;
    const character = charactersInText(item.character || item.text || "")[0];
    if (!character) return;
    const zhuyin = typeof item.zhuyin === "string" ? item.zhuyin.trim() : "";
    const current = entries.get(character);
    if (!current || (!current.zhuyin && zhuyin)) entries.set(character, { character, zhuyin });
  });

  return [...entries.values()];
}

function getLearnedCharacters() {
  try {
    const saved = JSON.parse(localStorage.getItem(sharedLearnedCharactersKey) || "[]");
    const normalized = normalizeLearnedCharacters(saved);
    if (JSON.stringify(saved) !== JSON.stringify(normalized)) {
      localStorage.setItem(sharedLearnedCharactersKey, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return [];
  }
}

function setLearnedCharacters(characters) {
  localStorage.setItem(sharedLearnedCharactersKey, JSON.stringify(normalizeLearnedCharacters(characters)));
  localStorage.setItem(learnedCharactersVersionKey, learnedCharactersVersion);
}

async function loadStoryZhuyinMap() {
  const sharedMap = window.ZHUYIN_CHARACTER_MAP || {};
  if (Object.keys(sharedMap).length) return { ...sharedMap };

  // 舊頁面未載入共用字典時，保留透過 HTTP 讀取故事檔案的備援。
  const map = {};
  const tokenPattern = /t\(\s*["']([\u3400-\u9fff\uf900-\ufaff])["']\s*,\s*["']([^"']+)["']\s*\)/gu;

  await Promise.all(storyFiles.map(async filename => {
    try {
      const response = await fetch(`ZhuyinAdventure/${filename}`);
      if (!response.ok) return;
      const source = await response.text();
      for (const match of source.matchAll(tokenPattern)) {
        if (!map[match[1]]) map[match[1]] = match[2];
      }
    } catch {
      // 保留尚未找到注音的字，避免升級過程遺失資料。
    }
  }));

  return map;
}

async function upgradeLearnedCharacters(options = {}) {
  const automatic = options.automatic === true;
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(sharedLearnedCharactersKey) || "[]");
  } catch {
    if (!automatic) window.alert("舊版字庫格式損壞，無法自動升級。請匯入先前備份的清單。");
    return;
  }

  const entries = normalizeLearnedCharacters(saved);
  if (!entries.length) {
    localStorage.setItem(learnedCharactersVersionKey, learnedCharactersVersion);
    if (!automatic) window.alert("目前沒有需要升級的已學會字。");
    return;
  }

  const zhuyinMap = await loadStoryZhuyinMap();
  let filledCount = 0;
  const upgraded = entries.map(entry => {
    if (entry.zhuyin || !zhuyinMap[entry.character]) return entry;
    filledCount += 1;
    return { character: entry.character, zhuyin: zhuyinMap[entry.character] };
  });

  setLearnedCharacters(upgraded);
  const unresolved = upgraded.filter(entry => !entry.zhuyin);
  const unresolvedMessage = unresolved.length
    ? `\n\n仍有 ${unresolved.length} 字找不到注音：${unresolved.map(entry => entry.character).join("、")}\n可輸出新版 JSON，補上注音後再匯入。`
    : "\n\n所有字都已包含注音。";

  const heading = automatic ? "偵測到舊版字庫，已自動升級。" : "字庫已升級至新版格式。";
  window.alert(`${heading}\n共 ${upgraded.length} 字，本次補上 ${filledCount} 個注音。${unresolvedMessage}`);
}

function learnedCharactersInImportText(content) {
  const text = String(content).trim();
  try {
    const parsed = JSON.parse(text);
    const entries = normalizeLearnedCharacters(parsed);
    if (entries.length) return entries;
  } catch {
    // 繼續嘗試舊版純文字格式。
  }

  const importText = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && line !== "已學會的字" && !/^共\s*\d+\s*字$/u.test(line))
    .join("");
  return charactersInText(importText).map(character => ({ character, zhuyin: "" }));
}

function importLearnedCharactersFromText(content) {
  const importedCharacters = learnedCharactersInImportText(content);
  if (!importedCharacters.length) {
    window.alert("檔案裡沒有找到可以匯入的中文字。");
    return;
  }

  const learnedCharacters = getLearnedCharacters();
  const mergedCharacters = normalizeLearnedCharacters([...learnedCharacters, ...importedCharacters]);
  const addedCount = mergedCharacters.length - learnedCharacters.length;

  setLearnedCharacters(mergedCharacters);
  window.alert(`匯入完成。新增 ${addedCount} 字，共 ${mergedCharacters.length} 字。`);
}

function importLearnedCharacters() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,.txt,application/json,text/plain";
  input.hidden = true;

  input.addEventListener("cancel", () => input.remove());

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;

    try {
      importLearnedCharactersFromText(await file.text());
    } catch {
      window.alert("讀取檔案失敗，請再試一次。");
    }
  });

  document.body.appendChild(input);
  input.click();
}

function clearCurrentRecords() {
  const shouldClear = window.confirm(
    "確定要清除目前記錄嗎？\n\n這會清除共用學會字庫、注音冒險進度與背包、注音練習卡統計。"
  );

  if (!shouldClear) return;

  localStorage.removeItem(sharedLearnedCharactersKey);
  localStorage.removeItem(learnedCharactersVersionKey);
  localStorage.removeItem(flashcardStateKey);
  localStorage.removeItem(rpgWeightStateKey);

  Object.keys(localStorage).forEach(key => {
    if (adventureRecordPrefixes.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  });

  window.alert("目前記錄已清除。");
}

document.getElementById("import-learned").addEventListener("click", importLearnedCharacters);
document.getElementById("upgrade-learned").addEventListener("click", () => upgradeLearnedCharacters());
document.getElementById("clear-records").addEventListener("click", clearCurrentRecords);

if (localStorage.getItem(learnedCharactersVersionKey) !== learnedCharactersVersion) {
  upgradeLearnedCharacters({ automatic: true });
}
