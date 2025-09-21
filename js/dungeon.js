class DungeonData {
    constructor() {
        this.floors = [new Floor(1)];
        this.monsters = [];
        this.traps = [];
        this.treasures = [];
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
            treasures: this.treasures
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
        if (!this.selectedEntity || !this.placementMode) return false;

        const floor = gameManager.dungeonData.getFloor(dungeonViewer.currentFloor);
        const tileX = Math.floor(x / dungeonViewer.tileSize);
        const tileY = Math.floor(y / dungeonViewer.tileSize);

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
}

const dungeonBuilder = new DungeonBuilder();