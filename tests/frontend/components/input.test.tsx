/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Input } from "@/src/ui/components/Input";

describe("Input", () => {
  it("renderiza label y error", () => {
    render(<Input label="Email" error="Email inválido" placeholder="a@b.com" />);

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Email inválido")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("a@b.com")).toBeInTheDocument();
  });
});

