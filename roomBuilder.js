/**
 * @file This module is intended to contain logic for dynamically building creeps based on the room's needs.
 * @author Kellan Cook
 * @version 0.2
 */

var roomBuilder = {
    
    
    /**
     * This function is the main entry point for the room builder logic. It is called for each spawner in the game.
     * @param {StructureSpawn} spawner - The spawner to run the logic for.
     */
    run: function(spawner){
        
        // first should place the needed roads 
        for(source of spawner.memory.roomsources){
            path = spawner.pos.findPathTo(source)
            for(position in path){
                spawner.room.createConstructionSite(position.x, position.y, STRUCTURE_ROAD)
            }

        }
        
        
        
    }
    
    

};






module.exports = roomBuilder;