import { ObjectId } from "mongodb";

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

export interface IChangedCustomersList {
  _id?: ObjectId;
  customerIds: ObjectId[];
  operationType: 'insert' | 'update';
  isUpdateFailed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
