export default {
  async fetch(request, env, ctx) {
    try {
      const assetUrl = new URL(filePath, url.origin);
      const assetRequest = new Request(assetUrl.toString(), request);

      return env.ASSETS.fetch(assetRequest);
    } catch (e) {
      const url = new URL(request.url);
      if (url.pathname !== "/") {
        return new Response("Not Found", { status: 404 });
      }
      return new Response("Internal Error", { status: 500 });
    }
  },
};
