/* @flow */
/* eslint-disable  */

export function isFunction(obj: any): boolean %checks {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}
