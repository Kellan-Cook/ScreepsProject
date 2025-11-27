/**
 * @file role.rangedefender.js
 * @description Defines the behavior for the ranged defender role, which attacks hostile creeps.
 * @author Kellan Cook
 * @version 0.2
 */

var roleRangeDefender = {
  /**
   * Main logic for the ranged defender role.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // Find hostile creeps
    var targets = creep.room.find(FIND_HOSTILE_CREEPS);

    if (targets.length > 0) {
      // Attack closest hostile
      if (creep.rangedAttack(targets[0]) == ERR_NOT_IN_RANGE) {
        creep.moveTo(targets[0]);
      }
    } else {
      // Patrol to spawn if no hostiles
      var spawn = Game.spawns[creep.memory.homespawner];
      if (spawn) {
        creep.moveTo(spawn);
      }
    }
  },
};

module.exports = roleRangeDefender;