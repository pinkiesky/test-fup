import { generateRandomString } from './random';

describe('random', () => {
  describe('generateRandomString', () => {
    it('should generate a random string with given mask', () => {
      const result = generateRandomString('test', 8);
      expect(result).toMatch(/[a-zA-Z0-9]+/g);
    });

    it('should generate a random string with the given size', () => {
      const result = generateRandomString('test', 10);
      expect(result).toHaveLength(10);
    });

    it('should generate a random string based on the given key', () => {
      const result = generateRandomString('test', 8);
      expect(result).toEqual(generateRandomString('test', 8));
    });

    it('should generate different string when key is also different', () => {
      const res1 = generateRandomString('test', 8);
      const res2 = generateRandomString('jest', 8);

      expect(res1).not.toEqual(res2);
    });
  });
});