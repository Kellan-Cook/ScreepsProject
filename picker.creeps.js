/**
 * @file This module contains logic for selecting creeps for specific tasks.
 * @author Kellan Cook
 * @version 0.3
 */

var creepPicker = {
  /**
   * Finds all creeps belonging to a specific role in a room.
   * @param {Room} room - The room to search.
   * @param {string} role - The creep role to match.
   * @returns {Creep[]}
   */
  getByRole: function (room, role) {
    if (!room) return [];
    return room.find(FIND_MY_CREEPS, {
      filter: (creep) => creep.memory.role === role,
    });
  },

  /**
   * Finds the closest creep of a specific role to a given target.
   * @param {RoomObject} target - The target object to measure distance from.
   * @param {string} role - The creep role to match.
   * @returns {Creep|null}
   */
  getClosestByRole: function (target, role) {
    if (!target || !target.pos) return null;
    var pos = target.pos;
    var room = Game.rooms[pos.roomName];
    if (!room) return null;
    return pos.findClosestByPath(FIND_MY_CREEPS, {
      filter: (creep) => creep.memory.role === role,
    });
  },
};

module.exports = creepPicker;
