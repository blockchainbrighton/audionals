import { describe, expect, it } from "vitest";
import { createStore } from "../src/store/store.js";

describe("createStore", () => {
  it("notifies observers when slice changes", () => {
    const store = createStore({ foo: 1 });
    let called = 0;
    store.observe("foo", () => called++);
    store.setState({ foo: 2 });
    expect(called).toBe(1);
  });
});
