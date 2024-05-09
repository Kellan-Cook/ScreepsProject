var functionSpawn = {
  run: function (curspawner) {
    var spawner = Game.spawns[curspawner];
    var spawnEng = spawner.room.energyAvailable;

    //checks if the spawner was just created
    if (spawner.memory.firstrun === undefined) {
      spawner.memory.roomsources = spawner.room.find(FIND_SOURCES);

      spawner.memory.firstrun = false;
    }

    //checks for hostile creeps to cause an alert and start spawning of defenders
    var hostile = spawner.room.find(FIND_HOSTILE_CREEPS);

    if (hostile.length > 0) {
      Game.notify(
        "SPWNER: " +
          spawner.name +
          "DETECTED HOSTILE" +
          hostile[0].owner.username
      );
      console.log("HOSTLE DETECTED: " + hostile[0].id);
    }

    if (spawner.spawning == null) {
      //finds all creeps owned by the given spawner
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
      //spawns defenders as needed
      if (hostile.length >= roomcreepsrangedefender) {
        var newName = "rangedefender" + Game.time;
        if (spawnEng >= 450 && spawner.spawning == null) {
          console.log("Spawning new upgrader: " + newName);
          spawner.spawnCreep(
            [RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE],
            newName,
            {
              memory: { role: "rangedefender", homespawner: spawner.name },
            }
          );
        }
      }
      //spawns harvesters if theire are less harvesters then sources to harvest
      if (roomcreepsharvester.length < sources.length) {
        var goodtarget = spawner.memory.roomsources;
        var optimaltarget = spawner.memory.roomsources;
        roomcreepsharvester.forEach(function (arrayItem) {
          goodtarget.forEach(function (goodItem) {
            var obj = arrayItem.memory.roomsources;
            //checks wich sources need a harvester to set harvester memory state
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
        //sets the name of the harvester based on a combination of theire role and game time
        var newName = "harvester" + Game.time;

        var harvesterbodygroup = Math.floor(spawnEng / 400);
        var bodysize = [];
        //dynamicly creats harvesters based on predefined blocks based on the amount of resources
        if (spawnEng >= 400 && spawner.spawning == null) {
          while (harvesterbodygroup > 0) {
            bodysize.push(WORK, WORK, CARRY, CARRY, CARRY, MOVE);
            harvesterbodygroup = harvesterbodygroup - 1;
          }
          //spawns the dynamic harvester
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
          //if not eneugh resources for larger harvesters spawn a predefined basic harvester
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
        //if less then 2 upgraders spawns more based on predefined layouts
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
        //if less then 2 builders spawns more based on predefined layouts ONLY if theire is currently somthing to build in the room
        if (
          roomcreepsbuilder.length < 3 &&
          spawner.room.find(FIND_CONSTRUCTION_SITES).length > 0
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
        //if less then 2 repairers and storage exists with capacity spawns more based on predefined layout
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
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) != 0)
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
        //if less then 1 store manager spawns 1 with predefined layout
        if (
          roomcreepstoragemanager.length < 1 &&
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
        //if theire is nothing else to spawn and the room controler is not max level spawns up to 6 upgraders
        /*
        if (
          spawner.spawning == null &&
          spawner.room.controller.level < 8 &&
          roomcreepsupgrader.length < 6 &&
          spawnEng >= 1000
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
        */
      }
    }
  },
};
module.exports = functionSpawn;
