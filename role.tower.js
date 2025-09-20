/**
 * @file This module contains the logic for the tower structure.
 * @author YOUR_NAME
 * @version 1.0
 */

var roletower = {
    /**
     * This function is the main entry point for the tower logic. It is called for each tower in the game.
     * @param {Structure.tower} curtower - The tower to run the logic for.
     */
    run: function (curtower) {



    var tower = Game.getObjectById(curtower.id);


      // Finds the closest hostile creep to the tower.
      var target = curtower.pos.findClosestByrange(FIND_HOSTILE_CREEPS);
  
      // If a hostile creep is found, the tower attacks it.
      if (target != null) {
        if (tower.attack(target) == ERR_NOT_IN_RANGE) {

        }
      }


    }
  };
  module.exports = roletower;