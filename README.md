# 注音互動故事引擎

這是一個給兒童閱讀的注音互動故事網頁。專案本身是一個簡單的故事引擎，可以透過替換 `story.js` 來體驗不同故事內容。

目前附上的 `story.js` 是「恐龍山谷：道具版」範例故事，用來示範地點、門、道具、背包、鎖門條件與結局的寫法。

專案是純前端靜態網站，不需要安裝套件或執行建置流程，適合直接部署到 GitHub Pages。

## 如何開啟

直接用瀏覽器開啟 `index.html` 即可遊玩。

如果部署在 GitHub Pages，網站入口也是 `index.html`。

## 專案用途

- 建立適合兒童閱讀的注音互動故事。
- 用同一套 `engine.js` 呈現不同故事。
- 透過替換 `story.js` 快速切換故事內容。
- 支援分岔路線、返回上一個地點、道具收集、鎖門條件與結局。
- 支援點擊中文字，將字加入或移出已學會清單。
- 使用瀏覽器保存玩家目前位置與背包。

## 替換故事

要製作新的故事，主要需要替換 `story.js`。

新的 `story.js` 需要定義一個 `STORY` 物件，提供故事 ID、起始地點、介面文字、道具與房間資料。`engine.js` 會讀取這些資料並自動渲染畫面。

基本結構如下：

```js
const STORY = {
  id: "my-story-id",
  startRoom: "start",
  labels: {
    doors: [],
    restart: [],
    resume: [],
    bag: [],
    emptyBag: [],
    gotItem: [],
    locked: []
  },
  items: {
    item_id: {
      name: []
    }
  },
  rooms: {
    start: {
      id: "start",
      title: [],
      description: [],
      doors: []
    }
  }
};
```

故事文字可以使用 `t("字", "注音")` 來加上注音，也可以直接放一般字串。

```js
title: ["🌟 ", t("起", "ㄑㄧˇ"), t("點", "ㄉㄧㄢˇ")]
```

## 已學會的字

玩家可以點擊故事中的中文字，將該字加入已學會清單。已學會的字會顯示為較深的綠色。

再次點擊已學會的字，會把該字從已學會清單移除，文字也會回到預設黑色。

已學會清單會存在瀏覽器的 `localStorage`，並且不綁定單一故事。替換不同 `story.js` 後，相同的字仍會保留已學會狀態。

## 房間資料

每個房間可以包含以下欄位：

- `id`：房間代號，需和 `rooms` 裡的 key 對應。
- `title`：房間標題。
- `description`：房間描述，每一段是一組文字陣列。
- `doors`：可前往的門。
- `back`：返回用的門。
- `givesItem`：進入房間時取得的道具 ID。
- `ending`：結局文字。

門可以設定成一般通道，也可以要求玩家先取得某個道具。

```js
{
  name: [],
  description: [],
  lockedDescription: [],
  requires: "item_id",
  to: "next_room"
}
```

如果玩家還沒有 `requires` 指定的道具，這扇門會顯示為鎖住狀態。

## 主要檔案

- `index.html`：網站入口，載入樣式、故事資料與互動引擎。
- `story.js`：故事內容，可替換成不同故事。
- `engine.js`：互動引擎，負責畫面渲染、門的點選、背包、鎖門條件與進度保存。
- `style.css`：頁面樣式，包含大字體、注音、門、背包與提示區塊。
- `LICENSE`：MIT 授權條款。

## 技術說明

- 使用 HTML、CSS、JavaScript 製作，沒有外部框架。
- 使用 `<ruby>` 與 `<rt>` 顯示注音。
- 使用 `localStorage` 保存目前位置、背包道具與已學會字清單。
- 使用網址 hash，例如 `#start`，表示目前故事地點。
- 故事資料以 `STORY` 物件集中管理，方便替換與擴充。
