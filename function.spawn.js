/**
 * @file This module contains the logic for spawning creeps in the Screeps game.
 * @author Kellan Cook
 * @version 0.3
 */

var roletower = require("role.tower");
var roomBuilder = require("roomBuilder");

var functionSpawn = {
  /**
   * This function is the main entry point for the spawner logic. It is called for each spawner in the game.
   * @param {string} curspawner - The name of the spawner to run the logic for.
   */
  run: function (curspawner) {
    var spawner = Game.spawns[curspawner];
    if (!spawner) return;

    var spawnEng = spawner.room.energyAvailable;

    // Checks if the spawner was just created or memory needs initialization.
    if (
      spawner.memory.firstrun === undefined ||
      !spawner.memory.roomsources ||
      (spawner.memory.roomsources.length > 0 &&
        spawner.memory.roomsources[0].room !== undefined)
    ) {
      // Store plain source references with IDs to avoid serialization bloat
      spawner.memory.roomsources = spawner.room
        .find(FIND_SOURCES)
        .map((s) => ({ id: s.id }));

      if (Memory.myrooms && !Memory.myrooms.includes(spawner.room.name)) {
        Memory.myrooms.push(spawner.room.name);
      }
      roomBuilder.run(spawner);
      spawner.memory.firstrun = false;
    }

    if (String(Game.time).slice(-3) == "000") {
      roomBuilder.run(spawner);
    }

    // Checks for hostile creeps in the room. If any are found, it sends a notification and logs a message to the console.
    var hostile = spawner.room.find(FIND_HOSTILE_CREEPS);

    // Runs the logic for all towers in the room.
    var towers = spawner.room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_TOWER },
    });
    for (var i = 0; i < towers.length; i++) {
      roletower.run(towers[i]);
    }

    if (hostile.length > 0) {
      Game.notify(
        "SPAWNER: " +
          spawner.name +
          " DETECTED HOSTILE: " +
          (hostile[0].owner ? hostile[0].owner.username : "unknown")
      );
      console.log("HOSTILE DETECTED: " + hostile[0].id);
    }

    // If the spawner is not currently spawning a creep, it runs the logic for spawning new creeps.
    if (spawner.spawning == null) {
      // Finds all creeps owned by the given spawner by role.
      var roomcreepsharvester = spawner.room.find(FIND_MY_CREEPS, {
        filter: (x) => {
          return (
            x.memory.homespawner == spawner.name && x.memory.role == "harvester"
          );
        },
      });

      var roomcreepsupgrader = spawner.room.find(FIND_MY_CREEPS, {
        filter: (x) => {
          return (
            x.memory.homespawner == spawner.name && x.memory.role == "upgrader"
          );
        },
      });

      var roomcreepsbuilder = spawner.room.find(FIND_MY_CREEPS, {
        filter: (x) => {
          return (
            x.memory.homespawner == spawner.name && x.memory.role == "builder"
          );
        },
      });

      var roomcreepsrepairer = spawner.room.find(FIND_MY_CREEPS, {
        filter: (x) => {
          return (
            x.memory.homespawner == spawner.name && x.memory.role == "repairer"
          );
        },
      });

      var roomcreepstoragemanager = spawner.room.find(FIND_MY_CREEPS, {
        filter: (x) => {
          return (
            x.memory.homespawner == spawner.name &&
            x.memory.role == "storagemanager"
          );
        },
      });

      var roomcreepsrangedefender = spawner.room.find(FIND_MY_CREEPS, {
        filter: (x) => {
          return (
            x.memory.homespawner == spawner.name &&
            x.memory.role == "rangedefender"
          );
        },
      });

      var sources = spawner.memory.roomsources || [];

      // Spawns defenders as needed when hostiles are detected.
      if (hostile.length > roomcreepsrangedefender.length) {
        var newName = "rangedefender" + Game.time;
        if (spawnEng >= 450 && spawner.spawning == null) {
          console.log("Spawning new defender: " + newName);
          spawner.spawnCreep(
            [RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE],
            newName,
            {
              memory: { role: "rangedefender", homespawner: spawner.name },
            }
          );
          return;
        }
      }

      // Spawns harvesters if there are fewer harvesters than sources to harvest.
      if (roomcreepsharvester.length < sources.length) {
        // Find which source is not yet assigned
        var assignedSources = roomcreepsharvester.map(
          (c) => c.memory.roomsources
        );
        var unassignedSources = sources.filter(
          (s) => !assignedSources.includes(s.id)
        );
        var targetSource =
          unassignedSources.length > 0 ? unassignedSources[0] : sources[0];
        var targetSourceId = targetSource ? targetSource.id : null;

        var newName = "harvester" + Game.time;

        // Emergency harvester if all harvesters died and energy is low (200-299)
        if (roomcreepsharvester.length == 0 && spawnEng >= 200 && spawnEng < 300) {
          console.log("Spawning emergency basic harvester: " + newName);
          spawner.spawnCreep([WORK, CARRY, MOVE], newName, {
            memory: {
              role: "harvester",
              task: "harvesting",
              homespawner: spawner.name,
              roomsources: targetSourceId,
            },
          });
          return;
        }

        // Standard dynamic harvester if energy >= 300
        if (spawnEng >= 300 && spawner.spawning == null) {
          var workParts = Math.min(5, Math.max(1, Math.floor((spawnEng - 100) / 100)));
          var bodysize = [CARRY, MOVE];
          for (var w = 0; w < workParts; w++) {
            bodysize.push(WORK);
          }
          console.log("Spawning new harvester: " + newName);
          spawner.spawnCreep(bodysize, newName, {
            memory: {
              role: "harvester",
              task: "harvesting",
              homespawner: spawner.name,
              roomsources: targetSourceId,
            },
          });
          return;
        }
      } else {
        // If less than 2 upgraders, spawns more based on available energy.
        if (roomcreepsupgrader.length < 2) {
          var newName = "upgrader" + Game.time;
          if (spawnEng >= 600 && spawner.spawning == null) {
            console.log("Spawning new upgrader (large): " + newName);
            spawner.spawnCreep(
              [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              newName,
              { memory: { role: "upgrader", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 400 && spawner.spawning == null) {
            console.log("Spawning new upgrader (medium): " + newName);
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              newName,
              { memory: { role: "upgrader", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 300 && spawner.spawning == null) {
            console.log("Spawning new upgrader (basic): " + newName);
            spawner.spawnCreep([WORK, WORK, CARRY, MOVE], newName, {
              memory: { role: "upgrader", homespawner: spawner.name },
            });
            return;
          }
        }

        // If less than 3 builders, spawns more ONLY if there are construction sites.
        var hasConstructionSites =
          spawner.room.find(FIND_CONSTRUCTION_SITES).length > 0;
        var storageWithEnergy = spawner.room.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE) &&
              structure.store[RESOURCE_ENERGY] > 100
            );
          },
        });

        if (
          roomcreepsbuilder.length < 3 &&
          hasConstructionSites &&
          (storageWithEnergy.length > 0 || roomcreepsbuilder.length < 1)
        ) {
          var newName = "builder" + Game.time;
          if (spawnEng >= 600 && spawner.spawning == null) {
            console.log("Spawning new builder (large): " + newName);
            spawner.spawnCreep(
              [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              newName,
              { memory: { role: "builder", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 400 && spawner.spawning == null) {
            console.log("Spawning new builder (medium): " + newName);
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              newName,
              { memory: { role: "builder", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 300 && spawner.spawning == null) {
            console.log("Spawning new builder (basic): " + newName);
            spawner.spawnCreep([WORK, WORK, CARRY, MOVE], newName, {
              memory: { role: "builder", homespawner: spawner.name },
            });
            return;
          }
        }

        // If less than 2 repairers, spawns repairer if containers or damaged structures exist.
        if (roomcreepsrepairer.length < 2) {
          var newName = "repairer" + Game.time;
          var hasContainers =
            spawner.room.find(FIND_STRUCTURES, {
              filter: (structure) => {
                return (
                  structure.structureType == STRUCTURE_CONTAINER ||
                  structure.structureType == STRUCTURE_STORAGE
                );
              },
            }).length > 0;

          if (hasContainers && spawnEng >= 400 && spawner.spawning == null) {
            console.log("Spawning new repairer: " + newName);
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              newName,
              { memory: { role: "repairer", homespawner: spawner.name } }
            );
            return;
          } else if (
            hasContainers &&
            spawnEng >= 300 &&
            spawner.spawning == null
          ) {
            console.log("Spawning new repairer (basic): " + newName);
            spawner.spawnCreep([WORK, CARRY, CARRY, MOVE], newName, {
              memory: { role: "repairer", homespawner: spawner.name },
            });
            return;
          }
        }

        // If less than required storage managers and containers/storage exist.
        var containersOrStorage = spawner.room.find(FIND_STRUCTURES, {
          filter: (structure) => {
            return (
              structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_STORAGE
            );
          },
        });

        if (
          roomcreepstoragemanager.length < sources.length + 1 &&
          containersOrStorage.length > 0
        ) {
          var newName = "storagemanager" + Game.time;
          if (spawnEng >= 400 && spawner.spawning == null) {
            console.log("Spawning new storagemanager: " + newName);
            spawner.spawnCreep(
              [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
              newName,
              { memory: { role: "storagemanager", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 300 && spawner.spawning == null) {
            console.log("Spawning new storagemanager (basic): " + newName);
            spawner.spawnCreep(
              [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
              newName,
              { memory: { role: "storagemanager", homespawner: spawner.name } }
            );
            return;
          }
        }

        // If nothing else to spawn and room controller is not max level, spawn extra upgraders up to 6.
        if (
          spawner.spawning == null &&
          spawner.room.controller &&
          spawner.room.controller.level < 8 &&
          roomcreepsupgrader.length < 6 &&
          spawnEng >= 600
        ) {
          var newName = "upgrader" + Game.time;
          spawner.spawnCreep(
            [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],
            newName,
            {
              memory: { role: "upgrader", homespawner: spawner.name },
            }
          );
        }
      }
    }
  },
};

module.exports = functionSpawn;
