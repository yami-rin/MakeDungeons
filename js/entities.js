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
    }

    update(deltaTime) {
        if (this.isDead || this.hasEscaped) return;

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.1) {
            const moveDistance = this.speed * deltaTime;
            const ratio = Math.min(moveDistance / distance, 1);
            this.x += dx * ratio;
            this.y += dy * ratio;
        }

        if (this.hp <= 0) {
            this.isDead = true;
        }

        if (this.y >= 8) {
            this.hasEscaped = true;
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