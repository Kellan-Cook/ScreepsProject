/**
 * @file role.repair.js
 * @description Defines the behavior for the repairer role, which maintains structures.
 * @author Kellan Cook
 * @version 0.2
 */

var roleRepair = {
  /**
   * Main logic for the repairer role.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // State transition: Harvesting <-> Repairing
    if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.repairing = false;
    }
    if (!creep.memory.repairing && creep.store.getFreeCapacity() == 0) {
      creep.memory.repairing = true;
    }

    // Execute state
    if (creep.memory.repairing) {
      // Repair damaged structures
      var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_ROAD ||
              structure.structureType == STRUCTURE_CONTAINER) &&
            structure.hits < structure.hitsMax
          );
        },
      });

      targets.sort((a, b) => a.hits - b.hits);

      if (targets.length > 0) {
        if (creep.repair(targets[0]) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      } else {
        // If nothing to repair, act as builder
        var roleBuilder = require("role.builder");
        roleBuilder.run(creep);
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

module.exports = roleRepair;