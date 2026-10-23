/**
 * @file This module contains the logic for the upgrader creep role.
 * @author Kellan Cook
 * @version 0.4
 */

var roleUpgrader = {
  /**
   * Finds the designated controller container in the room if it has energy.
   * @param {Room} room
   * @returns {StructureContainer|null}
   */
  getControllerContainerWithEnergy: function (room) {
    if (!room || !room.controller) return null;

    if (room.memory && room.memory.controllerContainer) {
      var cc = room.memory.controllerContainer;
      if (cc.id) {
        var byId = Game.getObjectById(cc.id);
        if (byId && byId.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
          return byId;
        }
        if (byId) return null;
      }
      var structs = room.lookForAt(LOOK_STRUCTURES, cc.x, cc.y);
      for (var i = 0; i < structs.length; i++) {
        if (structs[i].structureType === STRUCTURE_CONTAINER) {
          cc.id = structs[i].id;
          if (structs[i].store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            return structs[i];
          }
          return null;
        }
      }
    }

    var ctrlContainers = room.controller.pos.findInRange(FIND_STRUCTURES, 4, {
      filter: (s) =>
        s.structureType === STRUCTURE_CONTAINER &&
        s.store.getUsedCapacity(RESOURCE_ENERGY) > 0,
    });
    return ctrlContainers.length > 0 ? ctrlContainers[0] : null;
  },

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
      if (creep.room.controller) {
        if (
          creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE
        ) {
          creep.moveTo(creep.room.controller, {
            visualizePathStyle: { stroke: "#ffffff" },
          });
        }
      }
    } else {
      // Priority 1: Check for dedicated controller container
      var target = this.getControllerContainerWithEnergy(creep.room);

      // Priority 2: Fallback to closest container or storage with energy
      if (!target) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE) &&
              structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });
      }

      if (target != null) {
        var withdrawRes = creep.withdraw(target, RESOURCE_ENERGY);
        if (withdrawRes == ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: "#ffaa00" } });
        } else if (
          withdrawRes == OK &&
          creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0
        ) {
          creep.memory.upgrading = true;
        }
      } else {
        // Priority 3: Fallback to active source
        var source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {
              visualizePathStyle: { stroke: "#ffaa00" },
            });
          }
        } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
          creep.memory.upgrading = true;
        }
      }
    }
  },
};

module.exports = roleUpgrader;
