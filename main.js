/**
 * @file This is the main entry point for the Screeps AI.
 * @author YOUR_NAME
 * @version 1.0
 */

var roleHarvester = require("role.harvester");
var roleUpgrader = require("role.upgrader");
var roleBuilder = require("role.builder");
var roleRepair = require("role.repair");
var functionSpawn = require("function.spawn");
var roleRangeDefender = require("role.rangedefender");
var rolestoragemanager = require("role.storagemanager");

//var roomBuilder = require('roomBuilder');

/**
 * This is the main game loop. It is called every tick.
 */
module.exports.loop = function () {
  // Initializes the memory for the rooms if it is not already initialized.
  if(Memory.myrooms == undefined){
    Memory.myrooms = [];
  }
  // Runs the spawn logic for each spawner in the game.
  for (var CurSpawn in Game.spawns) {
    functionSpawn.run(CurSpawn);
  }

  /*
  for (var gamestruture in Game.structures){
    
    gamestruture.find(FIND_MY_STRUCTURES, {
    filter: (structure) => {
      return structure.structureType == STRUCTURE_TOWER;
    },
  }) 
    roletower.run(curtower);
  }
  */

  // Clears the memory of creeps that are no longer in the game.
  for (var name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
      console.log("Clearing non-existing creep memory:", name);
    }
  }
  // Counts the number of creeps of each role.

  var harvesterNumber = _.filter(
    Game.creeps,
    (creep) => creep.memory.role == "harvester"
  );
  var upgraderNumber = _.filter(
    Game.creeps,
    (creep) => creep.memory.role == "upgrader"
  );
  var builderNumber = _.filter(
    Game.creeps,
    (creep) => creep.memory.role == "builder"
  );
  var smallMeleeNumber = _.filter(
    Game.creeps,
    (creep) => creep.memory.role == "small_melee"
  );
  var repairer = _.filter(
    Game.creeps,
    (creep) => creep.memory.role == "repairer"
  );

  // Logs the number of creeps of each role to the console every 10 ticks.
  var tentick = String(Game.time);
  tentick = tentick.slice(-1);
  if (tentick == "0") {
    console.log("time: " + Game.time + " ===================");
    console.log("Harvesters: " + harvesterNumber.length);
    console.log("upgrader: " + upgraderNumber.length);
    console.log("builder: " + builderNumber.length);
    console.log("small melee: " + smallMeleeNumber.length);
    console.log("repairer: " + repairer.length);
  }

 

  // Runs the logic for each creep based on its role.

  for (var name in Game.creeps) {
    var creep = Game.creeps[name];
    if (creep.memory.role == "rangedefender") {
      roleRangeDefender.run(creep);
    }
    if (creep.memory.role == "harvester") {
      roleHarvester.run(creep);
    }
    if (creep.memory.role == "upgrader") {
      roleUpgrader.run(creep);
    }
    if (creep.memory.role == "builder") {
      roleBuilder.run(creep);
    }
    if (creep.memory.role == "repairer") {
      roleRepair.run(creep);
    }
    if (creep.memory.role == "storagemanager") {
      rolestoragemanager.run(creep);
    }
  }
};