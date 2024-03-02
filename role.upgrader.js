var roleUpgrader = {
    /** @param {Creep} creep **/
    run: function (creep) {
      //if energy is zero set memory to harvesting
      if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.upgrading = false;
        creep.say("🔄 harvest");
      }
      //if energy is full set to upgrading
      if (!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
        creep.memory.upgrading = true;
        creep.say("⚡ upgrade");
      }
      //if memory upgrading is true upgrade controler else find energy
      if (creep.memory.upgrading) {
        if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.controller);
        }
      } else {
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
          } else {
            var sources = creep.room.find(FIND_SOURCES);
            if (creep.harvest(sources[1]) == ERR_NOT_IN_RANGE) {
              creep.moveTo(sources[1]);
            }
          }
        }
      }
    },
  };
  
  module.exports = roleUpgrader;
  