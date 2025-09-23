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
        for(const source of spawner.memory.roomsources){
            const sourceObject = Game.getObjectById(source.id);
            if (sourceObject) {
                const path = spawner.pos.findPathTo(sourceObject);
                for(const position of path){
                    spawner.room.createConstructionSite(position.x, position.y, STRUCTURE_ROAD);
                }
            }
        }
        
        
        
    }
    
    

};






module.exports = roomBuilder;