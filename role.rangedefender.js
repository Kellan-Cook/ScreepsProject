/**
 * @file This module contains the logic for the ranged defender creep role.
 * @author YOUR_NAME
 * @version 1.0
 */

var rolerangedefender = {
  /**
   * This function is the main entry point for the ranged defender creep logic. It is called for each ranged defender creep in the game.
   * @param {Creep} creep - The creep to run the logic for.
   */
  run: function (creep) {
    // Finds all hostile creeps in the room.
    var targets = creep.room.find(FIND_HOSTILE_CREEPS);

    // If there are hostile creeps, the creep moves to the closest one and attacks it.
    if (targets.length > 0) {
      if (creep.rangedAttack(targets[0]) == ERR_NOT_IN_RANGE) {
        creep.moveTo(targets[0], { visualizePathStyle: { stroke: "#ffaa00" } });
      }
    }
  },
};
module.exports = rolerangedefender;