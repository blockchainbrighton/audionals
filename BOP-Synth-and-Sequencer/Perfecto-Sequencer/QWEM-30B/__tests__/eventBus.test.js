// __tests__/eventBus.test.js
/**
 * Unit tests for eventBus.js
 * @file eventBus.test.js
 */

import { emit, on, offAll } from '../eventBus.js';

describe('eventBus', () => {
  beforeEach(() => {
    // Clear any existing listeners before each test
    offAll('test-event');
  });

  test('emit triggers listeners with correct payload', () => {
    const spy = jest.fn();
    const unsubscribe = on('test-event', spy);

    emit('test-event', { message: 'hello' });

    expect(spy).toHaveBeenCalledWith({ message: 'hello' });

    unsubscribe();
    emit('test-event', { message: 'world' });
    expect(spy).toHaveBeenCalledTimes(1); // no further calls
  });

  test('multiple listeners receive same event', () => {
    const spy1 = jest.fn();
    const spy2 = jest.fn();

    on('test-event', spy1);
    on('test-event', spy2);

    emit('test-event', { value: 42 });

    expect(spy1).toHaveBeenCalledWith({ value: 42 });
    expect(spy2).toHaveBeenCalledWith({ value: 42 });
  });

  test('unsubscribe removes listener', () => {
    const spy = jest.fn();
    const unsubscribe = on('test-event', spy);

    emit('test-event', { data: 'first' });
    expect(spy).toHaveBeenCalledTimes(1);

    unsubscribe();
    emit('test-event', { data: 'second' });
    expect(spy).toHaveBeenCalledTimes(1); // still only one call
  });

  test('offAll removes all listeners for a type', () => {
    const spy1 = jest.fn();
    const spy2 = jest.fn();

    on('test-event', spy1);
    on('test-event', spy2);

    emit('test-event', { x: 1 });
    expect(spy1).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();

    offAll('test-event');
    emit('test-event', { x: 2 });
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  test('emit with no payload works', () => {
    const spy = jest.fn();
    on('no-payload', spy);

    emit('no-payload');

    expect(spy).toHaveBeenCalledWith({});
  });

  test('off() throws error as expected', () => {
    expect(() => off('test', () => {})).toThrowError('Direct off() not supported. Use unsubscribe function from `on()`.');
  });

  test('on returns a valid unsubscribe function', () => {
    const spy = jest.fn();
    const unsubscribe = on('test-event', spy);

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
    emit('test-event', { hello: 'world' });
    expect(spy).not.toHaveBeenCalled();
  });
});