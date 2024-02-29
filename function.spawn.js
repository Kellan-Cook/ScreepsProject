var functionSpawn = {
  run: function (curspawner) {
    var spawner = Game.spawns[curspawner];
    var spawnEng = spawner.room.energyAvailable;

    if (spawner.memory.firstrun === undefined) {
      spawner.memory.roomsources = spawner.room.find(FIND_SOURCES);

      spawner.memory.firstrun = false;
    }

    var hostile = spawner.room.find(FIND_HOSTILE_CREEPS);

    if (hostile.length > 0) {
      Game.notify(
        "SPWNER: " + spawner.name + "DETECTED HOSTILE" + hostile[0].owner.username
      );
      console.log("HOSTLE DETECTED: " + hostile[0].id);
    }

    if (spawner.spawning == null) {




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

      if (roomcreepsharvester.length < sources.length) {
        var goodtarget = spawner.memory.roomsources;
        var optimaltarget = spawner.memory.roomsources;
        //console.log(goodtarget[0].id)
        roomcreepsharvester.forEach(function (arrayItem) {
          goodtarget.forEach(function (goodItem) {
            var obj = arrayItem.memory.roomsources;

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

        var harvesterbodygroup = Math.floor(spawnEng / 400);
        var bodysize = [];
        if (spawnEng >= 400 && spawner.spawning == null) {
          while (harvesterbodygroup > 0) {
            bodysize.push(WORK, WORK, CARRY, CARRY, CARRY, MOVE);
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

        if (
          roomcreepsbuilder.length < 2 &&
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
        if (roomcreepsrepairer.length < 2) {
          var newName = "repairer" + Game.time;
          if (spawnEng >= 400 && spawner.spawning == null) {
            console.log("spawning new repairer: " + newName);
            spawner.spawnCreep(
              [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
              newName,
              { memory: { role: "repairer", homespawner: spawner.name } }
            );
          }
        }
        if (roomcreepstoragemanager.length < 1) {
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
          spawner.spawnCreep(
            [
              WORK,
              WORK,
              WORK,
              WORK,
              CARRY,
              CARRY,
              CARRY,
              CARRY,
              CARRY,
              MOVE,
              MOVE,
            ],
            newName,
            { memory: { role: "upgrader", homespawner: spawner.name } }
          );
        }
      }
    }
  },
};
module.exports = functionSpawn;
