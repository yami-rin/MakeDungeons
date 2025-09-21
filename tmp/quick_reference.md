# クイックリファレンス

## ファイル構造早見表

```
dungeons/
├── index.html          → エントリーポイント
├── styles.css          → 全スタイル定義
├── js/
│   ├── game.js         → GameManager（メインロジック）
│   ├── dungeon.js      → DungeonData, Floor, DungeonBuilder
│   ├── entities.js     → Monster, Trap, Treasure, Adventurer
│   ├── ui.js           → DungeonViewer（描画）
│   └── main.js         → 初期化
├── tasklist/
│   └── main_tasklist.md → 詳細タスクリスト
└── tmp/
    ├── project_status.md    → プロジェクト状況
    ├── development_memo.md  → 開発メモ
    └── quick_reference.md   → このファイル
```

## 主要クラス・関数

### GameManager (js/game.js)
- `startNewGame()` - 新規ゲーム開始
- `continueGame()` - セーブデータから再開
- `saveGame()` - LocalStorageに保存
- `addDP(amount)` - DP追加
- `spendDP(amount)` - DP消費
- `addLog(message, type)` - ログ出力
- `update()` - ゲームループ更新

### DungeonData (js/dungeon.js)
- `addFloor()` - 階層追加
- `getFloor(floorNumber)` - 階層取得
- `placeEntity(floor, entity, x, y)` - エンティティ配置

### DungeonViewer (js/ui.js)
- `init()` - Canvas初期化
- `render()` - 描画処理
- `drawTile(x, y, tile)` - タイル描画
- `drawEntity(x, y, entity)` - エンティティ描画

## 重要な変数・定数

### グローバル変数
- `gameManager` - ゲーム全体管理
- `dungeonBuilder` - ダンジョン構築
- `dungeonViewer` - 描画管理

### 定数値
- タイルサイズ: 60px
- グリッドサイズ: 10x10
- ゲームループ: 100ms
- 冒険者出現率: 0.1%/tick
- 罠クールダウン: 5秒

## よく使うコマンド（開発用）

### Git操作
```bash
git status
git add .
git commit -m "メッセージ"
git push origin main
```

### ブラウザコンソール
```javascript
// DP追加
gameManager.addDP(5000)

// 冒険者召喚
gameManager.spawnAdventurer()

// ダンジョン情報
console.log(gameManager.dungeonData)

// セーブデータ確認
console.log(localStorage.getItem('dungeonMasterSave'))

// 強制セーブ
gameManager.saveGame()
```

## トラブルシューティング

| 症状 | 原因 | 解決方法 |
|------|------|----------|
| 画面真っ黒 | Canvas初期化失敗 | F5リロード |
| クリック無反応 | イベント未登録 | setupTabs()確認 |
| セーブ失敗 | LocalStorage満杯 | 古いデータ削除 |
| 冒険者が出ない | 確率が低い | spawnAdventurer()手動実行 |

## 次のステップチェックリスト

作業再開時の確認事項：
- [ ] `git pull`で最新取得
- [ ] tasklist/main_tasklist.md確認
- [ ] tmp/development_memo.md確認
- [ ] ブラウザで動作確認
- [ ] コンソールエラー確認