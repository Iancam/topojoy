export const auth = async (event: any, clerkClient: any) => {
  const baseUrl = process.env.DEV
    ? "http://localhost:8888"
    : "https://topojoy.studio";

  const authorizedParties = process.env.DEV
    ? ["http://localhost:8888"]
    : ["https://topojoy.studio", "https://topojoy.netlify.app"];

  const clerkRequest = {
    url: `${baseUrl}${event.path}${event.rawQuery ? `?${event.rawQuery}` : ""}`,
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
  };
  const auth = await clerkClient.authenticateRequest(clerkRequest, {
    authorizedParties,
  });

  if (!auth.isAuthenticated) {
    return null;
    // { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const { userId } = auth.toAuth();
  return userId;
};
