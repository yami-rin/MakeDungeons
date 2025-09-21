class TimeManager {
    constructor() {
        this.currentDay = 1;
        this.currentTime = 0;
        this.dayDuration = 60000;  // デバッグ用: 1分で1日（本番は600000=10分）
        this.dayStartTime = Date.now();
        this.todayAdventurers = 0;
        this.todayDPEarned = 0;
        this.todayDPSpent = 0;
        this.isNewDay = false;
    }

    update() {
        const elapsed = Date.now() - this.dayStartTime;
        this.currentTime = (elapsed / this.dayDuration) * 100;

        if (elapsed >= this.dayDuration) {
            this.endDay();
        }

        return this.currentTime;
    }

    endDay() {
        gameManager.showDayReport();
        gameManager.autoSave();
        this.currentDay++;
        this.dayStartTime = Date.now();
        this.currentTime = 0;
        this.todayAdventurers = 0;
        this.todayDPEarned = 0;
        this.todayDPSpent = 0;
        this.isNewDay = true;
        gameManager.startNewDay();
    }

    getTimeString() {
        const hours = Math.floor(this.currentTime * 24 / 100);
        const minutes = Math.floor((this.currentTime * 24 * 60 / 100) % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    getDayString() {
        return `Day ${this.currentDay}`;
    }
}

class GameManager {
    constructor() {
        this.dp = 1000;
        this.floor = 1;
        this.reputation = 0;
        this.dungeonData = null;
        this.isPaused = false;
        this.adventurers = [];
        this.lastUpdate = Date.now();
        this.timeManager = new TimeManager();
        this.isGameOver = false;
        this.dungeonCore = null;
        this.isDiscovered = false;  // ダンジョンが発見されたか
        this.discoveryDay = 3;  // 発見までの日数
        this.dailyAdventurerCount = 0;  // その日に生成した冒険者数
    }

    init() {
        // この関数は現在使用していない
        // startNewGameとcontinueGameで初期化を行っている
    }

    startNewGame() {
        this.dp = 1000;
        this.floor = 1;
        this.reputation = 0;
        this.dungeonData = new DungeonData();
        this.dungeonCore = this.dungeonData.initializeDungeonCore();
        this.adventurers = [];
        this.timeManager = new TimeManager();
        this.isGameOver = false;
        this.isDiscovered = false;
        this.discoveryDay = 3;

        this.showGameScreen();
        this.updateUI();
        this.addLog('新しいダンジョンの運営を開始しました！', 'success');
        this.addLog('ダンジョンコアを守り抜け！', 'warning');
        this.addLog('3日後に冒険者がこのダンジョンを発見する予定です...', 'info');

        // デバッグ用
        console.log('Game started. Time system initialized:', this.timeManager);
        console.log('Day duration (ms):', this.timeManager.dayDuration);
    }

    continueGame() {
        const saveData = this.loadGameData();
        if (saveData) {
            this.dp = saveData.dp;
            this.floor = saveData.floor;
            this.reputation = saveData.reputation;
            this.dungeonData = new DungeonData();
            this.dungeonData.loadFromSave(saveData.dungeonData);
            this.dungeonCore = this.dungeonData.dungeonCore;
            if (saveData.timeManager) {
                this.timeManager.currentDay = saveData.timeManager.currentDay;
                this.timeManager.dayStartTime = Date.now();
            }
            this.isGameOver = false;
            this.isDiscovered = saveData.isDiscovered || false;
            this.discoveryDay = saveData.discoveryDay || 3;

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
            timeManager: {
                currentDay: this.timeManager.currentDay,
                todayAdventurers: this.timeManager.todayAdventurers,
                todayDPEarned: this.timeManager.todayDPEarned,
                todayDPSpent: this.timeManager.todayDPSpent
            },
            isDiscovered: this.isDiscovered,
            discoveryDay: this.discoveryDay,
            timestamp: Date.now()
        };

        localStorage.setItem('dungeonMasterSave', JSON.stringify(saveData));
        this.addLog('ゲームをセーブしました', 'success');
    }

    autoSave() {
        const saveData = {
            dp: this.dp,
            floor: this.floor,
            reputation: this.reputation,
            dungeonData: this.dungeonData.getSaveData(),
            timeManager: {
                currentDay: this.timeManager.currentDay,
                todayAdventurers: this.timeManager.todayAdventurers,
                todayDPEarned: this.timeManager.todayDPEarned,
                todayDPSpent: this.timeManager.todayDPSpent
            },
            isDiscovered: this.isDiscovered,
            discoveryDay: this.discoveryDay,
            timestamp: Date.now()
        };

        localStorage.setItem('dungeonMasterDaily', JSON.stringify(saveData));
    }

    loadDailyBackup() {
        const saveStr = localStorage.getItem('dungeonMasterDaily');
        if (saveStr) {
            try {
                return JSON.parse(saveStr);
            } catch (e) {
                console.error('日次バックアップの読み込みに失敗:', e);
                return null;
            }
        }
        return null;
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
        this.startGameLoop();  // ゲーム画面表示時にゲームループを開始
    }

    showMenu() {
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('titleScreen').classList.add('active');
    }

    toggleDebugMenu() {
        const debugMenu = document.getElementById('debugMenu');
        if (debugMenu) {
            debugMenu.style.display = debugMenu.style.display === 'none' ? 'block' : 'none';
        }
    }

    setDP(value) {
        this.dp = parseInt(value) || 0;
        this.updateUI();
        this.addLog(`DPを${this.dp}に設定しました`, 'info');
    }

    setReputation(value) {
        this.reputation = parseInt(value) || 0;
        this.updateUI();
        this.addLog(`評判を${this.reputation}に設定しました`, 'info');
    }

    clearAdventurers() {
        this.adventurers = [];
        this.addLog('すべての冒険者を削除しました', 'info');
    }

    countAllMonsters() {
        let count = 0;
        this.dungeonData.floors.forEach(floor => {
            for (let y = 0; y < floor.height; y++) {
                for (let x = 0; x < floor.width; x++) {
                    if (floor.grid[y][x].entity && floor.grid[y][x].entity.type === 'monster') {
                        count++;
                    }
                }
            }
        });
        return count;
    }

    countAllTraps() {
        let count = 0;
        this.dungeonData.floors.forEach(floor => {
            for (let y = 0; y < floor.height; y++) {
                for (let x = 0; x < floor.width; x++) {
                    if (floor.grid[y][x].entity && floor.grid[y][x].entity.type === 'trap') {
                        count++;
                    }
                }
            }
        });
        return count;
    }

    updateUI() {
        document.getElementById('dpValue').textContent = this.dp;
        document.getElementById('floorValue').textContent = this.floor;
        document.getElementById('reputationValue').textContent = this.reputation;

        const dayElement = document.getElementById('dayValue');
        const timeElement = document.getElementById('timeValue');
        if (dayElement) dayElement.textContent = this.timeManager.getDayString();
        if (timeElement) timeElement.textContent = this.timeManager.getTimeString();

        // 冒険者召喚ボタンの表示制御
        const summonBtn = document.getElementById('summonBtn');
        if (summonBtn) {
            if (!this.isDiscovered && this.timeManager.currentDay < this.discoveryDay) {
                summonBtn.style.display = 'inline-block';
            } else {
                summonBtn.style.display = 'none';
            }
        }
    }

    addDP(amount) {
        this.dp += amount;
        this.timeManager.todayDPEarned += amount;
        this.updateUI();
    }

    spendDP(amount) {
        if (this.dp >= amount) {
            this.dp -= amount;
            this.timeManager.todayDPSpent += amount;
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
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }
        this.gameLoopInterval = setInterval(() => {
            if (!this.isPaused) {
                this.update();
            }
        }, 100);
    }

    update() {
        if (this.isGameOver) return;

        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // 時間を更新
        if (this.timeManager) {
            this.timeManager.update();
            this.updateUI();
        }

        // 3日経過でダンジョン発見
        if (!this.isDiscovered && this.timeManager.currentDay >= this.discoveryDay) {
            this.discoverDungeon();
        }

        // 冒険者の出現は日の始めに決定されるため、ここでは処理しない

        this.adventurers.forEach((adventurer, index) => {
            adventurer.update(deltaTime);

            if (this.dungeonCore && adventurer.checkCoreReached(this.dungeonCore)) {
                this.gameOver('冒険者がダンジョンコアに到達した！');
                return;
            }

            if (adventurer.isDead) {
                const reward = Math.floor(adventurer.level * 50 + Math.random() * 50);
                this.addDP(reward);
                this.reputation += 1;
                this.addLog(`${adventurer.name}を倒した！ +${reward}DP`, 'success');
                this.updateUI();
            }
        });

        // 死亡または脱出した冒険者を削除（パフォーマンス最適化）
        if (this.adventurers.some(adv => adv.isDead || adv.hasEscaped)) {
            this.adventurers = this.adventurers.filter(adv => !adv.isDead && !adv.hasEscaped);
        }

        dungeonViewer.render();
    }

    spawnAdventurer() {
        const names = ['勇者', '戦士', '魔法使い', '盗賊', '聖職者', '弓使い', '剣士'];
        const name = names[Math.floor(Math.random() * names.length)] +
                     Math.floor(Math.random() * 100);

        const baseLevel = Math.floor(this.timeManager.currentDay / 3) + 1;
        const level = Math.min(baseLevel + Math.floor(Math.random() * 3), 10);
        const adventurer = new Adventurer(name, level);

        // 入口の位置を探してスポーン（常に1階）
        adventurer.currentFloor = 1;  // 必ず1階から開始
        const floor = this.dungeonData?.getFloor(1);
        if (floor) {
            for (let y = 0; y < floor.height; y++) {
                for (let x = 0; x < floor.width; x++) {
                    if (floor.grid[y][x].type === 'entrance') {
                        adventurer.x = x;
                        adventurer.y = y;
                        adventurer.targetX = x;
                        adventurer.targetY = y;
                        break;
                    }
                }
            }
        }

        this.adventurers.push(adventurer);
        this.timeManager.todayAdventurers++;
        this.addLog(`${name} (Lv.${level}) が1階に侵入してきた！`, 'danger');
    }

    startNewDay() {
        const dungeonSize = this.dungeonData.floors.length;
        const monsterCount = this.countAllMonsters();
        const trapCount = this.countAllTraps();
        const dailyIncome = dungeonSize * 100 + this.reputation * 10 + monsterCount * 5 + trapCount * 3;
        this.addDP(dailyIncome);
        this.addLog(`新しい日が始まった！ ${this.timeManager.getDayString()}`, 'info');
        this.addLog(`ダンジョン収入: +${dailyIncome}DP (階層:${dungeonSize * 100} 評判:${this.reputation * 10} モンスター:${monsterCount * 5} 罠:${trapCount * 3})`, 'success');

        // 冒険者カウントをリセット
        this.dailyAdventurerCount = 0;

        // 死亡した冒険者をクリーンアップ
        this.adventurers = this.adventurers.filter(adv => !adv.isDead && !adv.hasEscaped);

        // 発見されている場合、評判に基づいて冒険者を生成
        if (this.isDiscovered) {
            this.generateDailyAdventurers();
        }

        // 発見までのカウントダウン
        if (!this.isDiscovered) {
            const daysLeft = this.discoveryDay - this.timeManager.currentDay;
            if (daysLeft > 0) {
                this.addLog(`冒険者発見まであと${daysLeft}日...`, 'warning');
            }
        }
    }

    discoverDungeon() {
        this.isDiscovered = true;
        this.reputation = 3;  // 発見時に評判が3になる
        this.addLog('冒険者にダンジョンを発見された！', 'danger');
        this.addLog('評判が3になりました！', 'info');
        this.addLog('今後、冒険者が定期的に襲来します！', 'danger');
        this.generateDailyAdventurers();
        this.updateUI();
    }

    summonAdventurers() {
        if (!this.isDiscovered) {
            this.discoverDungeon();
        }
    }

    generateDailyAdventurers() {
        // 評判に基づいた最大冒険者数を計算（評判3ごとに+1、初期値1）
        const maxAdventurers = 1 + Math.floor(this.reputation / 3);

        // その日の冒険者数を決定（1～最大数）
        const adventurerCount = Math.floor(Math.random() * maxAdventurers) + 1;

        this.addLog(`本日の冒険者予定数: ${adventurerCount}人（最大: ${maxAdventurers}人）`, 'info');

        // ランダムな時間に冒険者を生成
        for (let i = 0; i < adventurerCount; i++) {
            // 1日のランダムな時間に出現するようスケジュール
            const spawnTime = Math.random() * this.timeManager.dayDuration;
            setTimeout(() => {
                if (!this.isGameOver && this.isDiscovered) {
                    this.spawnAdventurer();
                }
            }, spawnTime);
        }
    }

    showDayReport() {
        const report = `
            === Day ${this.timeManager.currentDay} 終了報告 ===
            冒険者襲来数: ${this.timeManager.todayAdventurers}人
            DP獲得: +${this.timeManager.todayDPEarned}DP
            DP支出: -${this.timeManager.todayDPSpent}DP
            収支: ${this.timeManager.todayDPEarned - this.timeManager.todayDPSpent}DP
        `;

        this.addLog('=== 1日が終了しました ===', 'info');
        this.addLog(`冒険者襲来数: ${this.timeManager.todayAdventurers}人`, 'info');
        this.addLog(`DP収支: ${this.timeManager.todayDPEarned - this.timeManager.todayDPSpent}DP`, 'info');
    }

    gameOver(reason) {
        this.isGameOver = true;
        this.isPaused = true;
        this.addLog(`ゲームオーバー: ${reason}`, 'danger');

        setTimeout(() => {
            if (confirm(`${reason}\n\n今日の開始時点に戻りますか？`)) {
                this.retryFromDayStart();
            } else {
                this.showMenu();
            }
        }, 1000);
    }

    retryFromDayStart() {
        const dailyBackup = this.loadDailyBackup();
        if (dailyBackup) {
            this.dp = dailyBackup.dp;
            this.floor = dailyBackup.floor;
            this.reputation = dailyBackup.reputation;
            this.dungeonData = new DungeonData();
            this.dungeonData.loadFromSave(dailyBackup.dungeonData);
            this.dungeonCore = this.dungeonData.dungeonCore;
            this.timeManager.currentDay = dailyBackup.timeManager.currentDay;
            this.timeManager.dayStartTime = Date.now();
            this.adventurers = [];
            this.isGameOver = false;
            this.isPaused = false;

            this.updateUI();
            this.addLog('今日の開始時点に戻りました', 'success');
        } else {
            alert('日次バックアップが見つかりません');
            this.showMenu();
        }
    }
}

const gameManager = new GameManager();