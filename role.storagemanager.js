var rolestoragemanager = {
  /** @param {Creep} creep **/
  run: function (creep) {
    if (creep.store.getUsedCapacity() == creep.store.getCapacity()) {
      creep.memory.task = "storing";
    }

    if (
      creep.store.getUsedCapacity() == 0 &&
      creep.memory.task != "withdrawing"
    ) {
      creep.memory.task = "withdrawing";

      creep.memory.currentmove = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) != 0
          );
        },
      });
    }
    if ((creep.memory.task = "withdrawing")) {
      if (creep.memory.currentmove != null) {
        if (targets != null) {
          if (creep.withdraw(targets, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(targets, {
              visualizePathStyle: { stroke: "#ffffff" },
            });
          }
        }
      }
    }

    if ((creep.memory.task = "storing")) {
      var targets = creep.room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) != 0
          );
        },
      });

      if (targets.length > 0) {
        var targetstorage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_EXTENSION) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) != 0
            );
          },
        });
        if (targetstorage > 0) {
          if (targets != null) {
            if (
              creep.transfer(targetstorage[0], RESOURCE_ENERGY) ==
              ERR_NOT_IN_RANGE
            ) {
              creep.moveTo(targets, {
                visualizePathStyle: { stroke: "#ffffff" },
              });
            }
          }
        }
      }
    }
  },
};
module.exports = rolestoragemanager;
