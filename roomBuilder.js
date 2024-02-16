/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('roomBuilder');
 * mod.thing == 'a thing'; // true
 */
 
 
 
 //this module is for spawners to dynamicly building creeps
var roomBuilder = {
    
    
    run: function(spawner){
        
        sources = Game.rooms.Source
        spawner.Memory.Nspawn = sources;
        
        
        
        
    }
    
    

};






module.exports = roomBuilder;