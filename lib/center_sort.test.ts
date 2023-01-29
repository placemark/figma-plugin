import { describe, it, expect } from "vitest";
import { centerSort } from "./center_sort";

describe("centerSort", () => {
  it("base case", () => {
    expect(centerSort([])).toEqual([]);
  });
  it("one elem", () => {
    expect(centerSort([1])).toEqual([1]);
  });
  it("two elem", () => {
    expect(centerSort([1, 2])).toEqual([1, 2]);
  });
  it("one elem", () => {
    expect(centerSort([1, 2, 3])).toEqual([2, 1, 3]);
  });
  it("five elements", () => {
    expect(centerSort([1, 2, 3, 4, 5])).toEqual([3, 2, 4, 1, 5]);
  });
  it("ten elements", () => {
    expect(centerSort([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual([
      5, 6, 4, 7, 3, 8, 2, 9, 1, 10,
    ]);
  });
});
