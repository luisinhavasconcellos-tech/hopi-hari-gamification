import { matchesHoraDoHorror, MINIMUM_REPUTATION_REVIEWS, MINIMUM_SEARCH_DAYS, MINIMUM_SOCIAL_MENTIONS } from "./lib/horaDoHorrorSignals";

describe("Hora do Horror listening evidence", () => {
  it("recognizes the official theme and HDH campaign shorthand", () => {
    expect(matchesHoraDoHorror("hora do horror ingressos")).toBe(true);
    expect(matchesHoraDoHorror("#HDH26")).toBe(true);
    expect(matchesHoraDoHorror("férias de julho")).toBe(false);
  });

  it("keeps independent minimum samples for search, social, and reputation", () => {
    expect(MINIMUM_SEARCH_DAYS).toBe(3);
    expect(MINIMUM_SOCIAL_MENTIONS).toBe(5);
    expect(MINIMUM_REPUTATION_REVIEWS).toBe(5);
  });
});
