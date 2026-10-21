/**
 * @file This module contains the logic for the builder creep role.
 * @author Kellan Cook
 * @version 0.2
 */

var roleRepair = require("role.repair");

var roleBuilder = {
  /**
   * This function is the main entry point for the builder creep logic. It is called for each builder creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // If the creep is building and has no energy, it should switch to collecting.
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
      var target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
      if (target) {
        if (creep.build(target) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: "#ffffff" } });
        }
      } else {
        // If there are no construction sites, the builder should act as a repairer.
        roleRepair.run(creep);
      }
    } else {
      // If the creep is not building, it should find container/storage or harvest from a source.
      var storageTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 1
          );
        },
      });

      if (storageTarget) {
        if (creep.withdraw(storageTarget, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(storageTarget, {
            visualizePathStyle: { stroke: "#ffaa00" },
          });
        }
      } else {
        // If there are no containers or storage with energy, the builder should harvest from an active source.
        var source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {
              visualizePathStyle: { stroke: "#ffaa00" },
            });
          }
        }
      }
    }
  },
};

module.exports = roleBuilder;
