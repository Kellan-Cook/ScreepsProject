/**
 * @file role.harvester.js
 * @description Defines the behavior for the harvester role, which gathers energy from sources and transfers it to spawns or extensions.
 * @author Kellan Cook
 * @version 0.2
 */

var roleHarvester = {
  /**
   * Main logic for the harvester role.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // State transition: Harvesting <-> Transferring
    if (creep.memory.task == "transfering" && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.task = "harvesting";
    }
    if (
      creep.memory.task == "harvesting" &&
      creep.store.getFreeCapacity() == 0
    ) {
      creep.memory.task = "transfering";
    }

    // Execute state
    if (creep.memory.task == "harvesting") {
      // Harvest from assigned source
      var sources = Game.getObjectById(creep.memory.roomsources);
      if (creep.harvest(sources) == ERR_NOT_IN_RANGE) {
        creep.moveTo(sources);
      }
    } else {
      // 1. Primary Targets: Extensions, Spawns, Containers (Closest)
      var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN ||
              structure.structureType == STRUCTURE_CONTAINER) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      // 2. Fallback Targets: Storage, Towers (Closest)
      if (!target) {
        target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_STORAGE ||
                structure.structureType == STRUCTURE_TOWER) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target);
        }
      }
    }
  },
};

module.exports = roleHarvester;