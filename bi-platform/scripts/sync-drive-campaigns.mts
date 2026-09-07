import "dotenv/config";
import { syncDriveCampaigns } from "../server/lib/driveCampaignSync";

const result = await syncDriveCampaigns();
console.log(JSON.stringify(result));
process.exit(0);
