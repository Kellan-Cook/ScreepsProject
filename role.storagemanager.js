/**
 * @file This module contains the logic for the storage manager creep role.
 * @author Kellan Cook
 * @version 0.3
 */

var rolestoragemanager = {
  /**
   * This function is the main entry point for the storage manager creep logic. It is called for each storage manager creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // If the creep has no energy, it should switch to withdrawing.
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
      creep.memory.task = false;
      creep.memory.currentmove = null;
    }
    // If the creep has full capacity, switch to transferring.
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
      creep.memory.task = true;
      creep.memory.currentmove = null;
    }

    // Default to withdrawing if state is not set
    if (creep.memory.task === undefined) {
      creep.memory.task = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    // Withdrawing phase
    if (creep.memory.task == false) {
      var sourceStructure = null;
      if (creep.memory.currentmove) {
        sourceStructure = Game.getObjectById(creep.memory.currentmove);
        if (
          !sourceStructure ||
          sourceStructure.store.getUsedCapacity(RESOURCE_ENERGY) == 0
        ) {
          sourceStructure = null;
          creep.memory.currentmove = null;
        }
      }

      if (!sourceStructure) {
        // Finds the closest container or storage with energy.
        sourceStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE) &&
              structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
        if (sourceStructure) {
          creep.memory.currentmove = sourceStructure.id;
        }
      }

      if (sourceStructure) {
        if (
          creep.withdraw(sourceStructure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
        ) {
          creep.moveTo(sourceStructure, {
            visualizePathStyle: { stroke: "#ffaa00" },
          });
        }
      }
    }

    // Transferring phase
    if (creep.memory.task == true) {
      var destStructure = null;
      if (creep.memory.currentmove) {
        destStructure = Game.getObjectById(creep.memory.currentmove);
        if (
          !destStructure ||
          destStructure.store.getFreeCapacity(RESOURCE_ENERGY) == 0
        ) {
          destStructure = null;
          creep.memory.currentmove = null;
        }
      }

      if (!destStructure) {
        // Priority 1: Spawns and Extensions
        destStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_EXTENSION) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });

        // Priority 2: Towers with capacity
        if (!destStructure) {
          destStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
              return (
                structure.structureType == STRUCTURE_TOWER &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 200
              );
            },
          });
        }

        if (destStructure) {
          creep.memory.currentmove = destStructure.id;
        }
      }

      if (destStructure) {
        if (
          creep.transfer(destStructure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
        ) {
          creep.moveTo(destStructure, {
            visualizePathStyle: { stroke: "#ffffff" },
          });
        }
      }
    }
  },
};

module.exports = rolestoragemanager;
