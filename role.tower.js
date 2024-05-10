var roletower = {
    /** @param {Structure.tower} tower **/
    run: function (curtower) {



    var tower = Game.getObjectById(curtower.id);


      var target = curtower.pos.findClosestByrange(FIND_HOSTILE_CREEPS);
  
      if (target != null) {
        if (tower.attack(target) == ERR_NOT_IN_RANGE) {

        }
      }


    }
  };
  module.exports = roletower;
  