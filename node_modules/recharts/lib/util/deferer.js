"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deferer = deferer;
/**
 * Will execute callback fn asynchronously.
 * It will detect the appropriate function to use.
 *
 * Named after the famous Swiss tennis player, Roger Deferer.
 *
 * @param {Function} callback will be executed asynchronously, with no arguments
 * @returns {Function} a cancel function.
 */
function deferer(callback) {
  if (typeof requestAnimationFrame === 'function') {
    var frame = requestAnimationFrame(callback);
    return function () {
      return cancelAnimationFrame(frame);
    };
  }
  if (typeof setImmediate === 'function') {
    var handle = setImmediate(callback);
    return function () {
      return clearImmediate(handle);
    };
  }
  var timer = setTimeout(callback);
  return function () {
    return clearTimeout(timer);
  };
}