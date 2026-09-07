import { matchPostsToCampaigns, type SocialPostForCampaign } from "./lib/postCampaignAttribution";

const post = (caption: string, timestamp: string): SocialPostForCampaign => ({
  platform: "Instagram",
  caption,
  timestamp,
  url: "https://instagram.com/p/test",
  interactions: 120,
  views: 1_000,
});

describe("post campaign attribution", () => {
  const campaigns = [
    { id: 1, driveFolderId: "hdh", name: "Hora do Horror 2026" },
    { id: 2, driveFolderId: "spoiler", name: "Spoiler night HDH26" },
    { id: 3, driveFolderId: "weekend", name: "Fim de semana com Diversão" },
  ];

  it("recognizes explicit campaign names and compact hashtags", () => {
    const result = matchPostsToCampaigns(campaigns, [
      post("A #HoraDoHorror está chegando", "2026-08-10T12:00:00Z"),
      post("Spoiler Night: prepare-se para o HDH26", "2026-08-12T12:00:00Z"),
    ]);
    expect(result.find(item => item.driveFolderId === "hdh")?.posts).toBe(1);
    expect(result.find(item => item.driveFolderId === "spoiler")?.posts).toBe(1);
  });

  it("does not create a campaign link from a generic word alone", () => {
    const result = matchPostsToCampaigns(campaigns, [post("Diversão para toda a família", "2026-08-10T12:00:00Z")]);
    expect(result).toHaveLength(0);
  });

  it("assigns one post to only the best matching campaign", () => {
    const result = matchPostsToCampaigns(campaigns, [post("Spoiler Night HDH26", "2026-08-10T12:00:00Z")]);
    expect(result).toHaveLength(1);
    expect(result[0].driveFolderId).toBe("spoiler");
  });
});
