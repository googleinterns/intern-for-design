import { Add } from '../src/add';
describe('Add', () => {
  it('correctly adds two positive numbers', () => {
    const actual = Add(1, 2);
    expect(actual).toBe(3);
  });
});
