/**
 * @file This module contains the logic for spawning creeps in the Screeps game.
 * @author Kellan Cook
 * @version 0.2
 */

const { isInteger } = require("lodash");
var roletower = require("role.tower");
var functionSpawn = {
  /**
   * This function is the main entry point for the spawner logic. It is called for each spawner in the game.
   * @param {string} curspawner - The name of the spawner to run the logic for.
   */
  run: function (curspawner) {
    var spawner = Game.spawns[curspawner];
    var spawnEng = spawner.room.energyAvailable;
    // Checks if the spawner was just created. If so, it initializes the spawner's memory.
    if (spawner.memory.firstrun === undefined) {
      spawner.memory.roomsources = spawner.room.find(FIND_SOURCES);
      Memory.myrooms.push(spawner.room.name);

      spawner.memory.firstrun = false;
    }
    // Checks for hostile creeps in the room. If any are found, it sends a notification and logs a message to the console.
    var hostile = spawner.room.find(FIND_HOSTILE_CREEPS);

    // Runs the logic for all towers in the room.
    var towers = spawner.room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_TOWER },
    });

    //for (tower in towers){

      //if(tower != null && tower !== undefined){
        //roletower.run(tower);
      //}
    //}

    if (hostile.length > 0) {
      Game.notify(
        "SPAWNER: " +
          spawner.name +
          " DETECTED HOSTILE" +
          hostile[0].owner.username
      );
      console.log("HOSTLE DETECTED: " + hostile[0].id);
    }

    // If the spawner is not currently spawning a creep, it runs the logic for spawning new creeps.
    if (spawner.spawning == null) {
      // Finds all creeps owned by the given spawner.
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
      // Spawns defenders as needed.
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
      // Spawns harvesters if there are less harvesters then sources to harvest.
      if (roomcreepsharvester.length < sources.length && spawnEng > 299) {
        var goodtarget = spawner.memory.roomsources;
        var optimaltarget = spawner.memory.roomsources;
        roomcreepsharvester.forEach(function (arrayItem) {
          goodtarget.forEach(function (goodItem) {
            var obj = arrayItem.memory.roomsources;
            // Checks which sources need a harvester to set harvester memory state.
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
        // Sets the name of the harvester based on a combination of their role and game time.
        var newName = "harvester" + Game.time;

        var harvesterbodygroup = Math.floor((spawnEng - 100) / 100);
        var bodysize = [];
        bodysize.push(CARRY, MOVE)
        // Dynamically creates harvesters based on predefined blocks based on the amount of resources.
        if (spawnEng >= 200 && spawner.spawning == null) {
          while (harvesterbodygroup > 0) {
            bodysize.push(WORK);
            harvesterbodygroup = harvesterbodygroup - 1;
          }
          // Spawns the dynamic harvester.
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
          // If not enough resources for larger harvesters, spawn a predefined basic harvester.
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
        // If less then 2 upgraders, spawns more based on predefined layouts.
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
        // If less then 3 builders, spawns more based on predefined layouts ONLY if there is currently something to build in the room and only 1 if there is no storage.
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
        // If less then 2 repairers and storage exists with capacity, spawns more based on predefined layout.
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
        // If less then 1 store manager, spawns 1 with predefined layout.
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
        // If there is nothing else to spawn and the room controller is not max level, spawns up to 6 upgraders.
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