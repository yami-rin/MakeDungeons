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
            // コア配置時も元のタイプを記録（dungeonBuilderが存在する場合）
            if (typeof dungeonBuilder !== 'undefined' && dungeonBuilder.specialTileUnderlay) {
                const coreKey = `1-${core.x}-${core.y}`;
                dungeonBuilder.specialTileUnderlay[coreKey] = floor1.grid[core.y][core.x].type;
            }
            floor1.grid[core.y][core.x].type = 'core';
            // entityフィールドは使用しない（バグの原因）
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

        // セーブデータから特殊タイルの位置を特定し、underlayを復元
        this.restoreSpecialTileUnderlays();
    }

    restoreSpecialTileUnderlays() {
        // dungeonBuilderが存在しない場合は何もしない
        if (typeof dungeonBuilder === 'undefined' || !dungeonBuilder.specialTileUnderlay) {
            return;
        }

        // 既存のunderlayをクリア
        dungeonBuilder.specialTileUnderlay = {};

        // 各フロアをチェックして特殊タイルの位置を記録
        // (壁の上にある特殊タイルは壁として記録、それ以外は床として記録)
        this.floors.forEach((floor, index) => {
            const floorNumber = index + 1;
            for (let y = 0; y < floor.height; y++) {
                for (let x = 0; x < floor.width; x++) {
                    const tileType = floor.grid[y][x].type;
                    if (tileType === 'core' || tileType === 'entrance' || tileType === 'stairs') {
                        const key = `${floorNumber}-${x}-${y}`;
                        // デフォルトは床として記録（実際の下のタイプは不明なので）
                        dungeonBuilder.specialTileUnderlay[key] = 'floor';
                    }
                }
            }
        });
    }
}

class Floor {
    constructor(floorNumber) {
        this.floorNumber = floorNumber;
        this.width = 10;
        this.height = 10;
        this.grid = this.createEmptyGrid();
        this.rooms = [];
        this.wallTracker = {};  // 壁の状態を追跡
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

        // 特殊タイルの初期配置時も元のタイプを記録（dungeonBuilderが存在する場合）
        if (typeof dungeonBuilder !== 'undefined' && dungeonBuilder.specialTileUnderlay) {
            const entranceKey = `${this.floorNumber}-5-1`;
            const stairsKey = `${this.floorNumber}-5-8`;
            dungeonBuilder.specialTileUnderlay[entranceKey] = this.grid[1][5].type;
            dungeonBuilder.specialTileUnderlay[stairsKey] = this.grid[8][5].type;
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
        this.wallMode = false;  // 壁作成モード
        this.destroyMode = false;  // 壁破壊モード
        this.wallCost = 10;  // 壁作成・破壊の共有価格
        this.specialTileUnderlay = {};  // 特殊タイルの下にある元のタイルタイプを記録
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

    createWall() {
        // モードを切り替え
        this.wallMode = true;
        this.destroyMode = false;
        this.placementMode = false;
        this.moveMode = false;
        gameManager.addLog(`壁を作るモード。床をクリックしてください（${Math.max(0, this.wallCost)}DP）`, 'info');
    }

    destroyWall() {
        // モードを切り替え
        this.wallMode = false;
        this.destroyMode = true;
        this.placementMode = false;
        this.moveMode = false;
        gameManager.addLog(`壁を壊すモード。壁をクリックしてください（${this.wallCost}DP）`, 'info');
    }

    updateWallCost() {
        // 価格表示を更新
        const wallCostElement = document.getElementById('wallCost');
        const expandCostElement = document.getElementById('expandCost');
        if (wallCostElement) wallCostElement.textContent = `DP: ${Math.max(0, this.wallCost)}`;
        if (expandCostElement) expandCostElement.textContent = `DP: ${this.wallCost}`;
    }

    selectEntity(entityType, entity) {
        this.selectedEntity = { type: entityType, data: entity };
        this.placementMode = true;
        this.wallMode = false;
        this.destroyMode = false;
        this.moveMode = false;
        gameManager.addLog(`${entity.name}を選択しました。配置する場所をクリックしてください`, 'info');
    }

    placeEntityAt(x, y) {
        const floor = gameManager.dungeonData.getFloor(dungeonViewer.currentFloor);
        const tileX = Math.floor(x / dungeonViewer.tileSize);
        const tileY = Math.floor(y / dungeonViewer.tileSize);

        if (!floor.isValidPosition(tileX, tileY)) return false;

        const tile = floor.grid[tileY][tileX];

        // 壁作成モードの場合
        if (this.wallMode) {
            if (tile.type === 'floor' && !tile.entity) {
                const cost = Math.max(0, this.wallCost);
                if (gameManager.spendDP(cost)) {
                    tile.type = 'wall';
                    this.wallCost = Math.max(0, this.wallCost - 10);
                    this.updateWallCost();
                    gameManager.addLog('壁を作成しました', 'success');
                    dungeonViewer.render();
                    return true;
                } else {
                    gameManager.addLog('DPが不足しています', 'warning');
                }
            } else {
                gameManager.addLog('その場所には壁を作成できません', 'warning');
            }
            return false;
        }

        // 壁破壊モードの場合
        if (this.destroyMode) {
            if (tile.type === 'wall') {
                if (gameManager.spendDP(this.wallCost)) {
                    tile.type = 'floor';
                    this.wallCost += 10;
                    this.updateWallCost();
                    gameManager.addLog('壁を破壊しました', 'success');
                    dungeonViewer.render();
                    return true;
                } else {
                    gameManager.addLog('DPが不足しています', 'warning');
                }
            } else {
                gameManager.addLog('壁ではありません', 'warning');
            }
            return false;
        }

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
            this.movingFrom = { x, y, type: 'entity', floor: dungeonViewer.currentFloor, originalTileType: tile.type };
            gameManager.addLog(`${tile.entity.name || tile.entity.type}を移動中... 新しい場所をクリックしてください`, 'info');
        } else if (tile.type === 'core' || tile.type === 'entrance' || tile.type === 'stairs') {
            // 特殊タイル
            this.moveMode = true;
            this.movingEntity = { type: tile.type };
            this.movingFrom = { x, y, type: 'special', floor: dungeonViewer.currentFloor };
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
        const currentFloor = gameManager.dungeonData.getFloor(dungeonViewer.currentFloor);
        const oldFloor = gameManager.dungeonData.getFloor(this.movingFrom.floor);

        if (!currentFloor.isValidPosition(newX, newY)) {
            gameManager.addLog('その場所には移動できません', 'warning');
            return false;
        }

        const targetTile = currentFloor.grid[newY][newX];

        // 移動先に何かある場合は移動できない
        if (targetTile.entity || targetTile.type === 'core' || targetTile.type === 'entrance' || targetTile.type === 'stairs') {
            gameManager.addLog('その場所には既に何かがあります', 'warning');
            return false;
        }

        // 移動先が壁の場合、通常のエンティティは移動できないが、特殊タイルは配置可能
        if (targetTile.type === 'wall' && this.movingFrom.type === 'entity') {
            gameManager.addLog('壁には配置できません', 'warning');
            return false;
        }

        // 移動実行
        if (this.movingFrom.type === 'entity') {
            // 通常エンティティの移動
            // 元のフロアから削除
            const oldTile = oldFloor.grid[this.movingFrom.y][this.movingFrom.x];
            oldTile.entity = null;

            // 新しいフロアに配置
            currentFloor.placeEntity(this.movingEntity, newX, newY);

            // フロアが異なる場合はログを出力
            if (this.movingFrom.floor !== dungeonViewer.currentFloor) {
                gameManager.addLog(`${this.movingFrom.floor}階から${dungeonViewer.currentFloor}階へ移動しました`, 'info');
            }
            gameManager.addLog('移動完了しました', 'success');
        } else if (this.movingFrom.type === 'special') {
            // 特殊タイルの移動
            const oldTile = oldFloor.grid[this.movingFrom.y][this.movingFrom.x];
            const specialType = this.movingEntity.type;
            const oldKey = `${this.movingFrom.floor}-${this.movingFrom.x}-${this.movingFrom.y}`;
            const newKey = `${dungeonViewer.currentFloor}-${newX}-${newY}`;

            // 元の場所のタイルタイプを復元
            if (this.specialTileUnderlay[oldKey]) {
                oldTile.type = this.specialTileUnderlay[oldKey];
                delete this.specialTileUnderlay[oldKey];
            } else {
                // 記録がない場合はデフォルトで床に
                oldTile.type = 'floor';
            }
            oldTile.entity = null;

            // 新しい場所の元のタイプを記録してから特殊タイルを配置
            this.specialTileUnderlay[newKey] = targetTile.type;
            targetTile.type = specialType;

            // コアの場合は位置も更新（1階のみ）
            if (specialType === 'core' && gameManager.dungeonCore && dungeonViewer.currentFloor === 1) {
                gameManager.dungeonCore.x = newX;
                gameManager.dungeonCore.y = newY;
            }

            // フロアが異なる場合はログを出力
            if (this.movingFrom.floor !== dungeonViewer.currentFloor) {
                gameManager.addLog(`${this.movingFrom.floor}階から${dungeonViewer.currentFloor}階へ移動しました`, 'info');
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