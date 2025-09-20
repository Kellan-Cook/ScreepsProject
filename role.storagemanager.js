/**
 * @file This module contains the logic for the storage manager creep role.
 * @author YOUR_NAME
 * @version 1.0
 */

var rolestoragemanager = {
  /**
   * This function is the main entry point for the storage manager creep logic. It is called for each storage manager creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */

  //starts the function
  run: function (creep) {
    // If the creep has more than 1 energy, it should switch to transferring.
    if (creep.store.getUsedCapacity() > 1) {
      creep.memory.task = true;
    }

    // If the creep has no energy, it should switch to withdrawing.
    if (creep.store.getUsedCapacity() == 0) {
      creep.memory.task = false;

      // Finds the closest container or storage with energy.
      var closest = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) != 0
          );
        },
      });
      if (closest != null) {
        creep.memory.currentmove = closest.id;
      }
    }

    // If the creep is transferring, it should find the closest spawn or extension with free capacity.
    if(creep.memory.task == true){
      var closest = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_SPAWN ||
              structure.structureType == STRUCTURE_EXTENSION) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });
      if(closest != null){
        creep.memory.currentmove = closest.id;

      }


    }
    // If the creep is withdrawing, it should move to the target and withdraw energy.
    if (creep.memory.task == false) {
      if (creep.memory.currentmove != null) {
        var targets = Game.getObjectById(creep.memory.currentmove);
        if (creep.withdraw(targets, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets);
        }
      }
    }

    // If the creep is transferring, it should move to the target and transfer energy.
    if (creep.memory.task == true) {
      var targets = Game.getObjectById(creep.memory.currentmove);
      if(creep.memory.currentmove.getFreeCapacity < 1){
        creep.memory.task = false;
      }
        if (
          creep.transfer(targets, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
        ) {
          creep.moveTo(targets);
        }
    }
  },
};
module.exports = rolestoragemanager;