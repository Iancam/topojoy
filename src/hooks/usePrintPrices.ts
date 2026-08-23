import { donation, getPrices } from "@/api";
import { getStoredGiftToken } from "@/lib/giftToken";
import { useEffect, useState } from "react";

export const usePrintPrices = ({
  recommendedSizes,
  giftAccessToken,
  orderId,
  imgW,
  imgH,
  setNetGiftAmountCents,
  setAvailableAmountCents,
}: {
  recommendedSizes: any;
  giftAccessToken?: string;
  orderId?: string;
  imgW: number;
  imgH: number;
  setNetGiftAmountCents: (giftMap: Record<string, number>) => void;
  setAvailableAmountCents: (amount: number) => void;
}) => {
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [allRecommendedPrices, setAllRecommendedPrices] = useState<any[]>([]);

  useEffect(() => {
    setIsLoadingPrices(true);
    const token = giftAccessToken || getStoredGiftToken();

    const allRecommendedSizes = Object.values(recommendedSizes)
      .map((v: any) => v.recommended)
      .flat();
    if (allRecommendedSizes.length < 1) return;
    getPrices(allRecommendedSizes).then((prices) => {
      setAllRecommendedPrices(prices);
      if (!token) setIsLoadingPrices(false);
    });

    if (!token) return;

    const biggestItemPerType = Object.values(recommendedSizes).map(
      (r: any) => ({
        ...r.recommended[r.recommended.length - 1],
        quantity: 1,
      }),
    );

    donation
      .getGiftValue({ accessToken: token, items: biggestItemPerType, orderId })
      .then((data: any) => {
        const giftMap = Object.fromEntries(
          data.items.map(({ subcategoryId, adjustedAmountAvailable }: any) => [
            subcategoryId,
            adjustedAmountAvailable,
          ]),
        );
        setNetGiftAmountCents(giftMap);
        setAvailableAmountCents(data.availableAmountCents);
        setIsLoadingPrices(false);
      })
      .catch(() => {});
    // apply gift if available
  }, [imgW, imgH]);

  return {
    isLoadingPrices,
    allRecommendedPrices,
  };
};
