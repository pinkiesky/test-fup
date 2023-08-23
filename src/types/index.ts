import { ObjectId, WithId } from 'mongodb';

export interface ICustomer {
  _id?: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  address: {
    line1: string;
    line2: string;
    postcode: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: Date;
}

export interface ICustomerMeta {
  _id?: ObjectId;
  customerId: ObjectId;
  customerObject: WithId<ICustomer>;
  version: number;
  isSynced: boolean;
  createdAt: Date;
  updatedAt: Date;
}
