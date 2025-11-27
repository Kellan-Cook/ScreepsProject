/**
 * @file role.storagemanager.js
 * @description Defines the behavior for the storage manager role, which transfers energy between storage structures.
 * @author Kellan Cook
 * @version 0.2
 */

var roleStorageManager = {
  /**
   * Main logic for the storage manager role.
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
      // Withdraw from container/storage
      var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });
      // Prioritize containers with most energy
      targets.sort((a, b) => b.store[RESOURCE_ENERGY] - a.store[RESOURCE_ENERGY]);

      if (targets.length > 0) {
        if (creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      }
    } else {
      // Transfer to extension/spawn/tower
      var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN ||
              structure.structureType == STRUCTURE_TOWER) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      if (targets.length > 0) {
        if (creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      }
    }
  },
};

module.exports = roleStorageManager;