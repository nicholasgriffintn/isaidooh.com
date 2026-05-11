import { handleLeaderboardRequest } from "./leaderboard.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/leaderboard") {
      return handleLeaderboardRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
