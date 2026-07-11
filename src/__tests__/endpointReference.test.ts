import { describe, expect, it } from "vitest";
import { formatEndpointReference } from "../endpointReference.js";

describe("formatEndpointReference", () => {
  it("shows a nested callable API identifier for grouped members", () => {
    expect(
      formatEndpointReference("abstractapi", {
        apiSlug: "abstractapi/avatars",
        path: "/v1",
      }),
    ).toBe("abstractapi/avatars /v1");
  });

  it("keeps flat group and standalone endpoint output unchanged", () => {
    expect(
      formatEndpointReference("you", { apiSlug: "you", path: "/v1/search" }),
    ).toBe("/v1/search");
    expect(formatEndpointReference("notte", { path: "/sessions/start" })).toBe(
      "/sessions/start",
    );
  });
});
