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
    run: function(creep){

        // The melee creep logic is not yet implemented.
        // The intended functionality is for the melee creep to attack hostile creeps.
        // The creep should move to the target and attack it.
        // The creep should also be able to work in groups with other melee creeps.

        // Example of how to find and attack a hostile creep:
        /*
        var target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
        if(target) {
            if(creep.attack(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        }
        */



    }



}




module.exports = rolemelee;