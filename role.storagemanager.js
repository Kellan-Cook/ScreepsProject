var rolestoragemanager = {
  /** @param {Creep} creep **/
  run: function (creep) {
    if (creep.store.getUsedCapacity() > 1) {
      creep.memory.task = "storing";
    }

    if (
      creep.store.getUsedCapacity() == 0 &&
      creep.memory.task != "withdrawing"
    ) {
      creep.memory.task = "withdrawing";

      var closest = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) != 0
          );
        },
      });

      creep.memory.currentmove = closest.id;
    }
    if (creep.memory.task == "withdrawing") {
      if (creep.memory.currentmove != null) {
        var targets = Game.getObjectById(creep.memory.currentmove);
        if (creep.withdraw(targets, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets, {
            visualizePathStyle: { stroke: "#ffffff" },
          });
        }
      }
    }

    if ((creep.memory.task = "storing")) {
      console.log("test");

      var targetstorage = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_SPAWN ||
              structure.structureType == STRUCTURE_EXTENSION) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });
      console.log(targetstorage);
      if (targetstorage != null) {
        console.log(targetstorage);
        if (
          creep.transfer(targetstorage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
        ) {
          creep.moveTo(targetstorage, {
            visualizePathStyle: { stroke: "#ffffff" },
          });
        }
      }
    }
  },
};
module.exports = rolestoragemanager;
