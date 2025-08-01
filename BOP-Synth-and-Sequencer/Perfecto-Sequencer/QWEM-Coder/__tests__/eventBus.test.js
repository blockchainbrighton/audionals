// __tests__/eventBus.test.js

/**
 * @file Unit tests for eventBus.js
 */

import { emit, on, off } from '../eventBus.js';

describe('eventBus', () => {
  beforeEach(() => {
    // Clear all event listeners by replacing the document
    global.document = new EventTarget();
  });

  test('should call handler when event is emitted', () => {
    const handler = jest.fn();
    const testData = { message: 'hello' };

    on('TEST_EVENT', handler);
    emit('TEST_EVENT', testData);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual(testData);
  });

  test('should not call handler after unsubscribing', () => {
    const handler = jest.fn();

    on('UNSUBSCRIBE_TEST', handler);
    off('UNSUBSCRIBE_TEST', handler);
    emit('UNSUBSCRIBE_TEST', { data: 'test' });

    expect(handler).not.toHaveBeenCalled();
  });

  test('should handle multiple handlers for same event', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    on('MULTI_HANDLER_TEST', handler1);
    on('MULTI_HANDLER_TEST', handler2);
    emit('MULTI_HANDLER_TEST');

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  test('should not affect other handlers when one is unsubscribed', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    on('PARTIAL_UNSUBSCRIBE_TEST', handler1);
    on('PARTIAL_UNSUBSCRIBE_TEST', handler2);
    off('PARTIAL_UNSUBSCRIBE_TEST', handler1);
    emit('PARTIAL_UNSUBSCRIBE_TEST');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});