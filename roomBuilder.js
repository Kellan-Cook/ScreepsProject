/**
 * @file This module is intended to contain logic for dynamically building creeps based on the room's needs.
 * @author Kellan Cook
 * @version 0.2
 */

var roomBuilder = {


    /**
     * This function is the main entry point for the room builder logic. It is called for each spawner in the game.
     * @param {StructureSpawn} spawner - The spawner to run the logic for.
     */
    run: function (spawner) {

        // first should place the needed roads 
        for (const source of spawner.memory.roomsources) {
            const sourceObject = Game.getObjectById(source.id);
            if (sourceObject) {
                const path = spawner.pos.findPathTo(sourceObject);
                for (const position of path) {
                    spawner.room.createConstructionSite(position.x, position.y, STRUCTURE_ROAD);
                }
            }
        }



        this.createSourceContainers(spawner);
    },

    /**
     * Places a container as close as possible to each source, next to a road.
     * @param {StructureSpawn} spawner - The spawner to run the logic for.
     */
    createSourceContainers: function (spawner) {
        for (const source of spawner.memory.roomsources) {
            const sourceObject = Game.getObjectById(source.id);
            if (!sourceObject) continue;

            // 1. Identify all valid positions within Range 2 of the source
            let validPositions = [];
            const range = 2;
            const top = Math.max(0, sourceObject.pos.y - range);
            const left = Math.max(0, sourceObject.pos.x - range);
            const bottom = Math.min(49, sourceObject.pos.y + range);
            const right = Math.min(49, sourceObject.pos.x + range);

            for (let y = top; y <= bottom; y++) {
                for (let x = left; x <= right; x++) {
                    if (x === sourceObject.pos.x && y === sourceObject.pos.y) continue;

                    const pos = new RoomPosition(x, y, spawner.room.name);
                    const terrain = pos.lookFor(LOOK_TERRAIN)[0];
                    const structures = pos.lookFor(LOOK_STRUCTURES);
                    const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);

                    // Must be walkable (not wall) and completely empty of structures and construction sites
                    if (terrain !== 'wall' && structures.length === 0 && sites.length === 0) {
                        validPositions.push(pos);
                    }
                }
            }

            if (validPositions.length === 0) continue;

            let bestPos = null;

            // Helper to check if pos is near a road/site
            const isNearRoad = (pos) => {
                const nearbyStructures = pos.findInRange(FIND_STRUCTURES, 1);
                const nearbySites = pos.findInRange(FIND_CONSTRUCTION_SITES, 1);
                return nearbyStructures.some(s => s.structureType === STRUCTURE_ROAD) ||
                    nearbySites.some(s => s.structureType === STRUCTURE_ROAD);
            };

            // 2. Filter for positions adjacent to an existing road/blueprint
            const roadAdjacentPositions = validPositions.filter(p => isNearRoad(p));

            if (roadAdjacentPositions.length > 0) {
                // Sort by distance to source (ascending)
                roadAdjacentPositions.sort((a, b) => a.getRangeTo(sourceObject) - b.getRangeTo(sourceObject));
                bestPos = roadAdjacentPositions[0];
            }

            // 3. Fallback: Use pathfinding if no existing road found
            if (!bestPos) {
                const path = spawner.pos.findPathTo(sourceObject, { ignoreCreeps: true });
                if (path.length > 0) {
                    const pathPositions = path.map(step => new RoomPosition(step.x, step.y, spawner.room.name));

                    // Filter out positions that are ON the path (future roads)
                    const validOffPathPositions = validPositions.filter(pos => {
                        return !pathPositions.some(pathPos => pathPos.isEqualTo(pos));
                    });

                    const pathAdjacentPositions = validOffPathPositions.filter(pos => {
                        return pathPositions.some(pathPos => pos.isNearTo(pathPos));
                    });

                    if (pathAdjacentPositions.length > 0) {
                        pathAdjacentPositions.sort((a, b) => a.getRangeTo(sourceObject) - b.getRangeTo(sourceObject));
                        bestPos = pathAdjacentPositions[0];
                    }
                }
            }

            // 4. Place container if a good spot was found
            if (bestPos) {
                spawner.room.createConstructionSite(bestPos.x, bestPos.y, STRUCTURE_CONTAINER);
            }
        }
    }

};

module.exports = roomBuilder;