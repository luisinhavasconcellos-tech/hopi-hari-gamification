import { GoogleAuth } from "google-auth-library";
import { describe, expect, it } from "vitest";

const folderId = "1MCCYMh2HZq-gxDw1xTJ3F_XFtWk7sI3m";

const hasServiceAccountSecrets = Boolean(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY);
const describeServiceAccount = hasServiceAccountSecrets ? describe : describe.skip;

describeServiceAccount("Google Drive service account", () => {
  it("reads the Hopi Hari campaign root using masked server secrets", async () => {
    const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
    expect(clientEmail).toBe("hopiharibi@media-scarper.iam.gserviceaccount.com");
    expect(privateKey).toContain("BEGIN PRIVATE KEY");

    const auth = new GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    const token = await (await auth.getClient()).getAccessToken();
    expect(token.token).toBeTruthy();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`,
      { headers: { Authorization: `Bearer ${token.token}` } },
    );
    const responseText = await response.text();
    expect(response.status, responseText).toBe(200);
    expect(JSON.parse(responseText)).toMatchObject({
      id: folderId,
      name: "Hopi Hari.Monks",
      mimeType: "application/vnd.google-apps.folder",
    });
  }, 20_000);
});
