/* @flow */

export default class RRNLError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'RRNLError';
  }
}
