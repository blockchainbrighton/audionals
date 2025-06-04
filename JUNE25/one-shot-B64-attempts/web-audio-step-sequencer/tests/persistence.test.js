import { describe, it, expect } from "vitest";
import { serialize, deserialize } from "../src/utils/persistence.js";

describe("persistence", () => {
  it("serializes and deserializes project", () => {
    const proj = { foo: "bar" };
    const json = serialize(proj);
    const restored = deserialize(json);
    expect(restored.foo).toBe("bar");
  });
});
