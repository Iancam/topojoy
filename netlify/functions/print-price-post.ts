export const handler = async (event: any) => {
  const { products } = JSON.parse(event.body);
  const authHeader = () => {
    return process.env.NODE_ENV === "production"
      ? `Basic ${Buffer.from(`${process.env.LUMAPRINTS_API_KEY}:${process.env.LUMAPRINTS_API_SECRET}`).toString("base64")}`
      : `Basic ${Buffer.from(`${process.env.sbx_lumaprints_key}:${process.env.sbx_lumaprints_secret}`).toString("base64")}`;
  };

  const prices = await Promise.all(
    products.map(({ subcategoryId, width, height, score, options }: any) =>
      fetch(
        `https://us.${process.env.NODE_ENV === "production" ? "api" : "api-sandbox"}.lumaprints.com/api/v1/pricing/product`,
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
