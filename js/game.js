class GameManager {
    constructor() {
        this.dp = 1000;
        this.floor = 1;
        this.reputation = 0;
        this.dungeonData = null;
        this.isPaused = false;
        this.adventurers = [];
        this.lastUpdate = Date.now();
    }

    init() {
        this.dungeonData = new DungeonData();
        this.updateUI();
        this.startGameLoop();
    }

    startNewGame() {
        this.dp = 1000;
        this.floor = 1;
        this.reputation = 0;
        this.dungeonData = new DungeonData();
        this.adventurers = [];

        this.showGameScreen();
        this.updateUI();
        this.addLog('新しいダンジョンの運営を開始しました！', 'success');
    }

    continueGame() {
        const saveData = this.loadGameData();
        if (saveData) {
            this.dp = saveData.dp;
            this.floor = saveData.floor;
            this.reputation = saveData.reputation;
            this.dungeonData = new DungeonData();
            this.dungeonData.loadFromSave(saveData.dungeonData);

            this.showGameScreen();
            this.updateUI();
            this.addLog('ゲームを再開しました', 'info');
        } else {
            alert('セーブデータが見つかりません');
        }
    }

    saveGame() {
        const saveData = {
            dp: this.dp,
            floor: this.floor,
            reputation: this.reputation,
            dungeonData: this.dungeonData.getSaveData(),
            timestamp: Date.now()
        };

        localStorage.setItem('dungeonMasterSave', JSON.stringify(saveData));
        this.addLog('ゲームをセーブしました', 'success');
    }

    loadGameData() {
        const saveStr = localStorage.getItem('dungeonMasterSave');
        if (saveStr) {
            try {
                return JSON.parse(saveStr);
            } catch (e) {
                console.error('セーブデータの読み込みに失敗:', e);
                return null;
            }
        }
        return null;
    }

    showGameScreen() {
        document.getElementById('titleScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
        dungeonViewer.init();
    }

    showMenu() {
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('titleScreen').classList.add('active');
    }

    updateUI() {
        document.getElementById('dpValue').textContent = this.dp;
        document.getElementById('floorValue').textContent = this.floor;
        document.getElementById('reputationValue').textContent = this.reputation;
    }

    addDP(amount) {
        this.dp += amount;
        this.updateUI();
    }

    spendDP(amount) {
        if (this.dp >= amount) {
            this.dp -= amount;
            this.updateUI();
            return true;
        }
        return false;
    }

    addLog(message, type = 'info') {
        const logContent = document.getElementById('logContent');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;

        const time = new Date().toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });

        entry.innerHTML = `<span style="color: #606080;">[${time}]</span> ${message}`;
        logContent.insertBefore(entry, logContent.firstChild);

        if (logContent.children.length > 100) {
            logContent.removeChild(logContent.lastChild);
        }
    }

    startGameLoop() {
        setInterval(() => {
            if (!this.isPaused) {
                this.update();
            }
        }, 100);
    }

    update() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        if (Math.random() < 0.001) {
            this.spawnAdventurer();
        }

        this.adventurers.forEach((adventurer, index) => {
            adventurer.update(deltaTime);
            if (adventurer.isDead || adventurer.hasEscaped) {
                this.adventurers.splice(index, 1);
                if (adventurer.isDead) {
                    const reward = Math.floor(adventurer.level * 50 + Math.random() * 50);
                    this.addDP(reward);
                    this.reputation += 1;
                    this.addLog(`${adventurer.name}を倒した！ +${reward}DP`, 'success');
                } else {
                    this.reputation += 2;
                    this.addLog(`${adventurer.name}が生還した！`, 'warning');
                }
                this.updateUI();
            }
        });

        dungeonViewer.render();
    }

    spawnAdventurer() {
        const names = ['勇者', '戦士', '魔法使い', '盗賊', '聖職者', '弓使い', '剣士'];
        const name = names[Math.floor(Math.random() * names.length)] +
                     Math.floor(Math.random() * 100);

        const level = Math.floor(Math.random() * 5) + 1;
        const adventurer = new Adventurer(name, level);

        this.adventurers.push(adventurer);
        this.addLog(`${name} (Lv.${level}) が侵入してきた！`, 'danger');
    }
}

const gameManager = new GameManager();