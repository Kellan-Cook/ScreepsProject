var functionSpawn = {

 run: function(spawner) {
     
     var spawnEng = Game.spawns[spawner].room.energyAvailable;
    console.log('spawner energy: ' + spawner + " - "+ spawnEng);
    
    if(Structure.memory.firstrun != false){
        Structure.memory.roomsources = Room.find(FIND_SOURCES);

        Structure.memory.firstrun = true;
    }




    if(spawns.spawning == null){
    console.log('creep count at build: ' + creepcount)
    
        
        
        var roomcreepsharvester = _.filter(Game.creeps, (creep) => creep.memory.homespawner == Game.spawns[spawner]);

        


        var sources = Structure.memory.roomsources;


        if(roomcreepsharvester < sources.length){
            var newName = 'harvester' + Game.time;
            if(spawnEng == 300 && spawns.spawning == null){
                console.log('Spawning new harvester 1: ' + newName);
                spawns.spawnCreep([WORK,WORK,CARRY,MOVE], newName, {memory: {role: 'harvester', task: 'harvesting', homespawner: Game.spawns[spawner]}});
            }
            if(spawnEng >= 400 && spawnEng < 600 && spawns.spawning == null){
                console.log('Spawning new harvester 2: ' + newName);
                spawns.spawnCreep([WORK,WORK,CARRY,MOVE,MOVE,MOVE], newName, {memory: {role: 'harvester', task: 'harvesting', homespawner: Game.spawns[spawner]}});
            }
            if(spawnEng >= 600 && spawns.spawning == null){
                console.log('Spawning new harvester 3: ' + newName);
                spawns.spawnCreep([WORK,WORK,WORK,CARRY,CARRY,CARRY,MOVE,MOVE,MOVE], newName, {memory: {role: 'harvester', task: 'harvesting', homespawner: Game.spawns[spawner]}});
            }
            if(creepcount == 0 && spawns.spawning == null){
                console.log('Spawning new harvester basic: ' + newName);
                spawns.spawnCreep([WORK,WORK,CARRY,MOVE], newName, {memory: {role: 'harvester', task: 'harvesting', homespawner: Game.spawns[spawner]}});
                
            }
            
        }
            
        if(ctype == 'upgrader'){
            var newName = 'upgrader' + Game.time;
            if(spawnEng == 300 && spawns.spawning == null){
            console.log('Spawning new upgrader: ' + newName);
            spawns.spawnCreep([WORK,WORK,CARRY,MOVE], newName, {memory: {role: 'upgrader'}});
            }
            if(spawnEng >= 400 && spawns.spawning == null){
            spawns.spawnCreep([WORK,WORK,CARRY,CARRY,CARRY,MOVE], newName, {memory: {role: 'upgrader'}});
            
            }    
            if(spawnEng >= 600 && spawns.spawning == null){
            spawns.spawnCreep([WORK,WORK,WORK,,WORK,CARRY,CARRY,CARRY,MOVE], newName, {memory: {role: 'upgrader'}});
            
            }
            
        }
        
        
        if(ctype == 'builder'){
            var newName = 'builder' + Game.time;
            if(spawnEng == 300 && spawns.spawning == null){
                console.log('Spawning new builder: ' + newName);
                spawns.spawnCreep([WORK,WORK,CARRY,MOVE], newName, {memory: {role: 'builder'}});
            }
            if(spawnEng >= 400 && spawns.spawning == null){
                spawns.spawnCreep([WORK,WORK,CARRY,CARRY,MOVE,MOVE], newName, {memory: {role: 'builder'}});
                
            }
            if(spawnEng >= 600 && spawns.spawning == null){
                spawns.spawnCreep([WORK,WORK,WORK,WORK,CARRY,CARRY,MOVE,MOVE], newName, {memory: {role: 'builder'}});
            }
            
            
        }
        if(ctype == 'repairer'){
            var newName = 'repairer' + Game.time;
            if(spawnEng >= 400 && spawns.spawning == null){
                console.log('spawning new repairer: ' + newName)
                spawns.spawnCreep([WORK,WORK,CARRY,CARRY,MOVE,MOVE], newName, {memory: {role: 'repairer'}})
                
            }
            
            
            
        }
            
            
        
        
        
       
        
        
        
        
        
        
        
        
        
        
        
    /*if(ctype == 'upgrader'){
        if(creepcount < 4) {
        
            var newName = 'upgrader' + Game.time;
        
            if(Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE], 'Worker1', { dryRun: true }) == false ){
                console.log('Spawning new upgrader: ' + newName);
                spawns.spawnCreep([WORK,WORK,CARRY,MOVE], newName, {memory: {role: 'upgrader'}});
            }
        }

    }else if(ctype == 'builder'){
        if(creepcount < 5) {
        
            var newName = 'builder' + Game.time;
        
            if(Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE], 'Worker1', { dryRun: true }) == false ){
                console.log('Spawning new builder: ' + newName);
                spawns.spawnCreep([WORK,WORK,WORK,CARRY,CARRY,MOVE], newName, {memory: {role: 'builder'}});
            }
        }

    }else if(ctype == 'harvester'){
        if(creepcount < 2) {
            
            var newName = 'harvester' + Game.time;
        
            if(Game.spawns['Spawn1'].spawnCreep([WORK, CARRY, MOVE], 'Worker1', { dryRun: true }) == false ){
                console.log('Spawning new harvester: ' + newName);
                spawns.spawnCreep([WORK,WORK,CARRY,MOVE,MOVE], newName, {memory: {role: 'harvester'}});
            }
        }
    }else if(ctype == 'small_melee'){
        
       
            if(creepcount < 4) {
                var newname = 'small_melee' + Game.time;
            
        
                if(Game.spawns['Spawn1'].spawnCreep([ATTACK, ATTACK, MOVE], 'Worker1', { dryRun: true }) == false ){
                    console.log('Spawning new harvester: ' + newName);
                    spawns.spawnCreep([ATTACK,ATTACK,MOVE], newName, {memory: {role: 'small_melee'}});
                }
        }
        
        
    }
  */
}
}
};
module.exports = functionSpawn;