/**
 * @file This module contains the logic for the upgrader creep role.
 * @author YOUR_NAME
 * @version 1.0
 */

var roleUpgrader = {
    /**
     * This function is the main entry point for the upgrader creep logic. It is called for each upgrader creep in the game.
     * @param {Creep} creep - The creep to run the logic for.
     */
    run: function (creep) {
      // If the creep is upgrading and has no energy, it should switch to harvesting.
      if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.upgrading = false;
        creep.say("🔄 harvest");
      }
      // If the creep is not upgrading and has a full energy capacity, it should switch to upgrading.
      if (!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
        creep.memory.upgrading = true;
        creep.say("⚡ upgrade");
      }
      // If the creep is upgrading, it should move to the controller and upgrade it.
      if (creep.memory.upgrading) {
        if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.controller);
        }
      } else {
        // If the creep is not upgrading, it should find an energy source and harvest from it.
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

            var sources = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
            
            if(creep.harvest(sources) == ERR_NOT_IN_RANGE){
                creep.moveTo(sources)


            }


        }
      }
    },
  };
  
  module.exports = roleUpgrader;