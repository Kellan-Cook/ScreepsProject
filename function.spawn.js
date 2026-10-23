/**
 * @file This module contains the logic for spawning creeps in the Screeps game.
 * @author Kellan Cook
 * @version 0.4
 */

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
    var currentRCL = spawner.room.controller
      ? spawner.room.controller.level
      : 0;
    var ranBuilderThisTick = false;

    // Checks if the spawner was just created, respawned in a new room, or memory needs initialization.
    if (
      spawner.memory.firstrun === undefined ||
      spawner.memory.roomName !== spawner.room.name ||
      !spawner.memory.roomsources ||
      (spawner.memory.roomsources.length > 0 &&
        spawner.memory.roomsources[0].room !== undefined)
    ) {
      spawner.memory.roomName = spawner.room.name;
      // Store plain source references with IDs to avoid serialization bloat
      spawner.memory.roomsources = spawner.room
        .find(FIND_SOURCES)
        .map((s) => ({ id: s.id }));

      if (Memory.myrooms && !Memory.myrooms.includes(spawner.room.name)) {
        Memory.myrooms.push(spawner.room.name);
      }
      spawner.memory.lastRCL = currentRCL;
      spawner.memory.firstrun = false;
      roomBuilder.run(spawner);
      ranBuilderThisTick = true;
    }

    if (
      !ranBuilderThisTick &&
      (spawner.memory.lastRCL !== currentRCL || Game.time % 200 === 0)
    ) {
      spawner.memory.lastRCL = currentRCL;
      roomBuilder.run(spawner);
    }

    // Checks for hostile creeps in the room. If any are found, it sends a notification and logs a message to the console.
    var hostile = spawner.room.find(FIND_HOSTILE_CREEPS);

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
      // Single-pass lookup of all creeps owned by the given spawner grouped by role.
      var allRoomCreeps = spawner.room.find(FIND_MY_CREEPS);
      var roomcreepsharvester = [];
      var roomcreepsupgrader = [];
      var roomcreepsbuilder = [];
      var roomcreepsrepairer = [];
      var roomcreepstoragemanager = [];
      var roomcreepsrangedefender = [];

      for (var c = 0; c < allRoomCreeps.length; c++) {
        var creep = allRoomCreeps[c];
        if (creep.memory.homespawner !== spawner.name) continue;
        switch (creep.memory.role) {
          case "harvester":
            roomcreepsharvester.push(creep);
            break;
          case "upgrader":
            roomcreepsupgrader.push(creep);
            break;
          case "builder":
            roomcreepsbuilder.push(creep);
            break;
          case "repairer":
            roomcreepsrepairer.push(creep);
            break;
          case "storagemanager":
            roomcreepstoragemanager.push(creep);
            break;
          case "rangedefender":
            roomcreepsrangedefender.push(creep);
            break;
        }
      }

      var sources = spawner.memory.roomsources || [];
      var containersOrStorage = spawner.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (
            structure.structureType == STRUCTURE_CONTAINER ||
            structure.structureType == STRUCTURE_STORAGE
          );
        },
      });

      // 1. Spawns defenders as needed when hostiles are detected.
      if (hostile.length > roomcreepsrangedefender.length) {
        var defenderName = "rangedefender" + Game.time;
        if (spawnEng >= 450 && spawner.spawning == null) {
          console.log("Spawning new defender: " + defenderName);
          spawner.spawnCreep(
            [RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE],
            defenderName,
            {
              memory: { role: "rangedefender", homespawner: spawner.name },
            }
          );
          return;
        } else if (spawnEng >= 260 && spawner.spawning == null) {
          console.log("Spawning basic defender: " + defenderName);
          spawner.spawnCreep([RANGED_ATTACK, MOVE, MOVE], defenderName, {
            memory: { role: "rangedefender", homespawner: spawner.name },
          });
          return;
        }
      }

      // 2. Emergency storage manager check: if at least 1 harvester and containers exist,
      // but 0 storage managers exist, spawn a storage manager so container energy reaches the spawn!
      if (
        roomcreepsharvester.length > 0 &&
        containersOrStorage.length > 0 &&
        roomcreepstoragemanager.length === 0
      ) {
        var emSmName = "storagemanager" + Game.time;
        if (spawnEng >= 400 && spawner.spawning == null) {
          console.log("Spawning new storagemanager: " + emSmName);
          spawner.spawnCreep(
            [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
            emSmName,
            { memory: { role: "storagemanager", homespawner: spawner.name } }
          );
          return;
        } else if (spawnEng >= 300 && spawner.spawning == null) {
          console.log("Spawning new storagemanager (basic): " + emSmName);
          spawner.spawnCreep(
            [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
            emSmName,
            { memory: { role: "storagemanager", homespawner: spawner.name } }
          );
          return;
        } else if (spawnEng >= 200 && spawner.spawning == null) {
          console.log("Spawning emergency storagemanager: " + emSmName);
          spawner.spawnCreep([CARRY, CARRY, MOVE, MOVE], emSmName, {
            memory: { role: "storagemanager", homespawner: spawner.name },
          });
          return;
        }
      }

      // 3. Spawns harvesters if there are fewer harvesters than sources to harvest.
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

        var harvName = "harvester" + Game.time;

        // Emergency harvester if all harvesters died and energy is low (200-299)
        if (
          roomcreepsharvester.length == 0 &&
          spawnEng >= 200 &&
          spawnEng < 300
        ) {
          console.log("Spawning emergency basic harvester: " + harvName);
          spawner.spawnCreep([WORK, CARRY, MOVE], harvName, {
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
          var workParts = Math.min(
            5,
            Math.max(1, Math.floor((spawnEng - 100) / 100))
          );
          var remainingEnergy = spawnEng - (workParts * 100 + 50);
          var moveParts = Math.min(
            workParts,
            Math.max(1, Math.floor(remainingEnergy / 50))
          );
          var bodysize = [CARRY];
          for (var m = 0; m < moveParts; m++) {
            bodysize.push(MOVE);
          }
          for (var w = 0; w < workParts; w++) {
            bodysize.push(WORK);
          }
          console.log("Spawning new harvester: " + harvName);
          spawner.spawnCreep(bodysize, harvName, {
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
        // 4. Ensure core storage managers (1 per source when containers exist) before spawning heavy consumers
        if (
          containersOrStorage.length > 0 &&
          roomcreepstoragemanager.length < sources.length
        ) {
          var smName = "storagemanager" + Game.time;
          if (spawnEng >= 400 && spawner.spawning == null) {
            console.log("Spawning new storagemanager: " + smName);
            spawner.spawnCreep(
              [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
              smName,
              { memory: { role: "storagemanager", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 300 && spawner.spawning == null) {
            console.log("Spawning new storagemanager (basic): " + smName);
            spawner.spawnCreep(
              [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
              smName,
              { memory: { role: "storagemanager", homespawner: spawner.name } }
            );
            return;
          }
        }

        // 5. If less than 2 upgraders, spawns more based on available energy.
        if (roomcreepsupgrader.length < 2) {
          var upgName = "upgrader" + Game.time;
          if (spawnEng >= 600 && spawner.spawning == null) {
            console.log("Spawning new upgrader (large): " + upgName);
            spawner.spawnCreep(
              [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              upgName,
              { memory: { role: "upgrader", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 400 && spawner.spawning == null) {
            console.log("Spawning new upgrader (medium): " + upgName);
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              upgName,
              { memory: { role: "upgrader", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 300 && spawner.spawning == null) {
            console.log("Spawning new upgrader (basic): " + upgName);
            spawner.spawnCreep([WORK, WORK, CARRY, MOVE], upgName, {
              memory: { role: "upgrader", homespawner: spawner.name },
            });
            return;
          }
        }

        // 6. If less than 3 builders, spawns more ONLY if there are construction sites.
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
          var bldName = "builder" + Game.time;
          if (spawnEng >= 600 && spawner.spawning == null) {
            console.log("Spawning new builder (large): " + bldName);
            spawner.spawnCreep(
              [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              bldName,
              { memory: { role: "builder", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 400 && spawner.spawning == null) {
            console.log("Spawning new builder (medium): " + bldName);
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              bldName,
              { memory: { role: "builder", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 300 && spawner.spawning == null) {
            console.log("Spawning new builder (basic): " + bldName);
            spawner.spawnCreep([WORK, WORK, CARRY, MOVE], bldName, {
              memory: { role: "builder", homespawner: spawner.name },
            });
            return;
          }
        }

        // 7. If less than 2 repairers, spawns repairer if containers or damaged structures exist.
        if (roomcreepsrepairer.length < 2) {
          var repName = "repairer" + Game.time;
          var hasContainers = containersOrStorage.length > 0;

          if (hasContainers && spawnEng >= 400 && spawner.spawning == null) {
            console.log("Spawning new repairer: " + repName);
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              repName,
              { memory: { role: "repairer", homespawner: spawner.name } }
            );
            return;
          } else if (
            hasContainers &&
            spawnEng >= 300 &&
            spawner.spawning == null
          ) {
            console.log("Spawning new repairer (basic): " + repName);
            spawner.spawnCreep([WORK, CARRY, CARRY, MOVE], repName, {
              memory: { role: "repairer", homespawner: spawner.name },
            });
            return;
          }
        }

        // 8. Additional storage manager (sources.length + 1) to support controller container hauling
        if (
          roomcreepstoragemanager.length < sources.length + 1 &&
          containersOrStorage.length > 0
        ) {
          var extraSmName = "storagemanager" + Game.time;
          if (spawnEng >= 400 && spawner.spawning == null) {
            console.log("Spawning new storagemanager: " + extraSmName);
            spawner.spawnCreep(
              [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
              extraSmName,
              { memory: { role: "storagemanager", homespawner: spawner.name } }
            );
            return;
          } else if (spawnEng >= 300 && spawner.spawning == null) {
            console.log("Spawning new storagemanager (basic): " + extraSmName);
            spawner.spawnCreep(
              [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
              extraSmName,
              { memory: { role: "storagemanager", homespawner: spawner.name } }
            );
            return;
          }
        }

        // 9. If nothing else to spawn and room controller is not max level, spawn extra upgraders up to 6.
        if (
          spawner.spawning == null &&
          spawner.room.controller &&
          spawner.room.controller.level < 8 &&
          roomcreepsupgrader.length < 6 &&
          spawnEng >= 600
        ) {
          var extraUpgName = "upgrader" + Game.time;
          spawner.spawnCreep(
            [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],
            extraUpgName,
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
