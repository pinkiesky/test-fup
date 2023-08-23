import { ICustomer } from "../types";
import { generateRandomString } from "./random";

export function anonymizeCustomer(customer: ICustomer): ICustomer {
  const [emailName, emailDomain] = customer.email.split('@');

  return {
    _id: customer._id,
    firstName: generateRandomString(customer.firstName, 8),
    lastName: generateRandomString(customer.lastName, 8),
    email: `${generateRandomString(emailName, 8)}@${emailDomain}`,
    address: {
      line1: generateRandomString(customer.address.line1, 8),
      line2: generateRandomString(customer.address.line2, 8),
      postcode: generateRandomString(customer.address.postcode, 8),
      city: customer.address.city,
      state: customer.address.state,
      country: customer.address.country,
    },
    createdAt: customer.createdAt,
  }
}