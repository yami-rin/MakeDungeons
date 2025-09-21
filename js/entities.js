class Monster {
    constructor(name, level, cost) {
        this.name = name;
        this.level = level;
        this.cost = cost;
        this.hp = level * 10;
        this.attack = level * 3;
        this.defense = level * 2;
        this.type = 'monster';
    }

    battle(adventurer) {
        const damage = Math.max(1, this.attack - adventurer.defense);
        adventurer.takeDamage(damage);
        return damage;
    }
}

class Trap {
    constructor(name, damage, cost) {
        this.name = name;
        this.damage = damage;
        this.cost = cost;
        this.triggered = false;
        this.type = 'trap';
    }

    trigger(adventurer) {
        if (!this.triggered) {
            adventurer.takeDamage(this.damage);
            this.triggered = true;
            setTimeout(() => {
                this.triggered = false;
            }, 5000);
            return true;
        }
        return false;
    }
}

class Treasure {
    constructor(name, value, cost) {
        this.name = name;
        this.value = value;
        this.cost = cost;
        this.collected = false;
        this.type = 'treasure';
    }

    collect() {
        if (!this.collected) {
            this.collected = true;
            return this.value;
        }
        return 0;
    }
}

class Adventurer {
    constructor(name, level) {
        this.name = name;
        this.level = level;
        this.hp = level * 15;
        this.maxHp = this.hp;
        this.attack = level * 4;
        this.defense = level * 2;
        this.speed = 50;
        this.x = 5;
        this.y = 1;
        this.targetX = 5;
        this.targetY = 5;
        this.isDead = false;
        this.hasEscaped = false;
        this.treasureCollected = 0;
        this.direction = 'down'; // 'up', 'down', 'left', 'right'
        this.lastMove = null;
        this.stuckCounter = 0;
        this.escapeMode = false; // 宝箱を取得後、脱出モード
    }

    update(deltaTime) {
        if (this.isDead || this.hasEscaped) return;

        // ダンジョンデータの取得
        const floor = gameManager.dungeonData?.getFloor(1);
        if (!floor) return;

        // グリッド移動（上下左右のみ）
        const currentX = Math.floor(this.x);
        const currentY = Math.floor(this.y);

        // 目標地点に到達しているかチェック
        if (Math.abs(this.x - this.targetX) < 0.1 && Math.abs(this.y - this.targetY) < 0.1) {
            this.x = this.targetX;
            this.y = this.targetY;

            // 現在のタイルの処理
            this.processCurrentTile(floor);

            // 新しい移動先を決定
            this.decideNextMove(floor);
        } else {
            // 移動処理（スムーズに）
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const moveDistance = this.speed * deltaTime;

            if (Math.abs(dx) > 0.01) {
                const moveX = Math.sign(dx) * Math.min(moveDistance, Math.abs(dx));
                this.x += moveX;
            }
            if (Math.abs(dy) > 0.01) {
                const moveY = Math.sign(dy) * Math.min(moveDistance, Math.abs(dy));
                this.y += moveY;
            }
        }

        if (this.hp <= 0) {
            this.isDead = true;
        }

        // 入口または階段に到達したら脱出
        const currentTile = floor.grid[Math.floor(this.y)][Math.floor(this.x)];
        if (this.escapeMode && currentTile.type === 'entrance') {
            this.hasEscaped = true;
            // 宝箱の価値に応じて評判を追加
            const reputationGain = Math.floor(this.treasureCollected / 50);
            if (reputationGain > 0) {
                gameManager.reputation += reputationGain;
                gameManager.addLog(`${this.name}が宝物を持って脱出！評判+${reputationGain}`, 'success');
                gameManager.updateUI();
            } else {
                gameManager.addLog(`${this.name}が入口から脱出した！`, 'warning');
            }
        } else if (!this.escapeMode && currentTile.type === 'stairs') {
            this.hasEscaped = true;
            gameManager.addLog(`${this.name}が階段から脱出した！`, 'warning');
        }
    }

    decideNextMove(floor) {
        const currentX = Math.floor(this.x);
        const currentY = Math.floor(this.y);

        // 脱出モードの場合、入口を目指す
        if (this.escapeMode) {
            const entrance = this.findEntrance(floor);
            if (entrance) {
                const nextPos = this.findPathToTarget(floor, currentX, currentY, entrance.x, entrance.y);
                if (nextPos) {
                    this.setTarget(nextPos.x, nextPos.y);
                }
            }
            return;
        }

        // 1. 直線状に宝箱があるかチェック（勇者以外）
        if (this.name !== '勇者') {
            const treasure = this.findTreasureInSight(floor, currentX, currentY);
            if (treasure) {
                this.setTarget(treasure.x, treasure.y);
                return;
            }
        }

        // 2. 進行方向にモンスターがいるかチェック
        const monster = this.findMonsterInPath(floor, currentX, currentY);
        if (monster) {
            // モンスターと戦闘
            this.battleWithMonster(monster);
            return;
        }

        // 3. 道なりに進む
        const nextPos = this.findNextPathPosition(floor, currentX, currentY);
        if (nextPos) {
            this.setTarget(nextPos.x, nextPos.y);
            this.lastMove = { x: currentX, y: currentY };
        } else {
            // 行き止まりの場合は戻る
            if (this.lastMove) {
                this.setTarget(this.lastMove.x, this.lastMove.y);
            }
        }
    }

    findTreasureInSight(floor, x, y) {
        const directions = [
            { dx: 0, dy: -1 }, // 上
            { dx: 0, dy: 1 },  // 下
            { dx: -1, dy: 0 }, // 左
            { dx: 1, dy: 0 }   // 右
        ];

        for (let dir of directions) {
            for (let dist = 1; dist < 10; dist++) {
                const checkX = x + dir.dx * dist;
                const checkY = y + dir.dy * dist;

                if (!floor.isValidPosition(checkX, checkY)) break;

                const tile = floor.grid[checkY][checkX];
                if (tile.type === 'wall') break;

                if (tile.entity && tile.entity.type === 'treasure' && !tile.entity.collected) {
                    return { x: checkX, y: checkY };
                }
            }
        }
        return null;
    }

    findMonsterInPath(floor, x, y) {
        const dirMap = {
            'up': { dx: 0, dy: -1 },
            'down': { dx: 0, dy: 1 },
            'left': { dx: -1, dy: 0 },
            'right': { dx: 1, dy: 0 }
        };

        const dir = dirMap[this.direction];
        const nextX = x + dir.dx;
        const nextY = y + dir.dy;

        if (floor.isValidPosition(nextX, nextY)) {
            const tile = floor.grid[nextY][nextX];
            if (tile.entity && tile.entity.type === 'monster') {
                return tile.entity;
            }
        }
        return null;
    }

    findNextPathPosition(floor, x, y) {
        // 上下左右のみ移動可能
        const dirMap = {
            'up': { dx: 0, dy: -1 },
            'down': { dx: 0, dy: 1 },
            'left': { dx: -1, dy: 0 },
            'right': { dx: 1, dy: 0 }
        };

        // まず現在の方向に進めるか
        const currentDir = dirMap[this.direction];
        let nextX = x + currentDir.dx;
        let nextY = y + currentDir.dy;

        if (this.canMoveTo(floor, nextX, nextY) &&
            !(this.lastMove && this.lastMove.x === nextX && this.lastMove.y === nextY)) {
            return { x: nextX, y: nextY };
        }

        // 横方向を試す
        const sideDirections = this.getSideDirections(this.direction);
        for (let sideDir of sideDirections) {
            const dir = dirMap[sideDir];
            nextX = x + dir.dx;
            nextY = y + dir.dy;
            if (this.canMoveTo(floor, nextX, nextY) &&
                !(this.lastMove && this.lastMove.x === nextX && this.lastMove.y === nextY)) {
                this.direction = sideDir;
                return { x: nextX, y: nextY };
            }
        }

        // 後退
        const oppositeDir = this.getOppositeDirection(this.direction);
        const backDir = dirMap[oppositeDir];
        nextX = x + backDir.dx;
        nextY = y + backDir.dy;
        if (this.canMoveTo(floor, nextX, nextY)) {
            this.direction = oppositeDir;
            return { x: nextX, y: nextY };
        }

        return null;
    }

    findEntrance(floor) {
        for (let y = 0; y < floor.height; y++) {
            for (let x = 0; x < floor.width; x++) {
                if (floor.grid[y][x].type === 'entrance') {
                    return { x, y };
                }
            }
        }
        return null;
    }

    findPathToTarget(floor, startX, startY, targetX, targetY) {
        // 簡単な経路探索（入口への最短経路）
        const dx = targetX - startX;
        const dy = targetY - startY;

        // X方向を優先
        if (Math.abs(dx) > 0) {
            const nextX = startX + Math.sign(dx);
            if (this.canMoveTo(floor, nextX, startY)) {
                this.direction = dx > 0 ? 'right' : 'left';
                return { x: nextX, y: startY };
            }
        }

        // Y方向を試す
        if (Math.abs(dy) > 0) {
            const nextY = startY + Math.sign(dy);
            if (this.canMoveTo(floor, startX, nextY)) {
                this.direction = dy > 0 ? 'down' : 'up';
                return { x: startX, y: nextY };
            }
        }

        // 迂回路を探す
        return this.findNextPathPosition(floor, startX, startY);
    }

    canMoveTo(floor, x, y) {
        if (!floor.isValidPosition(x, y)) return false;
        const tile = floor.grid[y][x];
        // 壁とエンティティが存在するタイルは通れない
        return tile.type !== 'wall' && !tile.entity;
    }

    getSideDirections(direction) {
        switch(direction) {
            case 'up':
            case 'down':
                return ['left', 'right'];
            case 'left':
            case 'right':
                return ['up', 'down'];
            default:
                return [];
        }
    }

    getOppositeDirection(direction) {
        switch(direction) {
            case 'up': return 'down';
            case 'down': return 'up';
            case 'left': return 'right';
            case 'right': return 'left';
            default: return 'down';
        }
    }

    processCurrentTile(floor) {
        const currentX = Math.floor(this.x);
        const currentY = Math.floor(this.y);
        const tile = floor.grid[currentY][currentX];

        // 罠の処理
        if (tile.entity && tile.entity.type === 'trap') {
            if (tile.entity.trigger(this)) {
                gameManager.addLog(`${this.name}が${tile.entity.name}にかかった！ -${tile.entity.damage}HP`, 'danger');
            }
        }

        // 宝箱の処理
        if (tile.entity && tile.entity.type === 'treasure') {
            const value = tile.entity.collect();
            if (value > 0) {
                this.collectTreasure(value);
                gameManager.addLog(`${this.name}が${tile.entity.name}を入手！ ${value}G`, 'warning');

                // 宝箱を削除
                tile.entity = null;

                // 勇者以外は脱出モードへ
                if (this.name !== '勇者') {
                    this.escapeMode = true;
                    gameManager.addLog(`${this.name}が宝物を持って脱出を開始！`, 'info');
                }
            }
        }
    }

    battleWithMonster(monster) {
        // 簡易戦闘処理
        const damage = this.battle(monster);
        gameManager.addLog(`${this.name}が${monster.name}を攻撃！ ${damage}ダメージ`, 'info');

        if (monster.hp <= 0) {
            gameManager.addLog(`${monster.name}を倒した！`, 'success');
            // モンスターを削除
            const floor = gameManager.dungeonData?.getFloor(1);
            if (floor) {
                for (let y = 0; y < floor.height; y++) {
                    for (let x = 0; x < floor.width; x++) {
                        if (floor.grid[y][x].entity === monster) {
                            floor.grid[y][x].entity = null;
                            return;
                        }
                    }
                }
            }
        } else {
            // モンスターの反撃
            const counterDamage = monster.battle(this);
            gameManager.addLog(`${monster.name}の反撃！ ${counterDamage}ダメージ`, 'danger');
        }
    }

    takeDamage(damage) {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
        }
    }

    battle(monster) {
        const damage = Math.max(1, this.attack - monster.defense);
        monster.hp -= damage;
        return damage;
    }

    collectTreasure(value) {
        this.treasureCollected += value;
    }

    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    checkCoreReached(core) {
        if (!core) return false;
        const distance = Math.sqrt(
            Math.pow(this.x - core.x, 2) +
            Math.pow(this.y - core.y, 2)
        );
        return distance < 0.5;
    }
}

const monsterTemplates = [
    { name: 'スライム', level: 1, cost: 50 },
    { name: 'ゴブリン', level: 2, cost: 100 },
    { name: 'オーク', level: 3, cost: 200 },
    { name: 'トロール', level: 4, cost: 400 },
    { name: 'ドラゴン', level: 5, cost: 800 }
];

const trapTemplates = [
    { name: '落とし穴', damage: 10, cost: 30 },
    { name: '矢の罠', damage: 15, cost: 50 },
    { name: '炎の罠', damage: 25, cost: 100 },
    { name: 'トゲの罠', damage: 20, cost: 80 },
    { name: '毒ガスの罠', damage: 30, cost: 150 }
];

const treasureTemplates = [
    { name: '小さな宝箱', value: 50, cost: 20 },
    { name: '宝箱', value: 100, cost: 40 },
    { name: '大きな宝箱', value: 200, cost: 80 },
    { name: '豪華な宝箱', value: 500, cost: 200 },
    { name: '伝説の宝箱', value: 1000, cost: 400 }
];

function createMonsterList() {
    const container = document.getElementById('monsterList');
    container.innerHTML = '';

    monsterTemplates.forEach(template => {
        const item = document.createElement('div');
        item.className = 'entity-item';
        item.innerHTML = `
            <div class="entity-info">
                <div class="entity-name">${template.name}</div>
                <div class="entity-stats">Lv.${template.level} 攻撃:${template.level * 3} 防御:${template.level * 2}</div>
            </div>
            <div class="entity-cost">DP: ${template.cost}</div>
        `;
        item.onclick = () => {
            if (gameManager.spendDP(template.cost)) {
                const monster = new Monster(template.name, template.level, template.cost);
                dungeonBuilder.selectEntity('monster', monster);
            } else {
                gameManager.addLog('DPが不足しています', 'warning');
            }
        };
        container.appendChild(item);
    });
}

function createTrapList() {
    const container = document.getElementById('trapList');
    container.innerHTML = '';

    trapTemplates.forEach(template => {
        const item = document.createElement('div');
        item.className = 'entity-item';
        item.innerHTML = `
            <div class="entity-info">
                <div class="entity-name">${template.name}</div>
                <div class="entity-stats">ダメージ: ${template.damage}</div>
            </div>
            <div class="entity-cost">DP: ${template.cost}</div>
        `;
        item.onclick = () => {
            if (gameManager.spendDP(template.cost)) {
                const trap = new Trap(template.name, template.damage, template.cost);
                dungeonBuilder.selectEntity('trap', trap);
            } else {
                gameManager.addLog('DPが不足しています', 'warning');
            }
        };
        container.appendChild(item);
    });
}

function createTreasureList() {
    const container = document.getElementById('treasureList');
    container.innerHTML = '';

    treasureTemplates.forEach(template => {
        const item = document.createElement('div');
        item.className = 'entity-item';
        item.innerHTML = `
            <div class="entity-info">
                <div class="entity-name">${template.name}</div>
                <div class="entity-stats">価値: ${template.value}G</div>
            </div>
            <div class="entity-cost">DP: ${template.cost}</div>
        `;
        item.onclick = () => {
            if (gameManager.spendDP(template.cost)) {
                const treasure = new Treasure(template.name, template.value, template.cost);
                dungeonBuilder.selectEntity('treasure', treasure);
            } else {
                gameManager.addLog('DPが不足しています', 'warning');
            }
        };
        container.appendChild(item);
    });
}