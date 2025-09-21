class DungeonViewer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentFloor = 1;
        this.tileSize = 60;
        this.colors = {
            wall: '#2a2a3e',
            floor: '#4a4a6a',
            entrance: '#4ade80',
            stairs: '#fbbf24',
            monster: '#f87171',
            trap: '#a78bfa',
            treasure: '#fbbf24',
            adventurer: '#60a5fa',
            selected: '#ffffff',
            core: '#ff1744'
        };
        this.effects = [];  // ビジュアルエフェクト用
        this.lastTime = Date.now();
    }

    init() {
        this.canvas = document.getElementById('dungeonCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            dungeonBuilder.placeEntityAt(x, y);
        });

        this.render();
    }

    render() {
        if (!this.ctx || !gameManager.dungeonData) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const floor = gameManager.dungeonData.getFloor(this.currentFloor);
        if (!floor) return;

        for (let y = 0; y < floor.height; y++) {
            for (let x = 0; x < floor.width; x++) {
                const tile = floor.grid[y][x];
                this.drawTile(x, y, tile);
            }
        }

        // 現在の階層にいる冒険者のみを表示
        gameManager.adventurers.forEach(adventurer => {
            if (adventurer.currentFloor === this.currentFloor) {
                this.drawAdventurer(adventurer);
            }
        });

        // エフェクトの描画
        this.updateAndDrawEffects();

        document.getElementById('currentFloor').textContent = `${this.currentFloor}F`;
    }

    drawTile(x, y, tile) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;

        this.ctx.fillStyle = this.colors[tile.type];
        this.ctx.fillRect(px, py, this.tileSize, this.tileSize);

        // 移動モードの場合、選択中のタイルをハイライト
        if (dungeonBuilder.moveMode && dungeonBuilder.movingFrom &&
            dungeonBuilder.movingFrom.x === x && dungeonBuilder.movingFrom.y === y) {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
            this.ctx.lineWidth = 1;
        } else {
            this.ctx.strokeStyle = '#1a1a2e';
            this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        }

        if (tile.type === 'entrance') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('入', px + this.tileSize / 2, py + this.tileSize / 2);
        } else if (tile.type === 'stairs') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('階', px + this.tileSize / 2, py + this.tileSize / 2);
        } else if (tile.type === 'core') {
            this.ctx.fillStyle = this.colors.core;
            this.ctx.fillRect(px + 5, py + 5, this.tileSize - 10, this.tileSize - 10);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('CORE', px + this.tileSize / 2, py + this.tileSize / 2);
        }

        if (tile.entity) {
            this.drawEntity(px, py, tile.entity);
        }
    }

    drawEntity(x, y, entity) {
        const centerX = x + this.tileSize / 2;
        const centerY = y + this.tileSize / 2;
        const radius = this.tileSize / 3;

        // エンティティの背景円
        this.ctx.fillStyle = this.colors[entity.type];
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // エンティティの詳細表示
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        if (entity.type === 'monster') {
            // モンスターの表示
            const shortName = entity.name.substring(0, 3);
            this.ctx.fillText(shortName, centerX, centerY - 5);
            this.ctx.font = '9px sans-serif';
            this.ctx.fillText(`Lv${entity.level}`, centerX, centerY + 7);
        } else if (entity.type === 'trap') {
            // 罠の表示
            this.ctx.font = '16px sans-serif';
            this.ctx.fillText('⚠', centerX, centerY - 3);
            this.ctx.font = '8px sans-serif';
            this.ctx.fillText(`${entity.damage}`, centerX, centerY + 8);
        } else if (entity.type === 'treasure') {
            // 宝箱の表示
            if (!entity.collected) {
                this.ctx.font = '16px sans-serif';
                this.ctx.fillText('📦', centerX, centerY - 3);
                this.ctx.font = '8px sans-serif';
                this.ctx.fillText(`${entity.value}G`, centerX, centerY + 8);
            } else {
                // 収集済みの宝箱
                this.ctx.fillStyle = '#666666';
                this.ctx.font = '12px sans-serif';
                this.ctx.fillText('✗', centerX, centerY);
            }
        }
    }

    drawAdventurer(adventurer) {
        const x = adventurer.x * this.tileSize + this.tileSize / 2;
        const y = adventurer.y * this.tileSize + this.tileSize / 2;
        const radius = this.tileSize / 4;

        this.ctx.fillStyle = this.colors.adventurer;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('A', x, y);

        const hpRatio = adventurer.hp / adventurer.maxHp;
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(x - radius, y - radius - 10, radius * 2, 4);
        this.ctx.fillStyle = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#fbbf24' : '#f87171';
        this.ctx.fillRect(x - radius, y - radius - 10, radius * 2 * hpRatio, 4);
    }

    nextFloor() {
        if (this.currentFloor < gameManager.dungeonData.floors.length) {
            this.currentFloor++;
            this.render();
        }
    }

    previousFloor() {
        if (this.currentFloor > 1) {
            this.currentFloor--;
            this.render();
        }
    }

    addEffect(type, x, y, text, color) {
        this.effects.push({
            type: type,
            x: x * this.tileSize + this.tileSize / 2,
            y: y * this.tileSize + this.tileSize / 2,
            text: text,
            color: color,
            alpha: 1.0,
            offsetY: 0,
            lifetime: 1000  // 1秒間表示
        });
    }

    updateAndDrawEffects() {
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // エフェクトの更新と描画
        this.effects = this.effects.filter(effect => {
            effect.lifetime -= deltaTime;
            if (effect.lifetime <= 0) return false;

            // 上に浮かび上がるアニメーション
            effect.offsetY -= deltaTime * 0.03;
            effect.alpha = effect.lifetime / 1000;

            // エフェクトの描画
            this.ctx.save();
            this.ctx.globalAlpha = effect.alpha;
            this.ctx.fillStyle = effect.color;
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(effect.text, effect.x, effect.y + effect.offsetY);
            this.ctx.restore();

            return true;
        });
    }
}

const dungeonViewer = new DungeonViewer();

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = {
        'build': document.getElementById('buildTab'),
        'monsters': document.getElementById('monstersTab'),
        'traps': document.getElementById('trapsTab'),
        'treasures': document.getElementById('treasuresTab'),
        'help': document.getElementById('helpTab')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            Object.values(contents).forEach(content => {
                content.style.display = 'none';
            });

            const targetTab = tab.dataset.tab;
            if (contents[targetTab]) {
                contents[targetTab].style.display = 'block';
            }

            if (targetTab === 'monsters') {
                createMonsterList();
            } else if (targetTab === 'traps') {
                createTrapList();
            } else if (targetTab === 'treasures') {
                createTreasureList();
            }
        });
    });
}