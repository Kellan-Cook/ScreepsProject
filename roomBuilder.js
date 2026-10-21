/**
 * @file This module contains logic for automated road and container placement based on room needs.
 * @author Kellan Cook
 * @version 0.3
 */

var roomBuilder = {
  /**
   * This function is the main entry point for the room builder logic. It is called for each spawner in the game.
   * @param {StructureSpawn} spawner - The spawner to run the logic for.
   */
  run: function (spawner) {
    if (!spawner || !spawner.room || !spawner.memory.roomsources) return;

    // Loop through all sources in the room
    for (const source of spawner.memory.roomsources) {
      const sourceObject = Game.getObjectById(source.id);
      if (!sourceObject) continue;

      // Find path from spawner to source and create road construction sites (omit the source tile itself)
      const path = spawner.pos.findPathTo(sourceObject, {
        ignoreCreeps: true,
      });
      for (let i = 0; i < path.length; i++) {
        const position = path[i];
        // Do not place road on the exact source tile
        if (
          position.x !== sourceObject.pos.x ||
          position.y !== sourceObject.pos.y
        ) {
          spawner.room.createConstructionSite(
            position.x,
            position.y,
            STRUCTURE_ROAD
          );
        }
      }

      // Find existing containers and container construction sites near the source
      var containers = sourceObject.pos.findInRange(FIND_STRUCTURES, 2, {
        filter: {
          structureType: STRUCTURE_CONTAINER,
        },
      });
      var constructionSites = sourceObject.pos.findInRange(
        FIND_CONSTRUCTION_SITES,
        2,
        {
          filter: {
            structureType: STRUCTURE_CONTAINER,
          },
        }
      );

      // If no containers or construction sites exist, find a suitable location and create a container construction site
      if (containers.length === 0 && constructionSites.length === 0) {
        let positions = [];
        // Scan area around the source for suitable container locations (at range 1 from source so harvesters can stand on it)
        for (let x = sourceObject.pos.x - 1; x <= sourceObject.pos.x + 1; x++) {
          for (let y = sourceObject.pos.y - 1; y <= sourceObject.pos.y + 1; y++) {
            // Must be walkable, empty, and adjacent (range 1) to the source
            if (
              x >= 0 &&
              x <= 49 &&
              y >= 0 &&
              y <= 49 &&
              !(x === sourceObject.pos.x && y === sourceObject.pos.y) &&
              spawner.room.getTerrain().get(x, y) !== TERRAIN_MASK_WALL &&
              spawner.room.lookForAt(LOOK_STRUCTURES, x, y).length === 0 &&
              spawner.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length === 0
            ) {
              positions.push(new RoomPosition(x, y, spawner.room.name));
            }
          }
        }

        // If suitable locations are found, choose the best one (prefer adjacent to a road if possible)
        if (positions.length > 0) {
          let pos = positions[0];
          for (let p = 0; p < positions.length; p++) {
            let roads = positions[p].findInRange(FIND_STRUCTURES, 1, {
              filter: { structureType: STRUCTURE_ROAD },
            });
            if (roads.length > 0) {
              pos = positions[p];
              break;
            }
          }
          spawner.room.createConstructionSite(pos, STRUCTURE_CONTAINER);
        }
      }
    }
  },
};

module.exports = roomBuilder;
