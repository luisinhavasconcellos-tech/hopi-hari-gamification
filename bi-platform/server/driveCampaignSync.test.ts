import { describe, expect, it } from "vitest";
import { DRIVE_CAMPAIGN_CRON, driveAssetRejectionReason, driveCampaignSlug, hasDriveAssetChanged } from "./lib/driveCampaignSync";

describe("Drive campaign synchronization contract", () => {
  it("creates stable Unicode-safe slugs tied to Drive folder identity", () => {
    expect(driveCampaignSlug("Férias de Julho 2026", "folder-ABC12345")).toBe(
      "ferias-de-julho-2026-abc12345",
    );
    expect(driveCampaignSlug("Férias de Julho 2026", "folder-ABC12345")).toBe(
      driveCampaignSlug("Férias de Julho 2026", "folder-ABC12345"),
    );
  });

  it("keeps folders with identical names distinct", () => {
    expect(driveCampaignSlug("Vai Brasil", "folder-11111111")).not.toBe(
      driveCampaignSlug("Vai Brasil", "folder-22222222"),
    );
  });

  it("uses the approved six-hour UTC schedule", () => {
    expect(DRIVE_CAMPAIGN_CRON).toBe("0 0 4,10,16,22 * * *");
  });

  it("uses checksum plus metadata to distinguish unchanged and changed assets", () => {
    const existing = {
      name: "Meta 1080x1080.png", mimeType: "image/png", sizeBytes: 1200, md5Checksum: "abc",
      modifiedAt: "2026-08-28T12:00:00.000Z", relativePath: "Meta 1080x1080.png", webViewLink: null,
    };
    const incoming = {
      id: "file-1", name: existing.name, mimeType: existing.mimeType, size: "1200", md5Checksum: "abc",
      modifiedTime: existing.modifiedAt, relativePath: existing.relativePath,
    };
    expect(hasDriveAssetChanged(existing, incoming)).toBe(false);
    expect(hasDriveAssetChanged(existing, { ...incoming, md5Checksum: "def" })).toBe(true);
    expect(hasDriveAssetChanged(existing, { ...incoming, name: "Meta renamed.png", relativePath: "Meta renamed.png" })).toBe(true);
  });

  it("rejects malformed Drive assets before persistence", () => {
    expect(driveAssetRejectionReason({ id: "file-1", name: "asset.png", mimeType: "image/png" })).toBe(
      "modified_time_missing_or_invalid",
    );
    expect(driveAssetRejectionReason({
      id: "file-2", name: "asset.png", mimeType: "image/png", modifiedTime: "invalid", size: "abc",
    })).toBe("modified_time_missing_or_invalid");
    expect(driveAssetRejectionReason({
      id: "file-3", name: "asset.png", mimeType: "image/png", modifiedTime: "2026-08-28T12:00:00.000Z", size: "abc",
    })).toBe("size_invalid");
    expect(driveAssetRejectionReason({
      id: "file-4", name: "asset.png", mimeType: "image/png", modifiedTime: "2026-08-28T12:00:00.000Z", size: "1200",
    })).toBeNull();
  });
});
