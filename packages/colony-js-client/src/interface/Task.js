/* @flow */

export type Task = {
  cancelled?: boolean,
  deliverableHash?: string,
  deliverableTimestamp?: number,
  domainId: number,
  dueDate?: Date,
  finalized?: boolean,
  id: number,
  payoutsWeCannotMake?: number,
  potId?: number,
  specificationHash: string,
};