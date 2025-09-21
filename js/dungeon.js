class DungeonData {
    constructor() {
        this.floors = [new Floor(1)];
        this.monsters = [];
        this.traps = [];
        this.treasures = [];
        this.dungeonCore = null;
    }

    initializeDungeonCore() {
        const core = {
            x: 5,
            y: 5,
            hp: 100,
            maxHp: 100,
            type: 'core'
        };

        const floor1 = this.getFloor(1);
        if (floor1) {
            floor1.grid[core.y][core.x].type = 'core';
            floor1.grid[core.y][core.x].entity = core;
        }

        this.dungeonCore = core;
        return core;
    }

    addFloor() {
        const newFloorNumber = this.floors.length + 1;
        this.floors.push(new Floor(newFloorNumber));
        return newFloorNumber;
    }

    getFloor(floorNumber) {
        return this.floors[floorNumber - 1];
    }

    placeEntity(floorNumber, entity, x, y) {
        const floor = this.getFloor(floorNumber);
        if (floor) {
            floor.placeEntity(entity, x, y);
            return true;
        }
        return false;
    }

    removeEntity(floorNumber, x, y) {
        const floor = this.getFloor(floorNumber);
        if (floor) {
            floor.removeEntity(x, y);
            return true;
        }
        return false;
    }

    getSaveData() {
        return {
            floors: this.floors.map(floor => floor.getSaveData()),
            monsters: this.monsters,
            traps: this.traps,
            treasures: this.treasures,
            dungeonCore: this.dungeonCore
        };
    }

    loadFromSave(saveData) {
        this.floors = saveData.floors.map((floorData, index) => {
            const floor = new Floor(index + 1);
            floor.loadFromSave(floorData);
            return floor;
        });
        this.monsters = saveData.monsters;
        this.traps = saveData.traps;
        this.treasures = saveData.treasures;
        this.dungeonCore = saveData.dungeonCore || this.initializeDungeonCore();
    }
}

class Floor {
    constructor(floorNumber) {
        this.floorNumber = floorNumber;
        this.width = 10;
        this.height = 10;
        this.grid = this.createEmptyGrid();
        this.rooms = [];
        this.generateBasicLayout();
    }

    createEmptyGrid() {
        const grid = [];
        for (let y = 0; y < this.height; y++) {
            grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                grid[y][x] = {
                    type: 'wall',
                    entity: null
                };
            }
        }
        return grid;
    }

    generateBasicLayout() {
        const mainRoom = {
            x: 2,
            y: 2,
            width: 6,
            height: 6
        };
        this.rooms.push(mainRoom);

        for (let y = mainRoom.y; y < mainRoom.y + mainRoom.height; y++) {
            for (let x = mainRoom.x; x < mainRoom.x + mainRoom.width; x++) {
                this.grid[y][x].type = 'floor';
            }
        }

        this.grid[1][5].type = 'entrance';
        this.grid[8][5].type = 'stairs';
    }

    placeEntity(entity, x, y) {
        if (this.isValidPosition(x, y) && this.grid[y][x].type === 'floor') {
            this.grid[y][x].entity = entity;
            return true;
        }
        return false;
    }

    removeEntity(x, y) {
        if (this.isValidPosition(x, y)) {
            this.grid[y][x].entity = null;
            return true;
        }
        return false;
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    expandRoom() {
        const room = {
            x: Math.floor(Math.random() * 5),
            y: Math.floor(Math.random() * 5),
            width: 3 + Math.floor(Math.random() * 3),
            height: 3 + Math.floor(Math.random() * 3)
        };

        for (let y = room.y; y < Math.min(room.y + room.height, this.height); y++) {
            for (let x = room.x; x < Math.min(room.x + room.width, this.width); x++) {
                if (this.grid[y][x].type === 'wall') {
                    this.grid[y][x].type = 'floor';
                }
            }
        }

        this.rooms.push(room);
    }

    getSaveData() {
        return {
            floorNumber: this.floorNumber,
            width: this.width,
            height: this.height,
            grid: this.grid,
            rooms: this.rooms
        };
    }

    loadFromSave(saveData) {
        this.floorNumber = saveData.floorNumber;
        this.width = saveData.width;
        this.height = saveData.height;
        this.grid = saveData.grid;
        this.rooms = saveData.rooms;
    }
}

class DungeonBuilder {
    constructor() {
        this.selectedEntity = null;
        this.placementMode = false;
        this.moveMode = false;
        this.movingEntity = null;
        this.movingFrom = null;
    }

    addFloor() {
        if (gameManager.spendDP(1000)) {
            const newFloor = gameManager.dungeonData.addFloor();
            gameManager.floor = gameManager.dungeonData.floors.length;
            gameManager.updateUI();
            gameManager.addLog(`${newFloor}階を追加しました！`, 'success');
            dungeonViewer.currentFloor = newFloor;
            dungeonViewer.render();
        } else {
            gameManager.addLog('DPが不足しています', 'warning');
        }
    }

    expandRoom() {
        if (gameManager.spendDP(500)) {
            const floor = gameManager.dungeonData.getFloor(dungeonViewer.currentFloor);
            floor.expandRoom();
            gameManager.addLog('部屋を拡張しました！', 'success');
            dungeonViewer.render();
        } else {
            gameManager.addLog('DPが不足しています', 'warning');
        }
    }

    selectEntity(entityType, entity) {
        this.selectedEntity = { type: entityType, data: entity };
        this.placementMode = true;
        gameManager.addLog(`${entity.name}を選択しました。配置する場所をクリックしてください`, 'info');
    }

    placeEntityAt(x, y) {
        const floor = gameManager.dungeonData.getFloor(dungeonViewer.currentFloor);
        const tileX = Math.floor(x / dungeonViewer.tileSize);
        const tileY = Math.floor(y / dungeonViewer.tileSize);

        // 移動モードの場合
        if (this.moveMode && this.movingEntity) {
            if (this.completeMoveEntity(tileX, tileY)) {
                return true;
            }
            return false;
        }

        // 配置モードの場合
        if (this.selectedEntity && this.placementMode) {
            if (floor.placeEntity(this.selectedEntity.data, tileX, tileY)) {
                gameManager.addLog(`${this.selectedEntity.data.name}を配置しました`, 'success');
                this.placementMode = false;
                this.selectedEntity = null;
                dungeonViewer.render();
                return true;
            } else {
                gameManager.addLog('その場所には配置できません', 'warning');
                return false;
            }
        }

        // 既存エンティティをクリックした場合（移動開始）
        const tile = floor.grid[tileY][tileX];
        if (tile && (tile.entity || tile.type === 'core' || tile.type === 'entrance' || tile.type === 'stairs')) {
            this.startMoveEntity(tileX, tileY, tile);
            return true;
        }

        return false;
    }

    startMoveEntity(x, y, tile) {
        const floor = gameManager.dungeonData.getFloor(dungeonViewer.currentFloor);

        if (tile.entity) {
            // 通常のエンティティ（モンスター、罠、宝箱）
            this.moveMode = true;
            this.movingEntity = tile.entity;
            this.movingFrom = { x, y, type: 'entity' };
            gameManager.addLog(`${tile.entity.name || tile.entity.type}を移動中... 新しい場所をクリックしてください`, 'info');
        } else if (tile.type === 'core' || tile.type === 'entrance' || tile.type === 'stairs') {
            // 特殊タイル
            this.moveMode = true;
            this.movingEntity = { type: tile.type };
            this.movingFrom = { x, y, type: 'special' };
            const nameMap = {
                'core': 'ダンジョンコア',
                'entrance': '入口',
                'stairs': '階段'
            };
            gameManager.addLog(`${nameMap[tile.type]}を移動中... 新しい場所をクリックしてください`, 'info');
        }

        dungeonViewer.render();
    }

    completeMoveEntity(newX, newY) {
        const floor = gameManager.dungeonData.getFloor(dungeonViewer.currentFloor);

        if (!floor.isValidPosition(newX, newY)) {
            gameManager.addLog('その場所には移動できません', 'warning');
            return false;
        }

        const targetTile = floor.grid[newY][newX];

        // 移動先に何かある場合は移動できない
        if (targetTile.entity || targetTile.type === 'core' || targetTile.type === 'entrance' || targetTile.type === 'stairs') {
            gameManager.addLog('その場所には既に何かがあります', 'warning');
            return false;
        }

        // 移動先が壁の場合は移動できない
        if (targetTile.type === 'wall') {
            gameManager.addLog('壁には配置できません', 'warning');
            return false;
        }

        // 移動実行
        if (this.movingFrom.type === 'entity') {
            // 通常エンティティの移動
            floor.removeEntity(this.movingFrom.x, this.movingFrom.y);
            floor.placeEntity(this.movingEntity, newX, newY);
            gameManager.addLog('移動完了しました', 'success');
        } else if (this.movingFrom.type === 'special') {
            // 特殊タイルの移動
            const oldTile = floor.grid[this.movingFrom.y][this.movingFrom.x];
            const specialType = this.movingEntity.type;

            // 元の場所を通常の床にする
            oldTile.type = 'floor';
            oldTile.entity = null;

            // 新しい場所に特殊タイルを配置
            targetTile.type = specialType;

            // コアの場合は位置も更新
            if (specialType === 'core' && gameManager.dungeonCore) {
                gameManager.dungeonCore.x = newX;
                gameManager.dungeonCore.y = newY;
                targetTile.entity = gameManager.dungeonCore;
            }

            gameManager.addLog('移動完了しました', 'success');
        }

        // 移動モードを解除
        this.moveMode = false;
        this.movingEntity = null;
        this.movingFrom = null;

        dungeonViewer.render();
        return true;
    }
}

const dungeonBuilder = new DungeonBuilder();