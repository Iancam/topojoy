import { handler } from "../functions/print-price-post";

jest.mock("../lib/env", () => ({ isProduction: () => true }));
jest.mock("../lib", () => ({
  success: (body: unknown) => ({ statusCode: 200, body: JSON.stringify(body) }),
  error: (body: string, statusCode: number) => ({ statusCode, body }),
}));

const product = { subcategoryId: 101, width: 8, height: 10 };
const event = { body: JSON.stringify({ products: [product] }) };

afterEach(() => jest.restoreAllMocks());

it("logs the upstream HTML, status, and content type when JSON parsing fails", async () => {
  const html = "<!doctype html><html><body>Service unavailable</body></html>";
  jest.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(html, {
      status: 503,
      headers: { "content-type": "text/html" },
    }),
  );
  const log = jest.spyOn(console, "error").mockImplementation(() => {});

  const result = await handler(event);

  expect(log).toHaveBeenCalledWith(
    "Lumaprints pricing response could not be parsed",
    expect.objectContaining({
      ...product,
      status: 503,
      contentType: "text/html",
      body: html,
    }),
  );
  expect(result).toEqual({ statusCode: 200, body: "[null]" });
});

it("preserves successful price conversion without logging response bodies", async () => {
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify({ price: "12.50" })));
  const log = jest.spyOn(console, "error").mockImplementation(() => {});

  const result = await handler(event);

  expect(JSON.parse(result.body)).toEqual([{ ...product, price: 1250 }]);
  expect(log).not.toHaveBeenCalled();
});
