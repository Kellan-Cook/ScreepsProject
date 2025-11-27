/**
 * @file role.builder.js
 * @description Defines the behavior for the builder role, which constructs structures.
 * @author Kellan Cook
 * @version 0.2
 */

var roleBuilder = {
  /**
   * Main logic for the builder role.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    var roleRepair = require("role.repair");

    // State transition: Harvesting <-> Building
    if (creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.building = false;
    }
    if (!creep.memory.building && creep.store.getFreeCapacity() == 0) {
      creep.memory.building = true;
    }

    // Execute state
    if (creep.memory.building) {
      // Build construction sites
      var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
      if (targets.length) {
        if (creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      } else {
        // If no construction sites, act as repairer
        roleRepair.run(creep);
      }
    } else {
      // Withdraw from storage/container or harvest
      var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 1
          );
        },
      });

      if (target != null) {
        if (creep.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target);
        }
      } else {
        var sources = creep.room.find(FIND_SOURCES);
        if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
          creep.moveTo(sources[0]);
        }
      }
    }
  },
};

module.exports = roleBuilder;