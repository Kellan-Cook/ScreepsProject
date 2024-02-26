var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleRepair = require('role.repair')
var functionSpawn = require('function.spawn');
var roomBuilder = require('roomBuilder');



module.exports.loop = function () {
    
    
    for(var CurSpawn in Game.spawns){
        
        //roomBuilder.run(Game.spawns[CurSpawn]);
    }

    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    // creep number counting and log
    
    var harvesterNumber = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester');
    var upgraderNumber = _.filter(Game.creeps, (creep) => creep.memory.role == 'upgrader');
    var builderNumber = _.filter(Game.creeps, (creep) => creep.memory.role == 'builder');
    var smallMeleeNumber = _.filter(Game.creeps, (creep) => creep.memory.role == 'small_melee');
    var repairer = _.filter(Game.creeps, (creep) => creep.memory.role == 'repairer');
    
    
    
    //log set to display every 10 ticks 
    var tentick = String(Game.time);
    tentick = tentick.slice(-1);
    if(tentick == '0' ){
        console.log("time: " + Game.time + " ===================")
        console.log('Harvesters: ' + harvesterNumber.length);
        console.log('upgrader: ' + upgraderNumber.length);
        console.log('builder: ' + builderNumber.length);
        console.log('small melee: ' + smallMeleeNumber.length);
        console.log('repairer: ' + repairer.length);
        
        
    }
        
    
    //runs the spawn specific code / room managment code
    for(var spawn in Game.spawns){


        functionSpawn.run(spawner);




    }
    
    
    
    //manages how the spawners interact with the room
    
    
    
    //Game.spawns.forEach()
    
    
    
    
    
    
    // spawns creeps using the function.spawn modual
    
    
    
    
    
    if(harvesterNumber.length < 4){
        for(var name in Game.spawns){
            var spawner = Game.spawns[name];
            functionSpawn.run(spawner, harvesterNumber.length, 'harvester');
        }
        
        
    }else{
        
        if(upgraderNumber.length < 3){
            for(var name in Game.spawns){
                var spawner = Game.spawns[name];
                functionSpawn.run(spawner, upgraderNumber.length, 'upgrader');
            }
        }
        if(builderNumber.length < 3){
            for(var name in Game.spawns){
                var spawner = Game.spawns[name];
                functionSpawn.run(spawner, builderNumber.length, 'builder');
            }
        }
        if(smallMeleeNumber.length > 3){
            for(var name in Game.spawns){
                var spawner = Game.spawns[name];
                functionSpawn.run(spawner, smallMeleeNumber.length, 'small_melee');
            }
        }
        if(repairer.length < 2){
            for(var name in Game.spawns){
                var spawner = Game.spawns[name];
                functionSpawn.run(spawner, repairer.length, 'repairer')
                
            }
            
            
        }
        
        
        
        
        
    }



   
    
    if(Game.spawns['Spawn1'].spawning) { 
        var spawningCreep = Game.creeps[Game.spawns['Spawn1'].spawning.name];
        Game.spawns['Spawn1'].room.visual.text(
            '🛠️' + spawningCreep.memory.role,
            Game.spawns['Spawn1'].pos.x + 1, 
            Game.spawns['Spawn1'].pos.y, 
            {align: 'left', opacity: 0.8});
    }

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
        }
        if(creep.memory.role == 'builder') {
            roleBuilder.run(creep);
        }
                if(creep.memory.role == 'repairer') {
            roleRepair.run(creep);
        }
    }
}