const sharedLearnedCharactersKey = "adventure-learned-characters";

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

document.getElementById("import-learned").addEventListener("click", importLearnedCharacters);
