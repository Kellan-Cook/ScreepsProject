/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.repair');
 * mod.thing == 'a thing'; // true
 */

var rolerepair = {
  run: function (creep) {
    //if memory is set to true and carrying 0 energy change to harvesting mode
    if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.repairing = false;
      creep.say("🔄 harvest");
    }
    // if memory is set to false and free energy capacity is equal to 0 set memory to repairing
    if (!creep.memory.repairing && creep.store.getFreeCapacity() == 0) {
      creep.memory.repairing = true;
      creep.say("🛠️ repairing");
    }

    //if not repairing find energy to replenish on
    if (!creep.memory.repairing) {
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
          creep.moveTo(target, { visualizePathStyle: { stroke: "#ffaa00" } });
        }
      }
    }

    //if memory is repairing find closest struture to repair
    if ((creep.memory.repairing = true)) {
      var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return structure.hits < structure.hitsMax && structure.hits < 2000000;
        },
      });
    }

    if (target != null)
      if (creep.repair(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: "#ffffff" } });
      }
  },
};

module.exports = rolerepair;
