var roleHarvester = {
  /** @param {Creep} creep **/
  run: function (creep) {
    //if creep full set memory to storing
    if (creep.store.getUsedCapacity() == creep.store.getCapacity()) {
      creep.memory.task = "storing";
    }
    //if creep is empty set memory to harvesting
    if (creep.store.getUsedCapacity() == 0) {
      creep.memory.task = "harvesting";
    }
    //if memory is harvesting harvest else find storage
    if (creep.memory.task == "harvesting") {
      var targetsource = Game.getObjectById(creep.memory.roomsources);

      if (creep.harvest(targetsource) == ERR_NOT_IN_RANGE) {
        creep.moveTo(targetsource);
      }
    } else {
      var targets = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) != 0
          );
        },
      });
      //if all extensions and spawns are full of energy deposit to storage
      if (targets == null) {
        targets = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) != 0
            );
          },
        });
      }

      if (targets != null) {
        if (creep.transfer(targets, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets);
        }
      }
    }
  },
};

module.exports = roleHarvester;
