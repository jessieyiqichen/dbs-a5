import { describe, expect, it } from "vitest";
import { REFRESH_WHEN_SECONDS_LEFT, needsFreshToken, secondsLeft } from "./token";

/** A token shaped like Clerk's: header.payload.signature, with the payload in base64url. Only `exp` matters here. */
const tokenExpiringAt = (exp: number) =>
  ["header", Buffer.from(JSON.stringify({ sub: "user_abc", exp })).toString("base64url"), "signature"].join(".");

const now = new Date("2026-10-31T20:11:00Z");
const nowSeconds = now.getTime() / 1000;

describe("secondsLeft", () => {
  it("reads how long a token has before it expires", () => {
    expect(secondsLeft(tokenExpiringAt(nowSeconds + 42), now)).toBe(42);
    expect(secondsLeft(tokenExpiringAt(nowSeconds - 3), now)).toBe(-3);
  });

  it("treats a token it cannot read as already expired", () => {
    expect(secondsLeft("not-a-token", now)).toBe(0);
    expect(secondsLeft(`a.${Buffer.from("{}").toString("base64url")}.c`, now)).toBe(0);
  });
});

describe("needsFreshToken", () => {
  it("asks for a new token once the old one has less than a heartbeat and a bit left", () => {
    expect(REFRESH_WHEN_SECONDS_LEFT).toBeGreaterThan(25); // Realtime's heartbeat, when it passes the token on
    expect(needsFreshToken(tokenExpiringAt(nowSeconds + 34), now)).toBe(false);
    expect(needsFreshToken(tokenExpiringAt(nowSeconds + 8), now)).toBe(true);
  });

  it("asks for one when there is no token yet", () => {
    expect(needsFreshToken(null, now)).toBe(true);
  });
});
