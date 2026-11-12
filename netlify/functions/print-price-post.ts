import { z } from "zod";
import { isProduction } from "../lib/env";
import { error, success } from "../lib";

export const handler = async (event: any) => {
  const { products } = JSON.parse(event.body);
  const isProd = isProduction();

  const authHeader = () => {
    return isProd
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
    return error("Invalid products", 400);
  }
  try {
    const prices = await Promise.all(
      validatedProducts.map(
        ({ subcategoryId, width, height, score, options }: any) =>
          fetch(
            `https://us.${isProd ? "api" : "api-sandbox"}.lumaprints.com/api/v1/pricing/product`,
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
          ).then(async (res) => {
            const body = await res.text();
            try {
              const json = JSON.parse(body);
              return {
                subcategoryId,
                width,
                height,
                score,
                options,
                ...json,
                price: Number(json.price) * 100, // convert to cents
              };
            } catch (err) {
              console.error("Lumaprints pricing response could not be parsed", {
                status: res.status,
                contentType: res.headers.get("content-type"),
                subcategoryId,
                width,
                height,
                body,
                error: err,
              });
              return null;
            }
          }),
      ),
    );
    return success(prices);
  } catch (err: any) {
    return error(err.message ?? "Internal server error", 500);
  }
};
