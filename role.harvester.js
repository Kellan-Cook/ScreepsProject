/**
 * @file This module contains the logic for the harvester creep role.
 * @author Kellan Cook
 * @version 0.9
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
        var containers = targetsource.pos.findInRange(FIND_STRUCTURES, 3, {
          filter: { structureType: STRUCTURE_CONTAINER },
        });
        var constructionSites = targetsource.pos.findInRange(
          FIND_CONSTRUCTION_SITES,
          3,
          {
            filter: { structureType: STRUCTURE_CONTAINER },
          }
        );

        // If no containers or construction sites are found, create a new construction site.
        if (containers.length === 0 && constructionSites.length === 0) {
          let positions = [];
          for (let x = targetsource.pos.x - 2; x <= targetsource.pos.x + 2; x++) {
            for (let y = targetsource.pos.y - 2; y <= targetsource.pos.y + 2; y++) {
              if (
                creep.room.getTerrain().get(x, y) !== TERRAIN_MASK_WALL &&
                targetsource.pos.getRangeTo(x, y) > 1 &&
                creep.room.lookForAt(LOOK_STRUCTURES, x, y).length === 0 &&
                creep.room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y).length === 0
              ) {
                positions.push(new RoomPosition(x, y, creep.room.name));
              }
            }
          }

          // Select a position from the valid positions.
          if (positions.length > 0) {
            let pos = positions[Math.floor(Math.random() * positions.length)];
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
      var targetsource = Game.getObjectById(creep.memory.roomsources);
      if (!targetsource) {
        targetsource = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
      }

      if (targetsource) {
        if (creep.harvest(targetsource) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targetsource, {
            visualizePathStyle: { stroke: "#ffaa00" },
          });
        }
      }
    } else {
      // Priority 1: Fill spawns and extensions first so creep generation is never blocked
      var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_SPAWN ||
              structure.structureType == STRUCTURE_EXTENSION) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      // Priority 2: Fill containers and storage
      if (!target) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      // Priority 3: Fill towers if needed
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
