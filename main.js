/**
 * @file This is the main entry point for the Screeps AI.
 * @author Kellan Cook
 * @version 0.3
 */

var roleHarvester = require("role.harvester");
var roleUpgrader = require("role.upgrader");
var roleBuilder = require("role.builder");
var roleRepair = require("role.repair");
var functionSpawn = require("function.spawn");
var roleRangeDefender = require("role.rangedefender");
var roleMelee = require("role.melee");
var rolestoragemanager = require("role.storagemanager");
var roleTower = require("role.tower");

/**
 * This is the main game loop. It is called every tick.
 */
module.exports.loop = function () {
  // Initializes the memory for the rooms if it is not already initialized.
  if (Memory.myrooms == undefined) {
    Memory.myrooms = [];
  }

  // Runs the spawn logic for each spawner in the game.
  for (var CurSpawn in Game.spawns) {
    functionSpawn.run(CurSpawn);
  }

  // Runs tower logic across all visible towers in player-controlled rooms
  var towers = _.filter(
    Game.structures,
    (structure) => structure.structureType == STRUCTURE_TOWER
  );
  for (var t = 0; t < towers.length; t++) {
    roleTower.run(towers[t]);
  }

  // Clears the memory of creeps that are no longer in the game.
  for (var name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
      console.log("Clearing non-existing creep memory:", name);
    }
  }

  // Logs the number of creeps of each role to the console every 10 ticks.
  if (Game.time % 10 === 0) {
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
    var meleeNumber = _.filter(
      Game.creeps,
      (creep) =>
        creep.memory.role == "small_melee" || creep.memory.role == "melee"
    );
    var repairerNumber = _.filter(
      Game.creeps,
      (creep) => creep.memory.role == "repairer"
    );
    var storageManagerNumber = _.filter(
      Game.creeps,
      (creep) => creep.memory.role == "storagemanager"
    );
    var defenderNumber = _.filter(
      Game.creeps,
      (creep) => creep.memory.role == "rangedefender"
    );

    console.log("time: " + Game.time + " ===================");
    console.log("Harvesters: " + harvesterNumber.length);
    console.log("Upgraders: " + upgraderNumber.length);
    console.log("Builders: " + builderNumber.length);
    console.log("Repairers: " + repairerNumber.length);
    console.log("Storage Managers: " + storageManagerNumber.length);
    console.log("Range Defenders: " + defenderNumber.length);
    console.log("Melee Defenders: " + meleeNumber.length);
  }

  // Runs the logic for each creep based on its role.
  for (var name in Game.creeps) {
    var creep = Game.creeps[name];
    if (creep.memory.role == "rangedefender") {
      roleRangeDefender.run(creep);
    } else if (
      creep.memory.role == "small_melee" ||
      creep.memory.role == "melee"
    ) {
      roleMelee.run(creep);
    } else if (creep.memory.role == "harvester") {
      roleHarvester.run(creep);
    } else if (creep.memory.role == "upgrader") {
      roleUpgrader.run(creep);
    } else if (creep.memory.role == "builder") {
      roleBuilder.run(creep);
    } else if (creep.memory.role == "repairer") {
      roleRepair.run(creep);
    } else if (creep.memory.role == "storagemanager") {
      rolestoragemanager.run(creep);
    }
  }
};
