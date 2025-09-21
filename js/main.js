document.addEventListener('DOMContentLoaded', () => {
    setupTabs();

    // gameManagerの初期化（時間システムも含む）
    // タイトル画面では初期化だけ行い、ゲームループは開始しない

    // 壁作成価格の初期表示
    dungeonBuilder.updateWallCost();

    const saveData = gameManager.loadGameData();
    if (saveData) {
        document.querySelector('.menu-btn[onclick*="continueGame"]').style.display = 'block';
    }
});