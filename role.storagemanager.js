var rolestoragemanager = {
  /** @param {Creep} creep **/

  //starts the function
  run: function (creep) {
    //sets the task memory state based on used capacity and if changes to withdraw sets the target storage id
    if (creep.store.getUsedCapacity() == creep.store.getCapacity) {
      creep.memory.task = true;
    }

    if (creep.store.getUsedCapacity() == 0) {
      creep.memory.task = false;

      var closest = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) != 0
          );
        },
      });
      if (closest != null) {
        creep.memory.currentmove = closest.id;
      }
    }

    //runs the task of moving to and collecting from storage structures
    if (creep.memory.task == false) {
      if (creep.memory.currentmove != null) {
        var targets = Game.getObjectById(creep.memory.currentmove);
        if (creep.withdraw(targets, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets);
        }
      }
    }

    //runs the task of moving to epty extensions and filling
    if ((creep.memory.task = true)) {
      var targetstorage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_SPAWN ||
              structure.structureType == STRUCTURE_EXTENSION) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      if (targetstorage != null) {
        if (
          creep.transfer(targetstorage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
        ) {
          creep.moveTo(targetstorage);
        }
      }
    }
  },
};
module.exports = rolestoragemanager;
