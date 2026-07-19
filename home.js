const sharedLearnedCharactersKey = "adventure-learned-characters";
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

function getLearnedCharacters() {
  try {
    return JSON.parse(localStorage.getItem(sharedLearnedCharactersKey) || "[]");
  } catch {
    return [];
  }
}

function setLearnedCharacters(characters) {
  localStorage.setItem(sharedLearnedCharactersKey, JSON.stringify([...new Set(characters)]));
}

function charactersInImportText(content) {
  const importText = String(content)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && line !== "已學會的字" && !/^共\s*\d+\s*字$/u.test(line))
    .join("");
  return charactersInText(importText);
}

function importLearnedCharactersFromText(content) {
  const importedCharacters = charactersInImportText(content);
  if (!importedCharacters.length) {
    window.alert("檔案裡沒有找到可以匯入的中文字。");
    return;
  }

  const learnedCharacters = getLearnedCharacters();
  const mergedCharacters = [...new Set([...learnedCharacters, ...importedCharacters])];
  const addedCount = mergedCharacters.length - learnedCharacters.length;

  setLearnedCharacters(mergedCharacters);
  window.alert(`匯入完成。新增 ${addedCount} 字，共 ${mergedCharacters.length} 字。`);
}

function importLearnedCharacters() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt,text/plain";
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
  localStorage.removeItem(flashcardStateKey);

  Object.keys(localStorage).forEach(key => {
    if (adventureRecordPrefixes.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  });

  window.alert("目前記錄已清除。");
}

document.getElementById("import-learned").addEventListener("click", importLearnedCharacters);
document.getElementById("clear-records").addEventListener("click", clearCurrentRecords);
