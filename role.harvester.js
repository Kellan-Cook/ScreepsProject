/**
 * @file This module contains the logic for the harvester creep role.
 * @author Kellan Cook
 * @version 0.3
 */

var roleHarvester = {
  /**
   * This function is the main entry point for the harvester creep logic. It is called for each harvester creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // If the creep is full, it should switch to storing.
    if (creep.store.getUsedCapacity() == creep.store.getCapacity()) {
      creep.memory.task = "storing";
    }
    // If the creep is empty, it should switch to harvesting.
    if (creep.store.getUsedCapacity() == 0) {
      creep.memory.task = "harvesting";
    }

    // If the creep is harvesting, it should move to the source and harvest it.
    if (creep.memory.task == "harvesting") {
      var targetsource = Game.getObjectById(creep.memory.roomsources);

      if (creep.harvest(targetsource) == ERR_NOT_IN_RANGE) {
        creep.moveTo(targetsource);
      }

      // Check for nearby containers and create a construction site if none are found.
      var containers = targetsource.pos.findInRange(FIND_STRUCTURES, 3, {
        filter: { structureType: STRUCTURE_CONTAINER },
      });

      if (containers.length === 0) {
        // Find a suitable position for the container blueprint.
        var pathToSource = creep.room.findPath(creep.pos, targetsource.pos, {
          ignoreCreeps: true,
        });
        if (pathToSource.length > 0) {
          var containerPos = new RoomPosition(
            pathToSource[0].x,
            pathToSource[0].y,
            creep.room.name
          );
          creep.room.createConstructionSite(containerPos, STRUCTURE_CONTAINER);
        }
      }
    } else {
      // When storing, find the closest container, storage, extension, or spawn with free capacity.
      var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE ||
              structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_SPAWN) &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });

      // If a target is found, the creep moves to it and transfers energy.
      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target);
        }
      }
    }
  },
};

module.exports = roleHarvester;