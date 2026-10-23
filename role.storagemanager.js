/**
 * @file This module contains the logic for the storage manager creep role.
 * @author Kellan Cook
 * @version 0.5
 */

var rolestoragemanager = {
  /**
   * Helper to check if a structure is adjacent (range <= 1) to any energy source.
   * @param {Structure} structure
   * @param {Room} room
   * @returns {boolean}
   */
  isSourceContainer: function (structure, room) {
    if (!structure || structure.structureType !== STRUCTURE_CONTAINER) {
      return false;
    }
    var sources = room.find(FIND_SOURCES);
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].pos.getRangeTo(structure.pos) <= 1) {
        return true;
      }
    }
    return false;
  },

  /**
   * Helper to check if a container is the designated controller container.
   * Checks room.memory.controllerContainer first, then falls back to range <= 4 of controller
   * (excluding source containers).
   * @param {Structure} structure
   * @param {Creep} creep
   * @returns {boolean}
   */
  isControllerContainer: function (structure, creep) {
    if (!structure || structure.structureType !== STRUCTURE_CONTAINER) {
      return false;
    }
    var room = creep.room;
    if (room.memory && room.memory.controllerContainer) {
      var cc = room.memory.controllerContainer;
      if (cc.id && structure.id === cc.id) return true;
      if (structure.pos.x === cc.x && structure.pos.y === cc.y) {
        cc.id = structure.id;
        return true;
      }
      return false;
    }
    return Boolean(
      room.controller &&
        structure.pos.getRangeTo(room.controller) <= 4 &&
        !this.isSourceContainer(structure, room) &&
        !this.isSpawnerContainer(structure, creep)
    );
  },

  /**
   * Helper to check if a container is the designated spawner storage container.
   * Checks room.memory.storageContainer / room.memory.spawnerContainer first,
   * then falls back to range <= 3 of any spawn (excluding source and controller containers).
   * @param {Structure} structure
   * @param {Creep} creep
   * @returns {boolean}
   */
  isSpawnerContainer: function (structure, creep) {
    if (!structure || structure.structureType !== STRUCTURE_CONTAINER) {
      return false;
    }
    var room = creep.room;
    if (
      room.memory &&
      (room.memory.storageContainer || room.memory.spawnerContainer)
    ) {
      var sc = room.memory.storageContainer || room.memory.spawnerContainer;
      if (sc.id && structure.id === sc.id) return true;
      if (structure.pos.x === sc.x && structure.pos.y === sc.y) {
        sc.id = structure.id;
        return true;
      }
      return false;
    }
    var spawns = room.find(FIND_MY_SPAWNS);
    for (var i = 0; i < spawns.length; i++) {
      if (
        structure.pos.getRangeTo(spawns[i].pos) <= 3 &&
        !this.isSourceContainer(structure, room) &&
        (!room.controller ||
          structure.pos.getRangeTo(room.controller.pos) > 3)
      ) {
        return true;
      }
    }
    return false;
  },

  /**
   * Finds the designated spawner storage container if it exists and has free capacity.
   * @param {Room} room
   * @param {Creep} creep
   * @returns {StructureContainer|null}
   */
  getSpawnerContainerWithSpace: function (room, creep) {
    if (!room) return null;
    var self = this;

    if (
      room.memory &&
      (room.memory.storageContainer || room.memory.spawnerContainer)
    ) {
      var sc = room.memory.storageContainer || room.memory.spawnerContainer;
      if (sc.id) {
        var byId = Game.getObjectById(sc.id);
        if (byId && byId.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
          return byId;
        }
        if (byId) return null;
      }
      var structs = room.lookForAt(LOOK_STRUCTURES, sc.x, sc.y);
      for (var i = 0; i < structs.length; i++) {
        if (structs[i].structureType === STRUCTURE_CONTAINER) {
          sc.id = structs[i].id;
          if (structs[i].store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            return structs[i];
          }
          return null;
        }
      }
    }

    var spawns = room.find(FIND_MY_SPAWNS);
    for (var s = 0; s < spawns.length; s++) {
      var nearby = spawns[s].pos.findInRange(FIND_STRUCTURES, 3, {
        filter: function (st) {
          return (
            st.structureType === STRUCTURE_CONTAINER &&
            !self.isSourceContainer(st, room) &&
            !self.isControllerContainer(st, creep) &&
            st.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });
      if (nearby.length > 0) return nearby[0];
    }
    return null;
  },

  /**
   * Finds the designated spawner storage container if it exists and has energy.
   * @param {Room} room
   * @param {Creep} creep
   * @returns {StructureContainer|null}
   */
  getSpawnerContainerWithEnergy: function (room, creep) {
    if (!room) return null;
    var self = this;

    if (
      room.memory &&
      (room.memory.storageContainer || room.memory.spawnerContainer)
    ) {
      var sc = room.memory.storageContainer || room.memory.spawnerContainer;
      if (sc.id) {
        var byId = Game.getObjectById(sc.id);
        if (byId && byId.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
          return byId;
        }
        if (byId) return null;
      }
      var structs = room.lookForAt(LOOK_STRUCTURES, sc.x, sc.y);
      for (var i = 0; i < structs.length; i++) {
        if (structs[i].structureType === STRUCTURE_CONTAINER) {
          sc.id = structs[i].id;
          if (structs[i].store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            return structs[i];
          }
          return null;
        }
      }
    }

    var spawns = room.find(FIND_MY_SPAWNS);
    for (var s = 0; s < spawns.length; s++) {
      var nearby = spawns[s].pos.findInRange(FIND_STRUCTURES, 3, {
        filter: function (st) {
          return (
            st.structureType === STRUCTURE_CONTAINER &&
            !self.isSourceContainer(st, room) &&
            !self.isControllerContainer(st, creep) &&
            st.store.getUsedCapacity(RESOURCE_ENERGY) > 0
          );
        },
      });
      if (nearby.length > 0) return nearby[0];
    }
    return null;
  },

  /**
   * Finds the designated controller container in the room if it exists and has free capacity.
   * @param {Room} room
   * @param {Creep} creep
   * @returns {StructureContainer|null}
   */
  getControllerContainerWithSpace: function (room, creep) {
    if (!room || !room.controller) return null;

    if (room.memory && room.memory.controllerContainer) {
      var cc = room.memory.controllerContainer;
      if (cc.id) {
        var byId = Game.getObjectById(cc.id);
        if (byId && byId.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
          return byId;
        }
        if (byId) return null;
      }
      var structs = room.lookForAt(LOOK_STRUCTURES, cc.x, cc.y);
      for (var i = 0; i < structs.length; i++) {
        if (structs[i].structureType === STRUCTURE_CONTAINER) {
          cc.id = structs[i].id;
          if (structs[i].store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            return structs[i];
          }
          return null;
        }
      }
    }

    var self = this;
    var ctrlContainers = room.controller.pos.findInRange(FIND_STRUCTURES, 4, {
      filter: function (structure) {
        return (
          structure.structureType === STRUCTURE_CONTAINER &&
          !self.isSourceContainer(structure, room) &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      },
    });
    return ctrlContainers.length > 0 ? ctrlContainers[0] : null;
  },

  /**
   * Checks if any non-storage consumer (spawn, extension, tower, or controller container) needs energy.
   * Used to prevent withdrawing from central storage only to dump it back into central storage.
   * @param {Creep} creep
   * @returns {boolean}
   */
  nonStorageNeedsEnergy: function (creep) {
    var room = creep.room;
    var needed = room.find(FIND_STRUCTURES, {
      filter: function (s) {
        return (
          s.store &&
          (((s.structureType === STRUCTURE_SPAWN ||
            s.structureType === STRUCTURE_EXTENSION) &&
            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0) ||
            (s.structureType === STRUCTURE_TOWER &&
              s.store.getFreeCapacity(RESOURCE_ENERGY) > 200))
        );
      },
    });
    if (needed.length > 0) return true;
    return this.getControllerContainerWithSpace(room, creep) !== null;
  },

  /**
   * This function is the main entry point for the storage manager creep logic. It is called for each storage manager creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    var self = this;

    // If the creep has no energy, it should switch to withdrawing.
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
      creep.memory.task = false;
      creep.memory.currentmove = null;
    }
    // If the creep has full capacity, switch to transferring.
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
      creep.memory.task = true;
      creep.memory.currentmove = null;
    }

    // Default to withdrawing if state is not set
    if (creep.memory.task === undefined) {
      creep.memory.task = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    // Withdrawing phase
    if (creep.memory.task == false) {
      var sourceStructure = null;
      if (creep.memory.currentmove) {
        sourceStructure = Game.getObjectById(creep.memory.currentmove);
        if (
          !sourceStructure ||
          sourceStructure.store.getUsedCapacity(RESOURCE_ENERGY) == 0 ||
          self.isControllerContainer(sourceStructure, creep) ||
          ((self.isSpawnerContainer(sourceStructure, creep) ||
            sourceStructure.structureType === STRUCTURE_STORAGE) &&
            !self.nonStorageNeedsEnergy(creep))
        ) {
          sourceStructure = null;
          creep.memory.currentmove = null;
        }
      }

      if (!sourceStructure) {
        // Priority 1: Withdraw from source containers (bringing energy from the mines)
        sourceStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              structure.structureType == STRUCTURE_CONTAINER &&
              !self.isControllerContainer(structure, creep) &&
              !self.isSpawnerContainer(structure, creep) &&
              structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });

        // Priority 2: Withdraw from spawner storage container ONLY if spawn, extensions, towers, or controller container need energy
        if (!sourceStructure && self.nonStorageNeedsEnergy(creep)) {
          sourceStructure = self.getSpawnerContainerWithEnergy(
            creep.room,
            creep
          );
        }

        // Priority 3: Withdraw from central storage ONLY if a non-storage destination needs energy
        if (
          !sourceStructure &&
           creep.room.storage &&
          creep.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
          self.nonStorageNeedsEnergy(creep)
        ) {
          sourceStructure = creep.room.storage;
        } else if (!sourceStructure && self.nonStorageNeedsEnergy(creep)) {
          sourceStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
              return (
                structure.structureType == STRUCTURE_STORAGE &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
              );
            },
          });
        }

        if (sourceStructure) {
          creep.memory.currentmove = sourceStructure.id;
        }
      }

      if (sourceStructure) {
        var withdrawResult = creep.withdraw(sourceStructure, RESOURCE_ENERGY);
        if (withdrawResult == ERR_NOT_IN_RANGE) {
          creep.moveTo(sourceStructure, {
            visualizePathStyle: { stroke: "#ffaa00" },
          });
        } else if (withdrawResult == OK) {
          // Switch to delivery after successfully collecting energy so partial loads never stall
          creep.memory.task = true;
          creep.memory.currentmove = null;
        }
      } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        // If no source container has energy left, deliver whatever energy the creep is already carrying
        creep.memory.task = true;
        creep.memory.currentmove = null;
      }
    }

    // Transferring phase
    if (creep.memory.task == true) {
      var destStructure = null;
      if (creep.memory.currentmove) {
        destStructure = Game.getObjectById(creep.memory.currentmove);
        if (
          !destStructure ||
          destStructure.store.getFreeCapacity(RESOURCE_ENERGY) == 0
        ) {
          destStructure = null;
          creep.memory.currentmove = null;
        }
      }

      if (!destStructure) {
        // Priority 1: Spawns and Extensions
        destStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_EXTENSION) &&
              structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );
          },
        });

        // Priority 2: Towers with capacity
        if (!destStructure) {
          destStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
              return (
                structure.structureType == STRUCTURE_TOWER &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 200
              );
            },
          });
        }

        // Priority 3: Controller Container (fills dedicated container for upgraders)
        if (!destStructure) {
          destStructure = self.getControllerContainerWithSpace(
            creep.room,
            creep
          );
        }

        // Priority 4: Spawner Storage Container (fills dedicated storage container near spawner)
        if (!destStructure) {
          destStructure = self.getSpawnerContainerWithSpace(
            creep.room,
            creep
          );
        }

        // Priority 5: Central Storage
        if (!destStructure) {
          destStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
              return (
                structure.structureType == STRUCTURE_STORAGE &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
              );
            },
          });
        }

        if (destStructure) {
          creep.memory.currentmove = destStructure.id;
        }
      }

      if (destStructure) {
        var transferResult = creep.transfer(destStructure, RESOURCE_ENERGY);
        if (transferResult == ERR_NOT_IN_RANGE) {
          creep.moveTo(destStructure, {
            visualizePathStyle: { stroke: "#ffffff" },
          });
        } else if (transferResult == OK) {
          // Clear cached target so next tick picks the next closest extension/structure
          creep.memory.currentmove = null;
        }
      }
    }
  },
};

module.exports = rolestoragemanager;
