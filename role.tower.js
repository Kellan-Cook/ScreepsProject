/**
 * @file role.tower.js
 * @description Defines the behavior for towers, including attacking hostiles and repairing structures.
 * @author Kellan Cook
 * @version 0.2
 */

var roleTower = {
  /**
   * Main logic for towers.
   * @param {StructureTower} tower - The tower to run the logic for.
   */
  run: function (tower) {
    // Attack closest hostile
    var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (closestHostile) {
      tower.attack(closestHostile);
    } else {
      // Repair damaged structures if no hostiles
      var closestDamagedStructure = tower.pos.findClosestByRange(
        FIND_STRUCTURES,
        {
          filter: (structure) => structure.hits < structure.hitsMax,
        }
      );
      if (closestDamagedStructure) {
        tower.repair(closestDamagedStructure);
      }
    }
  },
};

module.exports = roleTower;