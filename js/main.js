document.addEventListener('DOMContentLoaded', () => {
    setupTabs();

    const saveData = gameManager.loadGameData();
    if (saveData) {
        document.querySelector('.menu-btn[onclick*="continueGame"]').style.display = 'block';
    }
});