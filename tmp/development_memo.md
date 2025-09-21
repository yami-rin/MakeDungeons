# 開発メモ・備忘録

## 最終更新: 2025-09-21 15:54

## 🧠 重要な記憶事項

### プロジェクトの経緯
- ユーザーからの要求：ダンジョン運営ゲームの作成
- タイトル画面必須（はじめから/続きから）
- ブラウザプレイ可能
- GitHubリポジトリ: https://github.com/yami-rin/MakeDungeons

### 技術的な決定事項
- **Vanilla JavaScript採用理由**:
  - 軽量で高速
  - 外部ライブラリ不要
  - ブラウザ互換性高い

- **Canvas API使用**:
  - 2Dゲーム描画に最適
  - パフォーマンス良好
  - タイルベース描画に適している

- **LocalStorage使用**:
  - クライアントサイド完結
  - サーバー不要
  - 即座にセーブ/ロード可能

## 💡 アイデア・今後の展開

### 実装したい機能（優先度順）
1. **マルチフロア探索**
   - 冒険者が複数階層を移動
   - 階層ごとの難易度設定

2. **ダンジョンテーマ**
   - 洞窟、城、森などのテーマ
   - テーマごとの特殊モンスター

3. **実績システム**
   - 「100人撃退」「ドラゴン10体配置」など
   - 実績報酬でボーナスDP

4. **オンラインランキング**
   - 最高DP記録
   - 最多撃退数
   - 最深到達階層

## 🔧 技術的なTips

### Canvas描画最適化
```javascript
// ダブルバッファリング検討
// オフスクリーンCanvasを使用して描画を最適化
const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d');
// 描画処理...
ctx.drawImage(offscreen, 0, 0);
```

### パフォーマンス改善案
1. **requestAnimationFrame使用**
   - 現在: setInterval(100ms)
   - 改善: requestAnimationFrame + deltaTime計算

2. **オブジェクトプール**
   - 冒険者やエフェクトの再利用
   - GC負荷軽減

3. **空間分割**
   - QuadTreeやグリッド分割
   - 衝突判定の高速化

## 📊 ゲームバランスメモ

### 現在の経済バランス
- 初期DP: 1000
- スライム配置: 50DP → 撃破報酬: 約75DP（150%リターン）
- ドラゴン配置: 800DP → 撃破報酬: 約275DP（34%リターン）
- **問題**: 高レベルモンスターのコスパが悪い

### 改善案
- レベル差ボーナス導入
- 連続撃破ボーナス
- 時間経過でDP自動獲得（少量）

## 🐛 デバッグ情報

### よく起きる問題と対処
1. **Canvasが真っ黒**
   - 原因: render()が呼ばれていない
   - 対処: dungeonViewer.init()確認

2. **クリックが反応しない**
   - 原因: イベントリスナー未登録
   - 対処: setupTabs()の呼び出し確認

3. **セーブデータ破損**
   - 原因: JSON.parseエラー
   - 対処: try-catch追加、破損時は初期化

## 📝 コード片・スニペット

### エンティティ追加テンプレート
```javascript
const newEntityTemplates = [
    { name: '新モンスター', level: 1, cost: 100 },
    // 追加...
];
```

### ログ出力フォーマット
```javascript
gameManager.addLog('メッセージ', 'タイプ');
// タイプ: success, warning, danger, info
```

### デバッグ用コンソールコマンド
```javascript
// DP追加（開発用）
gameManager.addDP(10000);

// 全フロア情報
console.log(gameManager.dungeonData.floors);

// 冒険者強制スポーン
gameManager.spawnAdventurer();
```

## 🔍 調査事項

### 未解決の技術課題
1. **メモリリーク可能性**
   - setIntervalの重複
   - イベントリスナーの解放漏れ

2. **ブラウザ互換性**
   - Safari: LocalStorage制限
   - Firefox: Canvas描画の違い

### 参考リンク
- [MDN Canvas API](https://developer.mozilla.org/ja/docs/Web/API/Canvas_API)
- [A* Pathfinding](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Game Loop Best Practices](https://developer.mozilla.org/en-US/docs/Games/Anatomy)

## 📅 作業履歴

### 2025-09-21
- プロジェクト初期作成
- 基本機能実装完了
- GitHubリポジトリ設定
- タスクリスト作成
- メモシステム構築

---

## 緊急時の復旧手順

もし何か壊れた場合：

1. **Gitから復旧**
   ```bash
   git status  # 変更確認
   git diff    # 差分確認
   git checkout -- .  # 全変更破棄（注意）
   ```

2. **最小動作確認**
   - index.htmlを直接ブラウザで開く
   - コンソールでエラー確認
   - gameManager存在確認

3. **セーブデータリセット**
   ```javascript
   localStorage.removeItem('dungeonMasterSave');
   location.reload();
   ```