import { ObjectId } from 'mongodb';
import { anonymizeCustomer } from './anonymizeCustomer';

describe('anonymizeCustomer', () => {
  it('should anonymize the customer', () => {
    const customer = {
      _id: new ObjectId(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'email@host.com',
      address: {
        line1: 'line1',
        line2: 'line2',
        postcode: 'postcode',
        city: 'city',
        state: 'state',
        country: 'country',
      },
      createdAt: new Date(),
    };
    const anonymizedCustomer = anonymizeCustomer(customer);
    expect(anonymizedCustomer).toEqual({
      _id: customer._id,
      firstName: expect.stringMatching(/.{8}/),
      lastName: expect.stringMatching(/.{8}/),
      email: expect.stringMatching(/.{8}/),
      address: {
        line1: expect.stringMatching(/.{8}/),
        line2: expect.stringMatching(/.{8}/),
        postcode: expect.stringMatching(/.{8}/),
        city: customer.address.city,
        state: customer.address.state,
        country: customer.address.country,
      },
      createdAt: customer.createdAt,
    });
  });

  it('should work idempotent', () => {
    const customer = {
      _id: new ObjectId(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'email@host.com',
      address: {
        line1: 'line1',
        line2: 'line2',
        postcode: 'postcode',
        city: 'city',
        state: 'state',
        country: 'country',
      },
      createdAt: new Date(),
    };

    const anonymizedCustomer1 = anonymizeCustomer(customer);
    const anonymizedCustomer2 = anonymizeCustomer(customer);
    expect(anonymizedCustomer1).toEqual(anonymizedCustomer2);
  });
});
