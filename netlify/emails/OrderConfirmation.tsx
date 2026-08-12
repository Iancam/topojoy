import React from "react";
import { Text, Section, Hr } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";
import {
  addressText,
  body,
  detailRow,
  grayBox,
  grayLabel,
  heading,
  itemDetail,
  itemName,
  itemPrice,
  totalAmount,
  totalLabel,
} from "./styles";

type OrderItem = {
  title: string;
  printType: string;
  width: number;
  height: number;
  quantity: number;
  priceFormatted: string;
};

type Props = {
  recipientName: string;
  items: OrderItem[];
  totalFormatted: string;
  shippingMethod: string;
  shippingAddress: string;
};

export const OrderConfirmation: React.FC<Props> = ({
  recipientName,
  items,
  totalFormatted,
  shippingMethod,
  shippingAddress,
}) => (
  <BaseLayout preview={`Your TopoJoy order is confirmed — ${totalFormatted}`}>
    <Text style={heading}>Order confirmed ✓</Text>
    <Text style={{ ...body, margin: "0 0 20px" }}>
      Hi {recipientName}, your map print order has been received and is being
      prepared for production. We'll send you a shipping notification once it's
      on the way.
    </Text>

    <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 16px" }} />

    {items.map((item, i) => (
      <Section key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
        <Text style={itemName}>{item.title || "Topographic Map Print"}</Text>
        <Text style={itemDetail}>
          {item.printType} · {item.width}" × {item.height}" · Qty {item.quantity}
        </Text>
        <Text style={itemPrice}>{item.priceFormatted}</Text>
      </Section>
    ))}

    <Section style={{ ...detailRow, padding: "12px 0 0" }}>
      <Text style={totalLabel}>Total</Text>
      <Text style={totalAmount}>{totalFormatted}</Text>
    </Section>

    <Section style={{ ...grayBox, padding: "12px 16px", margin: "16px 0 0" }}>
      <Text style={{ ...grayLabel, margin: "0 0 6px" }}>Shipping to</Text>
      <Text style={addressText}>{shippingAddress}</Text>
      <Text style={{ ...addressText, color: "#9ca3af", marginTop: "4px" }}>
        {shippingMethod}
      </Text>
    </Section>
  </BaseLayout>
);
