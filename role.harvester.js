/**
 * @file This module contains the logic for the harvester creep role.
 * @author Kellan Cook
 * @version 1.1
 */

var roleHarvester = {
  /**
   * This function is the main entry point for the harvester creep logic. It is called for each harvester creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // If the creep is full and not already storing, switch to storing.
    if (creep.store.getFreeCapacity() == 0 && creep.memory.task !== "storing") {
      creep.memory.task = "storing";

      var targetsource = Game.getObjectById(creep.memory.roomsources);
      if (targetsource) {
        // Check for nearby containers and construction sites.
        var containers = targetsource.pos.findInRange(FIND_STRUCTURES, 2, {
          filter: { structureType: STRUCTURE_CONTAINER },
        });
        var constructionSites = targetsource.pos.findInRange(
          FIND_CONSTRUCTION_SITES,
          2,
          {
            filter: { structureType: STRUCTURE_CONTAINER },
          }
        );

        // If no containers or construction sites are found, create a new construction site adjacent to source.
        if (containers.length === 0 && constructionSites.length === 0) {
          let positions = [];
          for (
            let x = targetsource.pos.x - 1;
            x <= targetsource.pos.x + 1;
            x++
          ) {
            for (
              let y = targetsource.pos.y - 1;
              y <= targetsource.pos.y + 1;
              y++
            ) {
              if (
                x >= 1 &&
                x <= 48 &&
                y >= 1 &&
                y <= 48 &&
                !(x === targetsource.pos.x && y === targetsource.pos.y) &&
                creep.room.getTerrain().get(x, y) !== TERRAIN_MASK_WALL &&
                creep.room
                  .lookForAt(LOOK_STRUCTURES, x, y)
                  .every(
                    (s) =>
                      s.structureType === STRUCTURE_ROAD ||
                      s.structureType === STRUCTURE_RAMPART
                  ) &&
                creep.room
                  .lookForAt(LOOK_CONSTRUCTION_SITES, x, y)
                  .every((s) => s.structureType === STRUCTURE_ROAD)
              ) {
                positions.push(new RoomPosition(x, y, creep.room.name));
              }
            }
          }

          // Select a position from the valid positions, preferring existing roads/road blueprints.
          if (positions.length > 0) {
            let pos = positions[0];
            for (let p = 0; p < positions.length; p++) {
              let hasRoad =
                positions[p].findInRange(FIND_STRUCTURES, 1, {
                  filter: { structureType: STRUCTURE_ROAD },
                }).length > 0;
              let hasBlueprint =
                positions[p].findInRange(FIND_CONSTRUCTION_SITES, 1, {
                  filter: { structureType: STRUCTURE_ROAD },
                }).length > 0;
              if (hasRoad || hasBlueprint) {
                pos = positions[p];
                break;
              }
            }
            creep.room.createConstructionSite(pos, STRUCTURE_CONTAINER);
          }
        }
      }
    }

    // If the creep is empty, it should switch to harvesting.
    if (creep.store.getUsedCapacity() == 0) {
      creep.memory.task = "harvesting";
    }

    // If the creep is harvesting, it should move to the source and harvest it.
    if (creep.memory.task == "harvesting") {
      var harvestSource = Game.getObjectById(creep.memory.roomsources);
      if (!harvestSource) {
        harvestSource = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
      }

      if (harvestSource) {
        if (creep.harvest(harvestSource) == ERR_NOT_IN_RANGE) {
          creep.moveTo(harvestSource, {
            visualizePathStyle: { stroke: "#ffaa00" },
          });
        }
      }
    } else {
      var target = null;

      // Check if any storage manager exists in the room.
      // If 0 storage managers exist and spawn energy is below 300, feed spawn/extensions directly
      // so the room can spawn a storage manager and avoid a logistics deadlock.
      var hasStorageManager =
        creep.room.find(FIND_MY_CREEPS, {
          filter: (c) => c.memory && c.memory.role === "storagemanager",
        }).length > 0;

      if (!hasStorageManager && creep.room.energyAvailable < 300) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_EXTENSION) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      // Priority 1: Prefer the closest container with free capacity
      if (!target) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              structure.structureType == STRUCTURE_CONTAINER &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      // Priority 2: If no container available, check storage
      if (!target) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              structure.structureType == STRUCTURE_STORAGE &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      // Priority 3: Fallback to spawns and extensions if containers/storage are not built or are full
      if (!target) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_EXTENSION) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      // Priority 4: Fallback to towers if needed
      if (!target) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              structure.structureType == STRUCTURE_TOWER &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      // If a target is found, the creep moves to it and transfers energy.
      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target, {
            visualizePathStyle: { stroke: "#ffffff" },
          });
        }
      }
    }
  },
};

module.exports = roleHarvester;
