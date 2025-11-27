/**
 * @file role.upgrader.js
 * @description Defines the behavior for the upgrader role, which transfers energy to the room controller.
 * @author Kellan Cook
 * @version 0.2
 */

var roleUpgrader = {
  /**
   * Main logic for the upgrader role.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // State transition: Harvesting <-> Upgrading
    if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.upgrading = false;
      creep.say("🔄 harvest");
    }
    if (!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
      creep.memory.upgrading = true;
      creep.say("⚡ upgrade");
    }

    // Execute state
    if (creep.memory.upgrading) {
      // Upgrade controller
      if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller);
      }
    } else {
      // Harvest energy from sources
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
        var sources = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (creep.harvest(sources) == ERR_NOT_IN_RANGE) {
          creep.moveTo(sources);
        }
      }
    }
  },
};

module.exports = roleUpgrader;