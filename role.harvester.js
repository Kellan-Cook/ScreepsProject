var roleHarvester = {

    /** @param {Creep} creep **/
    run: function(creep) {
        
        if(creep.store.getUsedCapacity != 0){
            
            creep.memory.task == 'storing';
        }
        if(creep.store.getUsedCapacity == 0){ 
            creep.memory.task == 'harvesting';
        }
        
	    if(creep.store.getUsedCapacity(RESOURCE_ENERGY) != creep.store.getCapacity(RESOURCE_ENERGY)) {
            var sources = creep.room.find(FIND_SOURCES);
            
            var nearest_source = creep.pos.findClosestByPath(FIND_SOURCES, {filter: (source) => { return source.Energy != 0}});
            if(creep.harvest(nearest_source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(nearest_source, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        else {
            var targets = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) != 0;
                    }
            });
            
            if(targets == null){
                //console.log("test");
                targets = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE) && structure.store.getFreeCapacity(RESOURCE_ENERGY) != 0;
                    }
                    
            });
            }
            

            
            if(targets != null) {
                if(creep.transfer(targets, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets, {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
	}
};

module.exports = roleHarvester;