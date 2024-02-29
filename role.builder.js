var roleBuilder = {
  /** @param {Creep} creep **/
  run: function (creep) {
    var roleRepair = require("role.repair");

    //if memory is set to building and energy is zero change to harvesting
    if (creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
      creep.memory.building = false;
      creep.say("🔄 collect");
    }
    //if memory is set to harvesting and energy is full change to building
    if (!creep.memory.building && creep.store.getFreeCapacity() == 0) {
      creep.memory.building = true;
      creep.say("🚧 build");
    }

    if (creep.memory.building) {
      var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
      if (targets.length > 0) {
        if (creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      } else {
        roleRepair.run(creep);
      }
    } else {
      var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE) &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 1
          );
        },
      });
      //targets. .sort((a, b) => a - b);

      if (targets.length >= 1) {
        if (creep.withdraw(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(targets[0]);
        }
      }

      if (targets.length < 1) {
        var sources = creep.room.find(FIND_SOURCES);
        if (creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
          creep.moveTo(sources[0]);
        }
      }
    }
  },
};

module.exports = roleBuilder;
