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
    if (!creep.memory.task) {
      creep.memory.task = "harvesting";
    }
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
      // Withdraw from closest container/storage
      var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      if (target) {
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target);
        }
      }
    } else {
      // Transfer to closest extension/spawn/tower
      var target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN ||
              structure.structureType == STRUCTURE_TOWER) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target);
        }
      }
    }
  },
};

module.exports = roleStorageManager;