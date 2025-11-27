/**
 * @file function.spawn.js
 * @description Manages the spawning logic for creeps, including role assignment and body part configuration.
 * @author Kellan Cook
 * @version 0.2
 */

const { isInteger } = require("lodash");
var roletower = require("role.tower");
var roomBuilder = require("roomBuilder");

var functionSpawn = {
  /**
   * Main entry point for spawner logic. Executed for each spawner.
   * @param {string} curspawner - The name of the spawner to run logic for.
   */
  run: function (curspawner) {
    var spawner = Game.spawns[curspawner];
    var spawnEng = spawner.room.energyAvailable;

    // Initialize spawner memory on first run
    if (spawner.memory.firstrun === undefined) {
      spawner.memory.roomsources = spawner.room.find(FIND_SOURCES);
      Memory.myrooms.push(spawner.room.name);
      roomBuilder.run(spawner);
      spawner.memory.firstrun = false;
    }

    // Periodically run room builder (every 1000 ticks)
    if (String(Game.time).slice(-3) == "000") {
      roomBuilder.run(spawner);
    }

    // Check for hostile creeps
    var hostile = spawner.room.find(FIND_HOSTILE_CREEPS);

    // Tower logic (commented out)
    var towers = spawner.room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_TOWER },
    });

    //for (tower in towers){

    //if(tower != null && tower !== undefined){
    //roletower.run(tower);
    //}
    //}

    // Notify if hostiles detected
    if (hostile.length > 0) {
      Game.notify(
        "SPAWNER: " +
        spawner.name +
        " DETECTED HOSTILE" +
        hostile[0].owner.username
      );
      console.log("HOSTLE DETECTED: " + hostile[0].id);
    }

    // Spawning logic (only if not currently spawning)
    if (spawner.spawning == null) {
      // Count existing creeps by role
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

      var sources = spawner.memory.roomsources;
      var roomcreeps = spawner.room.find(FIND_MY_CREEPS);

      // Spawn defenders if needed
      if (hostile.length > roomcreepsrangedefender) {
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
        }
      }

      // Spawn harvesters if needed
      if (roomcreepsharvester.length < sources.length && spawnEng > 299) {
        var goodtarget = spawner.memory.roomsources;
        var optimaltarget = spawner.memory.roomsources;
        roomcreepsharvester.forEach(function (arrayItem) {
          goodtarget.forEach(function (goodItem) {
            var obj = arrayItem.memory.roomsources;
            // Determine which source needs a harvester
            if (goodItem.id == obj) {
              console.log("SLICED: " + goodItem.id);
              console.log("before: " + goodtarget[0].id);
              optimaltarget = optimaltarget.filter(function (
                value,
                index,
                arr
              ) {
                return value != goodItem;
              });
              console.log("after : " + optimaltarget[0].id);
            }
          });
        });

        var newName = "harvester" + Game.time;

        var harvesterbodygroup = Math.floor((spawnEng - 100) / 100);
        var bodysize = [];
        bodysize.push(CARRY, MOVE)

        // Dynamic harvester body based on energy
        if (spawnEng >= 200 && spawner.spawning == null) {
          while (harvesterbodygroup > 0) {
            bodysize.push(WORK);
            harvesterbodygroup = harvesterbodygroup - 1;
          }
          console.log("Spawning new harvester 1: " + newName);
          spawner.spawnCreep(bodysize, newName, {
            memory: {
              role: "harvester",
              task: "harvesting",
              homespawner: spawner.name,
              roomsources: optimaltarget[0].id,
            },
          });
        } else if (
          // Fallback to basic harvester if low energy or no harvesters
          (roomcreepsharvester.length == 0 && spawner.spawning == null) ||
          (spawnEng < 400 && spawner.spawning == null && spawnEng >= 300)
        ) {
          console.log("Spawning new harvester basic: " + newName);
          spawner.spawnCreep([WORK, WORK, CARRY, MOVE], newName, {
            memory: {
              role: "harvester",
              task: "harvesting",
              homespawner: spawner.name,
              roomsources: optimaltarget[0].id,
            },
          });
        }
      } else {
        // Spawn upgraders
        if (roomcreepsupgrader.length < 2) {
          var newName = "upgrader" + Game.time;
          if (spawnEng == 300 && spawner.spawning == null) {
            console.log("Spawning new upgrader: " + newName);
            spawner.spawnCreep([WORK, WORK, CARRY, MOVE], newName, {
              memory: { role: "upgrader", homespawner: spawner.name },
            });
          }
          if (spawnEng >= 400 && spawner.spawning == null) {
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, CARRY, MOVE],
              newName,
              { memory: { role: "upgrader", homespawner: spawner.name } }
            );
          }
          if (spawnEng >= 600 && spawner.spawning == null) {
            spawner.spawnCreep(
              [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE],
              newName,
              { memory: { role: "upgrader", homespawner: spawner.name } }
            );
          }
        }
        // Spawn builders
        if (
          roomcreepsbuilder.length < 3 &&
          spawner.room.find(FIND_CONSTRUCTION_SITES).length > 0 &&
          (spawner.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
              return (
                (structure.structureType == STRUCTURE_CONTAINER ||
                  structure.structureType == STRUCTURE_STORAGE) &&
                structure.store[RESOURCE_ENERGY] > 100
              );
            },
          }) ||
            roomcreepsbuilder < 1)
        ) {
          var newName = "builder" + Game.time;
          if (spawnEng == 300 && spawner.spawning == null) {
            console.log("Spawning new builder: " + newName);
            spawner.spawnCreep([WORK, WORK, CARRY, MOVE], newName, {
              memory: { role: "builder", homespawner: spawner.name },
            });
          }
          if (spawnEng >= 400 && spawner.spawning == null) {
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              newName,
              { memory: { role: "builder", homespawner: spawner.name } }
            );
          }
          if (spawnEng >= 600 && spawner.spawning == null) {
            spawner.spawnCreep(
              [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              newName,
              { memory: { role: "builder", homespawner: spawner.name } }
            );
          }
        }
        // Spawn repairers
        if (roomcreepsrepairer.length < 2) {
          var newName = "repairer" + Game.time;
          if (
            spawnEng >= 400 &&
            spawner.spawning == null &&
            spawner.room.find(FIND_STRUCTURES, {
              filter: (structure) => {
                return (
                  structure.structureType == STRUCTURE_CONTAINER ||
                  (structure.structureType == STRUCTURE_STORAGE &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                );
              },
            }).length >= 1
          ) {
            console.log("spawning new repairer: " + newName);
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              newName,
              { memory: { role: "repairer", homespawner: spawner.name } }
            );
          }
        }
        // Spawn storage managers
        if (
          roomcreepstoragemanager.length < sources.length + 1 &&
          spawner.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
              return (
                (structure.structureType == STRUCTURE_EXTENSION &&
                  structure.structureType == STRUCTURE_CONTAINER) ||
                structure.structureType == STRUCTURE_STORAGE
              );
            },
          })
        ) {
          var newName = "storagemanager" + Game.time;
          if (spawnEng >= 400 && spawner.spawning == null) {
            console.log("spawning new storagemanager: " + newName);
            spawner.spawnCreep(
              [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
              newName,
              { memory: { role: "storagemanager", homespawner: spawner.name } }
            );
          }
        }
        // Spawn extra upgraders if room is stable
        if (
          spawner.spawning == null &&
          spawner.room.controller.level < 8 &&
          roomcreepsupgrader.length < 6 &&
          spawnEng >= 600
        ) {
          var newName = "upgrader" + Game.time;
          var upgraderbodygroup = Math.floor(spawnEng / 600);
          var bodysize = [];
          while (upgraderbodygroup > 0) {
            bodysize.push(WORK, WORK, CARRY, CARRY, CARRY, MOVE);
            upgraderbodygroup = upgraderbodygroup - 1;
          }
          spawner.spawnCreep(bodysize, newName, {
            memory: { role: "upgrader", homespawner: spawner.name },
          });
        }
      }
    }
  },
};
module.exports = functionSpawn;