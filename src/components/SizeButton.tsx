import { formatMoney } from "@/lib/utils";

export const SizeButton =
  ({
    onClick,
    effectivePrice,
    currentSize,
  }: {
    onClick: (width: number, height: number, rawPrice: number) => void;
    effectivePrice: (rawPrice: number) => number;
    currentSize: { width: number; height: number } | null;
  }) =>
  (size: { width: number; height: number; price: number; score: number }) => {
    const { width, height, price, score } = size;
    const isSelected =
      currentSize?.width === width && currentSize?.height === height;
    const matchPercent = Math.round(score * 100);
    const rawPrice = price;
    if (!rawPrice) return null;
    const discounted = effectivePrice(rawPrice);
    return (
      <button
        key={`${width}x${height}`}
        type="button"
        onClick={() => onClick(width, height, rawPrice)}
        className={`text-left px-2 py-1.5 rounded border text-xs transition-colors ${
          isSelected
            ? "border-blue-600 bg-blue-50 text-blue-700"
            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
        }`}
      >
        <div className="flex justify-between items-center">
          <span>
            {width}" × {height}"
          </span>
          <span className="text-[10px] ml-1 flex items-center gap-1">
            {discounted < rawPrice && (
              <span className="line-through text-gray-400">
                {formatMoney(rawPrice)}
              </span>
            )}
            <span
              className={
                discounted < rawPrice
                  ? "text-teal-600 font-semibold"
                  : "text-gray-500"
              }
            >
              {formatMoney(discounted)}
            </span>
          </span>
        </div>
      </button>
    );
  };
