/**
 * @file This module contains the logic for the harvester creep role.
 * @author Kellan Cook
 * @version 0.2
 */

var roleHarvester = {
  /**
   * This function is the main entry point for the harvester creep logic. It is called for each harvester creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // If the creep is full, it should switch to storing.
    if (creep.store.getUsedCapacity() == creep.store.getCapacity()) {
      creep.memory.task = "storing";
    }
    // If the creep is empty, it should switch to harvesting.
    if (creep.store.getUsedCapacity() == 0) {
      creep.memory.task = "harvesting";
    }
    // If the creep is harvesting, it should move to the source and harvest it.
    if (creep.memory.task == "harvesting") {
      var targetsource = Game.getObjectById(creep.memory.roomsources);

      if (creep.harvest(targetsource) == ERR_NOT_IN_RANGE) {
        creep.moveTo(targetsource);
      }
    } else {

      var extension = creep.pos.findClosestByRange(STRUCTURE_EXTENSION);
      creep.pos.getRangeTo(extension)

      // Finds the closest extension or spawn with free capacity.
      var targets = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) != 0
          );
        },
      });
      // If all extensions and spawns are full, it deposits to storage.
      if (targets == null) {
        targets = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) != 0
            );
          },
        });
      }

      // If a target is found, the creep moves to it and transfers energy.
      if (targets != null) {
        if (creep.transfer(targets, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets);
        }
      }
    }
  },
};

module.exports = roleHarvester;