/* @flow */

import BigNumber from 'bn.js';
import { raceAgainstTimeout } from '@colony/colony-js-utils';
import type { CallFn } from '@colony/colony-js-adapter';

import { DEFAULT_TIMEOUT } from '../constants';
import Validator from './Validator';
import ContractClient from './ContractClient';

import type { CallerDef, ParamTypePairs, ParamTypes } from '../types';

export default class Caller<
  Params: { [name: string]: * },
  ReturnValue,
  // eslint-disable-next-line
  IContractClient: ContractClient<*>
> extends Validator<Params> {
  +_call: CallFn<*, *>;
  client: IContractClient;
  static returnValues: ParamTypePairs = [];
  static create(
    client: IContractClient,
    { params = [], returnValues, call }: CallerDef,
  ): Caller<Params, ReturnValue, IContractClient> {
    class _Caller extends Caller<Params, ReturnValue, IContractClient> {
      static params = params;
      static returnValues = returnValues;
    }
    return new _Caller(client, call);
  }
  static parseReturnValue(value: *, type: ParamTypes) {
    switch (type) {
      case 'number':
        return BigNumber.isBN(value) ? value.toNumber() : value;
      case 'address':
        this.checkValidAddress(value);
        return value;
      default:
        return value;
    }
  }
  // eslint-disable-next-line no-unused-vars
  static parseReturn(valueOrValues: *, params: Params): ReturnValue {
    // It may be a single value or an array; treat it as an array
    const values = Array.isArray(valueOrValues)
      ? valueOrValues
      : [valueOrValues];
    if (this.returnValues.length) {
      const parsedValues = this.returnValues.map(([name, type], index) => {
        try {
          return {
            [name]: this.parseReturnValue(values[index], type),
          };
        } catch (error) {
          throw new Error(
            `Invalid return for ${name} of type ${type}:\n${error.message ||
              error}`,
          );
        }
      });
      // $FlowFixMe Object literal incompatible with ReturnValue; perhaps try $ObjMap?
      return Object.assign({}, ...parsedValues);
    }
    return valueOrValues;
  }
  constructor(client: IContractClient, call?: CallFn<*, *>) {
    super();
    this.client = client;
    if (typeof call === 'function') this._call = call;
  }
  async call(
    params: Params,
    { timeoutMs = DEFAULT_TIMEOUT }: { timeoutMs: number } = {},
  ): Promise<ReturnValue> {
    if (typeof this._call !== 'function')
      throw new TypeError('Expected a call function for Caller');

    const args = this.constructor.getArgs(params);

    const values = await raceAgainstTimeout(this._call(...args), timeoutMs);

    return this.constructor.parseReturn(values, params);
  }
}