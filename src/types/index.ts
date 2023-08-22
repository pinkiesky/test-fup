import { ObjectId } from "mongodb";

export interface IUser {
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

export interface IChangedUsersList {
  _id?: ObjectId;
  userIds: ObjectId[];
  operationType: 'insert' | 'update';
  createdAt: Date;
}
