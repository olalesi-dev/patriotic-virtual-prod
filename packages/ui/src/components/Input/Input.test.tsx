/** @bun-test-environment jsdom */
import * as React from "react";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders correctly", () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText("Enter text");
    expect(input).not.toBeNull();
  });

  test("applies custom className", () => {
    render(<Input placeholder="Enter text" className="custom-class" />);
    const input = screen.getByPlaceholderText("Enter text");
    expect(input.className).toContain("custom-class");
  });
});
