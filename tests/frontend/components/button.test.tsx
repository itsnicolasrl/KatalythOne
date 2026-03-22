/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "@/src/ui/components/Button";

describe("Button", () => {
  it("renderiza texto y es accesible como button", () => {
    render(<Button variant="ghost">Hola</Button>);
    expect(screen.getByRole("button", { name: "Hola" })).toBeInTheDocument();
  });

  it("aplica clases dependientes de variant", () => {
    render(<Button variant="outline">X</Button>);
    const btn = screen.getByRole("button", { name: "X" });
    expect(btn.className).toContain("border");
    expect(btn.className).toContain("bg-surface");
  });
});

