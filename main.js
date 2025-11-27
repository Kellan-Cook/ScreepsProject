/**
 * @file main.js
 * @description The main entry point for the Screeps AI. Handles the game loop, memory management, and creep execution.
 * @author Kellan Cook
 * @version 0.2
 */

var roleHarvester = require("role.harvester");
var roleUpgrader = require("role.upgrader");
var roleBuilder = require("role.builder");
var roleRepair = require("role.repair");
var functionSpawn = require("function.spawn");
var roleRangeDefender = require("role.rangedefender");
var rolestoragemanager = require("role.storagemanager");
var roleTower = require("role.tower");

//var roomBuilder = require('roomBuilder');

/**
 * The main game loop. Executed every tick.
 */
module.exports.loop = function () {
  // Initialize room memory if needed
  if (Memory.myrooms == undefined) {
    Memory.myrooms = [];
  }

  // Execute spawn logic for each spawner
  for (var CurSpawn in Game.spawns) {
    functionSpawn.run(CurSpawn);
  }

  // Execute tower logic
  var towers = _.filter(Game.structures, (s) => s.structureType == STRUCTURE_TOWER);
  for (var tower of towers) {
    roleTower.run(tower);
  }

  // Garbage collection: Clear memory of deceased creeps
  for (var name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
      console.log("Clearing non-existing creep memory:", name);
    }
  }

  // Count creeps by role for monitoring
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

  // Log creep counts every 10 ticks
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

  // Execute role logic for each creep
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