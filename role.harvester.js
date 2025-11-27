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
      // Transfer to spawn or extension
      var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      // If spawn/extensions full, transfer to container/storage
      if (targets.length == 0) {
        targets = creep.room.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      // If all full, transfer to tower
      if (targets.length == 0) {
        targets = creep.room.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              structure.structureType == STRUCTURE_TOWER &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      if (targets.length > 0) {
        if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      }
    }
  },
};

module.exports = roleHarvester;