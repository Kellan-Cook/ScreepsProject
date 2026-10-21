/**
 * @file This module contains functions for creep movement.
 * @author Kellan Cook
 * @version 0.2
 */

/**
 * Moves the creep to the target if it is not within the wanted range.
 * @param {Creep} creep - The creep to move.
 * @param {RoomObject} target - The target to move to.
 * @param {number} wantedRange - The desired range to the target.
 */
function basicmovment(creep, target, wantedRange) {
  if (!creep || !target) return;
  var range = wantedRange !== undefined ? wantedRange : 1;
  if (creep.pos.getRangeTo(target) > range) {
    creep.moveTo(target);
  }
}

module.exports = {
  basicmovment: basicmovment,
};
