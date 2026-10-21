/**
 * @file This module contains the logic for the melee creep role.
 * @author Kellan Cook
 * @version 0.2
 */

var rolemelee = {
  /**
   * This function is the main entry point for the melee creep logic. It is called for each melee creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // Finds hostile creeps in the room.
    var target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
    if (target) {
      if (creep.attack(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: "#ff0000" } });
      }
    } else {
      // If no hostiles, rally near the home spawner to guard
      if (creep.memory.homespawner && Game.spawns[creep.memory.homespawner]) {
        var spawner = Game.spawns[creep.memory.homespawner];
        if (creep.pos.getRangeTo(spawner) > 3) {
          creep.moveTo(spawner, { visualizePathStyle: { stroke: "#00ff00" } });
        }
      }
    }
  },
};

module.exports = rolemelee;
