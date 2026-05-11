export function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export async function readJsonRequest(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
