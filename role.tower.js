/**
 * @file This module contains the logic for the tower structure.
 * @author Kellan Cook
 * @version 0.3
 */

var roletower = {
  /**
   * This function is the main entry point for the tower logic. It is called for each tower in the game.
   * @param {StructureTower} curtower - The tower to run the logic for.
   */
  run: function (curtower) {
    if (!curtower) return;

    // Finds the closest hostile creep to the tower.
    var target = curtower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

    // If a hostile creep is found, the tower attacks it.
    if (target != null) {
      curtower.attack(target);
      return;
    }

    // Heal damaged friendly creeps if any
    var damagedCreep = curtower.pos.findClosestByRange(FIND_MY_CREEPS, {
      filter: (c) => c.hits < c.hitsMax,
    });
    if (damagedCreep != null) {
      curtower.heal(damagedCreep);
      return;
    }

    // Emergency reinforcement for newly built or critical ramparts (spawn with 1 hit)
    if (curtower.store[RESOURCE_ENERGY] > 200) {
      var criticalRampart = curtower.pos.findClosestByRange(FIND_MY_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_RAMPART && s.hits < 5000,
      });
      if (criticalRampart != null) {
        curtower.repair(criticalRampart);
        return;
      }
    }

    // If no hostile creeps and tower has surplus energy, repair structures
    if (curtower.store[RESOURCE_ENERGY] > 500) {
      var damagedStructure = curtower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) =>
          structure.hits < structure.hitsMax &&
          structure.hits < 200000 &&
          structure.structureType != STRUCTURE_WALL,
      });
      if (damagedStructure != null) {
        curtower.repair(damagedStructure);
      }
    }
  },
};

module.exports = roletower;
