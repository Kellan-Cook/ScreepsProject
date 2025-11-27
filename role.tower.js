/**
 * @file role.tower.js
 * @description Defines the behavior for towers, including attacking hostiles and repairing structures.
 * @author Kellan Cook
 * @version 0.2
 */
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
    // 1. Attack closest hostile creep
    var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (closestHostile) {
      tower.attack(closestHostile);
      return; // Prioritize attacking
    }

    // 2. Repair structures
    // Prioritize critical infrastructure (roads, containers)
    var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (structure) => {
        // Don't repair walls/ramparts yet, focus on roads/containers/extensions/spawns
        if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
          return false;
        }
        return structure.hits < structure.hitsMax;
      }
    });

    if (closestDamagedStructure) {
      tower.repair(closestDamagedStructure);
      return;
    }

    // 3. Maintain Walls/Ramparts (Low Priority)
    // Only repair if we have excess energy to avoid draining the tower
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) > tower.store.getCapacity(RESOURCE_ENERGY) * 0.5) {
      var closestDamagedWall = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) &&
            structure.hits < 10000; // Maintain up to 10k hits
        }
      });

      if (closestDamagedWall) {
        tower.repair(closestDamagedWall);
      }
    }
  },
};

module.exports = roleTower;