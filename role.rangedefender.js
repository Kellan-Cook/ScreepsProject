/**
 * @file This module contains the logic for the ranged defender creep role.
 * @author Kellan Cook
 * @version 0.3
 */

var rolerangedefender = {
  /**
   * This function is the main entry point for the ranged defender creep logic. It is called for each ranged defender creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // Find the closest hostile creep by path (fallback to any hostile in room if path is blocked by ramparts)
    var target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
    if (!target) {
      var targets = creep.room.find(FIND_HOSTILE_CREEPS);
      if (targets.length > 0) {
        target = targets[0];
      }
    }

    // If there is a hostile creep, move toward it and attack with rangedAttack
    if (target) {
      if (creep.rangedAttack(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: "#ffaa00" } });
      }
    } else if (creep.memory && creep.memory.homespawner) {
      // When no hostiles are present, rally near the home spawner without blocking adjacent spawn tiles
      var spawner = Game.spawns[creep.memory.homespawner];
      if (spawner && creep.pos.getRangeTo(spawner.pos) > 4) {
        creep.moveTo(spawner, { visualizePathStyle: { stroke: "#00ffcc" } });
      }
    }
  },
};

module.exports = rolerangedefender;
