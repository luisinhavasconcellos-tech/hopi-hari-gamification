import fs from "node:fs";
import { GoogleAuth } from "google-auth-library";

const keyFile = process.argv[2];
const folderId = process.argv[3] ?? "1MCCYMh2HZq-gxDw1xTJ3F_XFtWk7sI3m";
if (!keyFile) throw new Error("usage: tsx scripts/validate-drive-service-account.mts <key-file> [folder-id]");

const credentials = JSON.parse(fs.readFileSync(keyFile, "utf8")) as {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};
if (!credentials.client_email || !credentials.private_key) throw new Error("invalid_service_account_key");

const auth = new GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/drive.readonly"] });
const client = await auth.getClient();
const accessToken = await client.getAccessToken();
const response = await fetch(
  `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`,
  { headers: { Authorization: `Bearer ${accessToken.token ?? ""}` } },
);
const body = await response.json() as { id?: string; name?: string; mimeType?: string; error?: { message?: string } };
console.log(JSON.stringify({
  clientEmail: credentials.client_email,
  projectId: credentials.project_id ?? null,
  status: response.status,
  folder: response.ok ? { id: body.id, name: body.name, mimeType: body.mimeType } : null,
  error: response.ok ? null : body.error?.message ?? "drive_request_failed",
}));
if (!response.ok) process.exitCode = 1;
