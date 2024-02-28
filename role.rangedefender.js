var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {

        var targets = creep.room.find(FIND_HOSTILE_CREEPS)

        if(targets.length > 0){

            if(creep.rangedAttack(targetsource) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets, {visualizePathStyle: {stroke: '#ffaa00'}});
            }

        }


    }

}