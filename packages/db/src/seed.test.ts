import { expect, test, describe } from "bun:test";
import { seedDatabase } from "./seed";

describe("Seed Script", () => {
  test("should export seedDatabase function", () => {
    expect(typeof seedDatabase).toBe("function");
  });
});
