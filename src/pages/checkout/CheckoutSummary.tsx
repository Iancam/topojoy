import { MapThumbnail } from "@/components/MapThumbnail";
import { formatMoney } from "@/lib/utils";

export const CheckoutSummary = ({
  items,
  selectedShippingCostCents,
  orderTotal,
  amountOwedCents,
  grandTotalCents,
  totalAmount,
  giftAccessToken,
}: {
  items: any[];
  selectedShippingCostCents: number;
  orderTotal: number;
  amountOwedCents: number | null;
  grandTotalCents: number;
  totalAmount: number | null;
  giftAccessToken: string | null;
}) => {
  console.log(items);
  return (
    <aside className="border rounded-lg p-4 bg-white shadow-sm h-fit space-y-3">
      <h2 className="text-lg font-semibold">Summary</h2>
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => {
            const s3Key = item.mapConfig?.s3Key;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 text-xs text-gray-700"
              >
                <div className="w-12 h-9 bg-gray-100 flex items-center justify-center overflow-hidden rounded">
                  {s3Key ? (
                    <MapThumbnail
                      title={item.mapConfig?.filename || "Map preview"}
                      s3Key={s3Key}
                    />
                  ) : (
                    <span className="text-[10px] text-gray-400">No image</span>
                  )}
                </div>
                <div className="flex-1 truncate">
                  <div className="truncate font-medium">
                    {item.mapConfig?.filename || "Untitled map"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {item.printType} · {item.width}&quot; × {item.height}
                    &quot; · Qty {item.quantity}
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    {giftAccessToken ? "Gift" : formatMoney(item.itemPrice)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Items</span>
        <span className="font-medium">{items.length}</span>
      </div>
      {!giftAccessToken && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Items subtotal</span>
          <div className="text-right">
            <span className="font-semibold">{formatMoney(orderTotal)}</span>
          </div>
        </div>
      )}
      {selectedShippingCostCents > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="font-semibold">
            {giftAccessToken ? "Free" : formatMoney(selectedShippingCostCents)}
          </span>
        </div>
      )}
      <div className="flex justify-between text-sm border-t pt-2 mt-1">
        <span className="text-gray-800 font-semibold">Total</span>
        <div className="text-right">
          {amountOwedCents !== null ? (
            <>
              {/* <div className="line-through text-gray-400 text-xs">
                {formatMoney(grandTotalCents)}
              </div> */}
              <div className="font-semibold text-green-700">
                {formatMoney(amountOwedCents)}
              </div>
            </>
          ) : (
            <span className="font-semibold">
              {formatMoney(totalAmount || grandTotalCents)}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
