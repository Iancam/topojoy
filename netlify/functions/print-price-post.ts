import { z } from "zod";
export const handler = async (event: any) => {
  const { products } = JSON.parse(event.body);
  const authHeader = () => {
    return process.env.CONTEXT === "production"
      ? `Basic ${Buffer.from(`${process.env.LUMAPRINTS_API_KEY}:${process.env.LUMAPRINTS_API_SECRET}`).toString("base64")}`
      : `Basic ${Buffer.from(`${process.env.sbx_lumaprints_key}:${process.env.sbx_lumaprints_secret}`).toString("base64")}`;
  };

  // zod validation for products
  const productsSchema = z.array(
    z.object({
      subcategoryId: z.number(),
      width: z.number(),
      height: z.number(),
      score: z.number().optional(),
      options: z.array(z.number()).optional(),
    }),
  );

  //validate products
  const validatedProducts = productsSchema.parse(products);

  if (!validatedProducts) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid products" }),
    };
  }

  const prices = await Promise.all(
    validatedProducts.map(
      ({ subcategoryId, width, height, score, options }: any) =>
        fetch(
          `https://us.${process.env.CONTEXT === "production" ? "api" : "api-sandbox"}.lumaprints.com/api/v1/pricing/product`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader(),
            },
            body: JSON.stringify({
              size: { width, height },
              options,
              subcategoryId,
            }),
          },
        ).then((res) => {
          return res.json().then((json) => ({
            subcategoryId,
            width,
            height,
            score,
            options,
            ...json,
            price: Number(json.price) * 100, // convert to cents
          }));
        }),
    ),
  );

  return {
    statusCode: 200,
    body: JSON.stringify(prices),
  };
};
