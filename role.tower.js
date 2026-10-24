/**
 * @file This module contains the optimized logic for tower structures:
 * coordinated focus-fire defense, threat assessment, emergency healing,
 * anti-breach rampart reinforcement, and energy-guarded maintenance repair.
 * @author Kellan Cook
 * @version 1.0
 */

var roleTower = {
  /**
   * Evaluates hostile threat score for optimal target prioritization and focus-fire.
   * Prioritizes healers, dismantlers, attackers, wounded creeps, and closest threats.
   * @param {Creep} hostile
   * @param {StructureTower} tower
   * @returns {number}
   */
  getHostileThreatScore: function (hostile, tower) {
    var score = 1000;

    // Body part threat analysis
    var body = hostile.body || [];
    var healParts = 0;
    var attackParts = 0;
    var rangedParts = 0;
    var workParts = 0;

    for (var b = 0; b < body.length; b++) {
      if (body[b].hits <= 0) continue; // Inactive / destroyed part
      var type = body[b].type;
      if (type === HEAL) healParts++;
      else if (type === ATTACK) attackParts++;
      else if (type === RANGED_ATTACK) rangedParts++;
      else if (type === WORK) workParts++;
    }

    // Healers sustain the assault: eliminating them breaks the enemy attack
    score += healParts * 60;
    // Attackers and dismantlers damage our base
    score += attackParts * 40;
    score += rangedParts * 30;
    score += workParts * 25;

    // Finish off low-health hostiles quickly (kills remove body parts permanently)
    var healthRatio = hostile.hits / hostile.hitsMax;
    score += (1.0 - healthRatio) * 150;

    // Range factor: closer to this tower = higher damage dealt (up to 600 damage)
    var range = tower.pos.getRangeTo(hostile);
    score += Math.max(0, 30 - range) * 10;

    return score;
  },

  /**
   * Main entry point for tower logic. Called for each tower every tick.
   * @param {StructureTower} tower - The tower structure to run logic for.
   */
  run: function (tower) {
    if (!tower || !tower.room) return;

    var room = tower.room;

    // =========================================================================
    // 1. COMBAT DEFENSE (Highest Priority)
    // Coordinated target selection so all towers focus-fire the highest-threat enemy.
    // =========================================================================
    var hostiles = room.find(FIND_HOSTILE_CREEPS);
    if (typeof FIND_HOSTILE_POWER_CREEPS !== "undefined") {
      var powerHostiles = room.find(FIND_HOSTILE_POWER_CREEPS);
      if (powerHostiles && powerHostiles.length > 0) {
        hostiles = hostiles.concat(powerHostiles);
      }
    }

    if (hostiles.length > 0) {
      // Find the highest-threat hostile (cached per room tick for unified focus-fire)
      var bestTarget = null;
      if (
        room._towerCombatTargetTick === Game.time &&
        room._towerCombatTargetId
      ) {
        var cached = Game.getObjectById(room._towerCombatTargetId);
        if (cached && cached.hits > 0) {
          bestTarget = cached;
        }
      }

      if (!bestTarget) {
        var highestScore = -1;
        for (var h = 0; h < hostiles.length; h++) {
          var targetScore = this.getHostileThreatScore(hostiles[h], tower);
          if (targetScore > highestScore) {
            highestScore = targetScore;
            bestTarget = hostiles[h];
          }
        }
        if (bestTarget) {
          room._towerCombatTargetId = bestTarget.id;
          room._towerCombatTargetTick = Game.time;
        }
      }

      if (bestTarget) {
        tower.attack(bestTarget);
        return;
      }
    }

    // =========================================================================
    // 2. EMERGENCY FRIENDLY HEALING
    // Heal damaged friendly creeps in the room.
    // =========================================================================
    var damagedCreeps = room.find(FIND_MY_CREEPS, {
      filter: function (c) {
        return c.hits < c.hitsMax;
      },
    });
    // Ensure only truly damaged creeps are targeted even if room.find didn't filter
    damagedCreeps = damagedCreeps.filter(function (c) {
      return c.hits < c.hitsMax;
    });

    if (damagedCreeps.length > 0) {
      // Prioritize creeps with lowest health ratio, then closest to tower
      damagedCreeps.sort(function (a, b) {
        var ratioA = a.hits / a.hitsMax;
        var ratioB = b.hits / b.hitsMax;
        if (ratioA !== ratioB) return ratioA - ratioB;
        return tower.pos.getRangeTo(a) - tower.pos.getRangeTo(b);
      });
      tower.heal(damagedCreeps[0]);
      return;
    }

    // =========================================================================
    // 3. EMERGENCY DEFENSIVE RAMPART REINFORCEMENT
    // Newly built ramparts spawn with only 1 hit and will decay or collapse in 1 hit!
    // Boost any critical rampart (< 5,000 hits) immediately.
    // =========================================================================
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) >= 150) {
      var criticalRampart = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: function (s) {
          return (
            s.structureType === STRUCTURE_RAMPART &&
            s.my !== false &&
            s.hits < 5000
          );
        },
      });

      if (criticalRampart) {
        tower.repair(criticalRampart);
        return;
      }
    }

    // =========================================================================
    // 4. SMART NON-COMBAT MAINTENANCE REPAIR
    // Only repair non-critical structures if energy is surplus (>= 600)
    // so towers remain fully charged if combat erupts, and never drain the base economy.
    // =========================================================================
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) >= 600) {
      // Dynamic max hits for rampart maintenance based on controller level
      var rcl = room.controller ? room.controller.level : 1;
      var maxRampartHits =
        rcl >= 8
          ? 3000000
          : rcl >= 7
          ? 1000000
          : rcl >= 6
          ? 300000
          : rcl >= 5
          ? 120000
          : rcl >= 4
          ? 60000
          : 30000;

      // Priority A: Decaying containers (containers decay 5000 hits every 500 ticks)
      var decayingContainer = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: function (s) {
          return (
            s.structureType === STRUCTURE_CONTAINER &&
            s.hits < 150000 // Container max hits is 250,000
          );
        },
      });
      if (decayingContainer) {
        tower.repair(decayingContainer);
        return;
      }

      // Priority B: Decaying roads (repair if below 75% hits)
      var decayingRoad = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: function (s) {
          return (
            s.structureType === STRUCTURE_ROAD &&
            s.hits < s.hitsMax * 0.75
          );
        },
      });
      if (decayingRoad) {
        tower.repair(decayingRoad);
        return;
      }

      // Priority C: Rampart maintenance up to the safe RCL threshold
      var damagedRampart = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: function (s) {
          return (
            s.structureType === STRUCTURE_RAMPART &&
            s.my !== false &&
            s.hits < maxRampartHits &&
            s.hits < s.hitsMax
          );
        },
      });
      if (damagedRampart) {
        tower.repair(damagedRampart);
        return;
      }
    }
  },
};

module.exports = roleTower;
