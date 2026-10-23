/**
 * @file This module contains the logic for the repairer creep role.
 * @author Kellan Cook
 * @version 0.4
 */

var roleStorageManager = require("role.storagemanager");

var rolerepair = {
  /**
   * This function is the main entry point for the repairer creep logic. It is called for each repairer creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // If the creep is repairing and has no energy, it should switch to harvesting.
    if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.repairing = false;
      creep.memory.repairTargetId = null;
      creep.say("🔄 harvest");
    }
    // If the creep is not repairing and has a full energy capacity, it should switch to repairing.
    if (!creep.memory.repairing && creep.store.getFreeCapacity() == 0) {
      creep.memory.repairing = true;
      creep.say("🛠️ repairing");
    }

    // If the creep is repairing, it should find a structure to repair.
    if (creep.memory.repairing) {
      var target = null;
      if (creep.memory.repairTargetId) {
        var cached = Game.getObjectById(creep.memory.repairTargetId);
        if (
          cached &&
          cached.hits < cached.hitsMax &&
          cached.hits < 2000000 &&
          cached.structureType != STRUCTURE_WALL
        ) {
          target = cached;
        } else {
          creep.memory.repairTargetId = null;
        }
      }

      if (!target) {
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
          target = targets[0];
          creep.memory.repairTargetId = target.id;
        }
      }

      if (target) {
        if (creep.repair(target) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: "#ffffff" } });
        }
      } else {
        // Fallback: build construction sites if nothing needs repair
        var site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (site) {
          if (creep.build(site) == ERR_NOT_IN_RANGE) {
            creep.moveTo(site, { visualizePathStyle: { stroke: "#ffffff" } });
          }
        }
      }
    } else {
      // Priority 1: Withdraw from non-controller containers or storage first
      var withdrawTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            !roleStorageManager.isControllerContainer(structure, creep) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      // Priority 2: Fallback to any container or storage with energy
      if (!withdrawTarget) {
        withdrawTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE) &&
              structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      if (withdrawTarget) {
        var withdrawRes = creep.withdraw(withdrawTarget, RESOURCE_ENERGY);
        if (withdrawRes == ERR_NOT_IN_RANGE) {
          creep.moveTo(withdrawTarget, {
            visualizePathStyle: { stroke: "#ffaa00" },
          });
        } else if (
          withdrawRes == OK &&
          creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        ) {
          creep.memory.repairing = true;
        }
      } else {
        // Fallback to active source if no containers/storage with energy exist
        var source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" } });
          }
        } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
          creep.memory.repairing = true;
        }
      }
    }
  },
};

module.exports = rolerepair;
