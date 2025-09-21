class Monster {
    constructor(name, level, cost, isBoss = false) {
        this.name = name;
        this.level = level;
        this.cost = cost;
        this.isBoss = isBoss;
        this.hp = isBoss ? level * 30 : level * 10;
        this.maxHp = this.hp;
        this.attack = isBoss ? level * 5 : level * 3;
        this.defense = isBoss ? level * 4 : level * 2;
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
            // 5秒後に罠が再度使用可能になる
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
        this.speed = 2;  // 大幅に減速（1マスずつ移動）
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
        this.currentFloor = 1; // 現在いる階層
    }

    update(deltaTime) {
        if (this.isDead || this.hasEscaped) return;

        // ダンジョンデータの取得（現在の階層）
        const floor = gameManager.dungeonData?.getFloor(this.currentFloor);
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

        // 入口での脱出判定（HP半分以下または宝箱所持時のみ、1階のみ）
        const currentTile = floor.grid[Math.floor(this.y)][Math.floor(this.x)];
        if (currentTile.type === 'entrance' && this.currentFloor === 1) {
            // HPが半分以下または宝箱を持っている場合のみ脱出
            if (this.hp <= this.maxHp / 2 || this.treasureCollected > 0) {
                this.hasEscaped = true;
                // 宝箱を持っている場合は評判を追加
                if (this.treasureCollected > 0) {
                    const reputationGain = Math.floor(this.treasureCollected / 50);
                    if (reputationGain > 0) {
                        gameManager.reputation += reputationGain;
                        gameManager.addLog(`${this.name}が宝物を持って脱出！評判+${reputationGain}`, 'success');
                        gameManager.updateUI();
                    } else {
                        gameManager.addLog(`${this.name}が入口から脱出した！`, 'warning');
                    }
                } else {
                    gameManager.addLog(`${this.name}がHPが少ないため撤退した！`, 'warning');
                }
            }
        } else if (currentTile.type === 'stairs') {
            // 階段に到達したら次の階へ移動（勇者のみ）
            if (this.name.includes('勇者') && this.currentFloor < gameManager.dungeonData.floors.length) {
                this.currentFloor++;
                // 次の階の階段位置にワープ
                const nextFloor = gameManager.dungeonData?.getFloor(this.currentFloor);
                if (nextFloor) {
                    // 入口を探す
                    for (let y = 0; y < nextFloor.height; y++) {
                        for (let x = 0; x < nextFloor.width; x++) {
                            if (nextFloor.grid[y][x].type === 'entrance') {
                                this.x = x;
                                this.y = y;
                                this.targetX = x;
                                this.targetY = y;
                                gameManager.addLog(`${this.name}が${this.currentFloor}階へ移動した！`, 'info');
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    decideNextMove(floor) {
        const currentX = Math.floor(this.x);
        const currentY = Math.floor(this.y);

        // 脱出モードの場合、入口を目指す（HP半分以下または宝箱所持）
        if (this.escapeMode || this.hp <= this.maxHp / 2) {
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

        // 3. 道なりに進む（分岐点では30%の確率でランダムに方向転換）
        const availableDirections = this.getAvailableDirections(floor, currentX, currentY);

        // 分岐点（2方向以上進める）でランダム移動
        if (availableDirections.length >= 2 && Math.random() < 0.3) {
            // 前回とは違う方向をランダムに選択
            const validDirs = availableDirections.filter(dir => {
                return !(this.lastMove && dir.x === this.lastMove.x && dir.y === this.lastMove.y);
            });

            if (validDirs.length > 0) {
                const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)];
                this.setTarget(randomDir.x, randomDir.y);
                this.updateDirection(currentX, currentY, randomDir.x, randomDir.y);
                this.lastMove = { x: currentX, y: currentY };
                return;
            }
        }

        // 通常の道なり移動
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
        // A*風の経路探索アルゴリズム（簡易版）
        const visited = new Set();
        const queue = [{ x: startX, y: startY, dist: 0 }];
        const parent = {};
        const key = (x, y) => `${x},${y}`;

        visited.add(key(startX, startY));

        while (queue.length > 0) {
            // マンハッタン距離でソート
            queue.sort((a, b) => {
                const aDist = Math.abs(a.x - targetX) + Math.abs(a.y - targetY) + a.dist;
                const bDist = Math.abs(b.x - targetX) + Math.abs(b.y - targetY) + b.dist;
                return aDist - bDist;
            });

            const current = queue.shift();

            // 目標に到達
            if (current.x === targetX && current.y === targetY) {
                // 経路を遡って最初の一歩を返す
                let step = current;
                while (parent[key(step.x, step.y)]) {
                    const prev = parent[key(step.x, step.y)];
                    if (prev.x === startX && prev.y === startY) {
                        this.updateDirection(startX, startY, step.x, step.y);
                        return { x: step.x, y: step.y };
                    }
                    step = prev;
                }
            }

            // 隣接マスを探索
            const directions = [
                { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
            ];

            for (let dir of directions) {
                const nextX = current.x + dir.dx;
                const nextY = current.y + dir.dy;
                const nextKey = key(nextX, nextY);

                if (!visited.has(nextKey) && this.canMoveTo(floor, nextX, nextY)) {
                    visited.add(nextKey);
                    parent[nextKey] = current;
                    queue.push({ x: nextX, y: nextY, dist: current.dist + 1 });
                }
            }
        }

        // 経路が見つからない場合は通常の移動
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

                // HPが0以下になったら死亡
                if (this.hp <= 0) {
                    this.hp = 0;
                    this.isDead = true;
                    gameManager.addLog(`${this.name}が罠で倒された！`, 'success');
                }
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

        // ダメージエフェクトを表示
        const floor = gameManager.dungeonData?.getFloor(this.currentFloor);
        if (floor && dungeonViewer.currentFloor === this.currentFloor) {
            for (let y = 0; y < floor.height; y++) {
                for (let x = 0; x < floor.width; x++) {
                    if (floor.grid[y][x].entity === monster) {
                        dungeonViewer.addEffect('damage', x, y, `-${damage}`, '#ff4444');
                        break;
                    }
                }
            }
        }

        if (monster.hp <= 0) {
            gameManager.addLog(`${monster.name}を倒した！`, 'success');
            // モンスターを削除
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

            // 冒険者へのダメージエフェクト
            if (dungeonViewer.currentFloor === this.currentFloor) {
                dungeonViewer.addEffect('damage', Math.floor(this.x), Math.floor(this.y), `-${counterDamage}`, '#ffaa00');
            }
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

    getAvailableDirections(floor, x, y) {
        const directions = [];
        const checks = [
            { dx: 0, dy: -1, dir: 'up' },
            { dx: 0, dy: 1, dir: 'down' },
            { dx: -1, dy: 0, dir: 'left' },
            { dx: 1, dy: 0, dir: 'right' }
        ];

        for (let check of checks) {
            const nextX = x + check.dx;
            const nextY = y + check.dy;
            if (this.canMoveTo(floor, nextX, nextY)) {
                directions.push({ x: nextX, y: nextY, dir: check.dir });
            }
        }

        return directions;
    }

    updateDirection(currentX, currentY, targetX, targetY) {
        const dx = targetX - currentX;
        const dy = targetY - currentY;

        if (dx > 0) this.direction = 'right';
        else if (dx < 0) this.direction = 'left';
        else if (dy > 0) this.direction = 'down';
        else if (dy < 0) this.direction = 'up';
    }
}

const monsterTemplates = [
    { name: 'スライム', level: 1, cost: 50 },
    { name: 'ゴブリン', level: 2, cost: 100 },
    { name: 'オーク', level: 3, cost: 200 },
    { name: 'トロール', level: 4, cost: 400 },
    { name: 'ドラゴン', level: 5, cost: 800 },
    { name: 'リッチ', level: 6, cost: 1500, isBoss: true },
    { name: '魔王', level: 10, cost: 5000, isBoss: true }
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
        item.className = template.isBoss ? 'entity-item boss-item' : 'entity-item';
        const attack = template.isBoss ? template.level * 5 : template.level * 3;
        const defense = template.isBoss ? template.level * 4 : template.level * 2;
        const hp = template.isBoss ? template.level * 30 : template.level * 10;
        item.innerHTML = `
            <div class="entity-info">
                <div class="entity-name">${template.isBoss ? '👑 ' : ''}${template.name}</div>
                <div class="entity-stats">Lv.${template.level} HP:${hp} 攻撃:${attack} 防御:${defense}</div>
            </div>
            <div class="entity-cost">DP: ${template.cost}</div>
        `;
        item.onclick = () => {
            if (gameManager.spendDP(template.cost)) {
                const monster = new Monster(template.name, template.level, template.cost, template.isBoss);
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