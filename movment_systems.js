

/** @param {Creep} creep **/
function basicmovment(creep, target, wantedRange){

    if(creep.pos.getRangeTo(target) > wantedRange){

        creep.moveTo(target)
    }




}