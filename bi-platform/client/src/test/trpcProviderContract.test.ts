import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("application tRPC provider contract", () => {
  it("wraps authenticated application routes in the shared tRPC provider", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

    expect(source).toContain("<trpc.Provider client={trpcClient} queryClient={queryClient}>");
    expect(source).toContain("Authorization: `Bearer ${token}`");
    expect(source).toContain("<QueryClientProvider client={queryClient}>");
  });
});
