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
            selected: '#ffffff'
        };
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

        gameManager.adventurers.forEach(adventurer => {
            this.drawAdventurer(adventurer);
        });

        document.getElementById('currentFloor').textContent = `${this.currentFloor}F`;
    }

    drawTile(x, y, tile) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;

        this.ctx.fillStyle = this.colors[tile.type];
        this.ctx.fillRect(px, py, this.tileSize, this.tileSize);

        this.ctx.strokeStyle = '#1a1a2e';
        this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);

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
        }

        if (tile.entity) {
            this.drawEntity(px, py, tile.entity);
        }
    }

    drawEntity(x, y, entity) {
        const centerX = x + this.tileSize / 2;
        const centerY = y + this.tileSize / 2;
        const radius = this.tileSize / 3;

        this.ctx.fillStyle = this.colors[entity.type];
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let symbol = '';
        if (entity.type === 'monster') symbol = 'M';
        else if (entity.type === 'trap') symbol = 'T';
        else if (entity.type === 'treasure') symbol = '$';

        this.ctx.fillText(symbol, centerX, centerY);
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
}

const dungeonViewer = new DungeonViewer();

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = {
        'build': document.getElementById('buildTab'),
        'monsters': document.getElementById('monstersTab'),
        'traps': document.getElementById('trapsTab'),
        'treasures': document.getElementById('treasuresTab')
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