/**
 * @file This module contains the logic for the repairer creep role.
 * @author Kellan Cook
 * @version 0.3
 */

var rolerepair = {
  /**
   * This function is the main entry point for the repairer creep logic. It is called for each repairer creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // If the creep is repairing and has no energy, it should switch to harvesting.
    if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.repairing = false;
      creep.say("🔄 harvest");
    }
    // If the creep is not repairing and has a full energy capacity, it should switch to repairing.
    if (!creep.memory.repairing && creep.store.getFreeCapacity() == 0) {
      creep.memory.repairing = true;
      creep.say("🛠️ repairing");
    }

    // If the creep is repairing, it should find a structure to repair.
    if (creep.memory.repairing) {
      var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            structure.hits < structure.hitsMax &&
            structure.hits < 2000000 &&
            structure.structureType != STRUCTURE_WALL
          );
        },
      });
      targets.sort((a, b) => a.hits - b.hits);

      if (targets.length > 0) {
        if (creep.repair(targets[0]) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      }
    } else {
      // If the creep is not repairing, it should find an energy source and harvest from it.
      var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 1
          );
        },
      });

      if (target) {
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target);
        }
      }
    }
  },
};

module.exports = rolerepair;