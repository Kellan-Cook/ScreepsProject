var functionSpawn = {

 run: function(curspawner) {
     
     var spawner = Game.spawns[curspawner];
     var spawnEng = spawner.room.energyAvailable;

    
    if(spawner.memory.firstrun === undefined){
        
        spawner.memory.roomsources = spawner.room.find(FIND_SOURCES);
        
        spawner.memory.firstrun = false;
    }

    if(spawner.spawning == null){
    //console.log('creep count at build: ' + creepcount)
    
        


        
        
        var roomcreepsharvester = spawner.room.find(FIND_MY_CREEPS, {
                    filter: (x) => {
                        return (x.memory.homespawner == spawner.name && x.memory.role == 'harvester') } } ) ;
                        

        var roomcreepsupgrader = spawner.room.find(FIND_MY_CREEPS, {
                    filter: (x) => {
                        return (x.memory.homespawner == spawner.name && x.memory.role == 'upgrader') } } ) ;
                        
                        
        var roomcreepsbuilder = spawner.room.find(FIND_MY_CREEPS, {
                    filter: (x) => {
                        return (x.memory.homespawner == spawner.name && x.memory.role == 'builder') } } ) ;
                        
                        
        var roomcreepsrepairer = spawner.room.find(FIND_MY_CREEPS, {
                    filter: (x) => {
                        return (x.memory.homespawner == spawner.name && x.memory.role == 'repairer') } } ) ;
                        


        var sources = spawner.memory.roomsources;
        var roomcreeps = spawner.room.find(FIND_MY_CREEPS)
        
        console.log("harvest: " + roomcreepsharvester.length)
        console.log("sources: " + sources.length)
        if(roomcreepsharvester.length < sources.length){
            var goodtarget = spawner.memory.roomsources;
            var optimaltarget = spawner.memory.roomsources;
            //console.log(goodtarget[0].id)
                roomcreepsharvester.forEach(function (arrayItem){
                    
                    
                    goodtarget.forEach(function (goodItem){
                        
                        var obj = arrayItem.memory.roomsources;
                        console.log("check1: " + goodItem.id);
                        console.log("check2: " + obj)
                    
                        if(goodItem.id == obj){
                            console.log("SLICED: " + goodItem.id)
                            console.log("before: " + goodtarget[0].id);
                            optimaltarget = optimaltarget.filter(function(value, index, arr){return value != goodItem})
                            console.log("after : " + optimaltarget[0].id);
                            
                            
                        
                        
                        
                        
                        }
                    console.log("running: " + arrayItem)

                        
                        
                    });
            
                
                });

            

            //var optimaltarget = spawner.pos.findClosestByPath(goodtarget); //TODO: curently returns null to fix to get closets path
            
            var newName = 'harvester' + Game.time;


            var harvesterbodygroup = spawnEng / 400;
            var bodysize = [];
            if(spawnEng >= 400){
                while(harvesterbodygroup >= 1){
                    bodysize.push(WORK,WORK,CARRY,CARRY,CARRY,MOVE)
                }

            }


            if(spawner.spawning == null){
                console.log('Spawning new harvester 1: ' + newName);
                spawner.spawnCreep(bodysize, newName, {memory: {role: 'harvester', task: 'harvesting', homespawner: spawner.name, roomsources: optimaltarget[0].id }});
            }

            if(roomcreepsharvester.length == 0 && spawner.spawning == null || spawnEng < 400 && spawner.spawning == null){
                console.log('Spawning new harvester basic: ' + newName);
                spawner.spawnCreep([WORK,WORK,CARRY,MOVE], newName, {memory: {role: 'harvester', task: 'harvesting', homespawner: spawner.name, roomsources: optimaltarget[0].id }});
                
            }
            
        }else{
            
            if(roomcreepsupgrader.length < 2){
                var newName = 'upgrader' + Game.time;
                if(spawnEng == 300 && spawner.spawning == null){
                    console.log('Spawning new upgrader: ' + newName);
                    spawner.spawnCreep([WORK,WORK,CARRY,MOVE], newName, {memory: {role: 'upgrader', homespawner: spawner.name}});
                }
                if(spawnEng >= 400 && spawner.spawning == null){
                    spawner.spawnCreep([WORK,WORK,CARRY,CARRY,CARRY,MOVE], newName, {memory: {role: 'upgrader', homespawner: spawner.name}});
            
                }    
                if(spawnEng >= 600 && spawner.spawning == null){
                    spawner.spawnCreep([WORK,WORK,WORK,,WORK,CARRY,CARRY,CARRY,MOVE], newName, {memory: {role: 'upgrader', homespawner: spawner.name}});
            
                }
            
            }
        
        
            if(roomcreepsbuilder.length < 2){
                var newName = 'builder' + Game.time;
            if(spawnEng == 300 && spawner.spawning == null){
                console.log('Spawning new builder: ' + newName);
                spawner.spawnCreep([WORK,WORK,CARRY,MOVE], newName, {memory: {role: 'builder', homespawner: spawner.name}});
            }
            if(spawnEng >= 400 && spawner.spawning == null){
                spawner.spawnCreep([WORK,WORK,CARRY,CARRY,MOVE,MOVE], newName, {memory: {role: 'builder', homespawner: spawner.name}});
                
            }
            if(spawnEng >= 600 && spawner.spawning == null){
                spawner.spawnCreep([WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE], newName, {memory: {role: 'builder', homespawner: spawner.name}});
            }
            
            
            }
            if(roomcreepsrepairer.length < 2){
                var newName = 'repairer' + Game.time;
                if(spawnEng >= 400 && spawner.spawning == null){
                    console.log('spawning new repairer: ' + newName)
                    spawner.spawnCreep([WORK,WORK,CARRY,CARRY,MOVE,MOVE], newName, {memory: {role: 'repairer', homespawner: spawner.name}})
                
                }
            
            
            
            }
            
            
        }
    }
}
};
module.exports = functionSpawn;