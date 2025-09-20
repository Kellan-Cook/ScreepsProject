/**
 * @file This module contains the logic for the builder creep role.
 * @author YOUR_NAME
 * @version 1.0
 */

var roleBuilder = {
  /**
   * This function is the main entry point for the builder creep logic. It is called for each builder creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    var roleRepair = require("role.repair");

    // If the creep is building and has no energy, it should switch to harvesting.
    if (creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.building = false;
      creep.say("🔄 collect");
    }
    // If the creep is not building and has a full energy capacity, it should switch to building.
    if (!creep.memory.building && creep.store.getFreeCapacity() == 0) {
      creep.memory.building = true;
      creep.say("🚧 build");
    }

    // If the creep is building, it should find a construction site and build it.
    if (creep.memory.building) {
      var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
      if (targets.length > 0) {
        if (creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      } else {
        // If there are no construction sites, the builder should act as a repairer.
        roleRepair.run(creep);
      }
    } else {
      // If the creep is not building, it should find an energy source and harvest from it.
      var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 1
          );
        },
      });
      //targets. .sort((a, b) => a - b);

      if (targets.length >= 1) {
        if (creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      }

      // If there are no containers or storage with energy, the builder should harvest from a source.
      if (targets.length < 1) {
        var sources = creep.room.find(FIND_SOURCES);
        if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
          creep.moveTo(sources[0]);
        }
      }
    }
  },
};

module.exports = roleBuilder;