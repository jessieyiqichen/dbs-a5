import { describe, expect, it } from "vitest";
import { BOARD_LOOK, titleHalo } from "./look";

describe("titleHalo: the outline on the poster's front letters", () => {
  it("is navy when the stage shape is off-white, so the letters do not vanish into it (user, 2026-11-01)", () => {
    expect(titleHalo("off")).toBe("navy");
  });

  it("is off-white over every other shape colour", () => {
    expect(titleHalo("red")).toBe("off");
    expect(titleHalo("cobalt")).toBe("off");
    expect(titleHalo("navy")).toBe("off");
  });

  it("is off-white when no board has risen yet (the mustard stage with no shape)", () => {
    expect(titleHalo(null)).toBe("off");
  });

  it("gives every board's shape an outline that differs from the shape", () => {
    for (const look of Object.values(BOARD_LOOK)) expect(titleHalo(look.color)).not.toBe(look.color);
  });
});
