import React from "react";
import { Text, Section, Hr } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";

const styles = {
  heading: {
    color: "#071e25",
    fontSize: "22px",
    fontWeight: "700",
    margin: "0 0 12px",
  },
  body: {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "1.7",
    margin: "0 0 20px",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  itemName: {
    color: "#111827",
    fontSize: "14px",
    fontWeight: "500",
    margin: "0 0 2px",
  },
  itemDetail: {
    color: "#6b7280",
    fontSize: "12px",
    margin: 0,
  },
  itemPrice: {
    color: "#111827",
    fontSize: "14px",
    fontWeight: "600",
    margin: 0,
    textAlign: "right" as const,
  },
  totalRow: {
    padding: "12px 0 0",
    display: "flex",
    justifyContent: "space-between",
  },
  totalLabel: {
    color: "#374151",
    fontSize: "15px",
    fontWeight: "600",
    margin: 0,
  },
  totalAmount: {
    color: "#071e25",
    fontSize: "18px",
    fontWeight: "800",
    margin: 0,
    textAlign: "right" as const,
  },
  addressBox: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "12px 16px",
    margin: "16px 0 0",
  },
  addressLabel: {
    color: "#6b7280",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    margin: "0 0 6px",
  },
  addressText: {
    color: "#374151",
    fontSize: "13px",
    lineHeight: "1.6",
    margin: 0,
  },
};

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
    <Text style={styles.heading}>Order confirmed ✓</Text>
    <Text style={styles.body}>
      Hi {recipientName}, your map print order has been received and is being
      prepared for production. We'll send you a shipping notification once it's
      on the way.
    </Text>

    <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 16px" }} />

    {items.map((item, i) => (
      <Section key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
        <Text style={styles.itemName}>{item.title || "Topographic Map Print"}</Text>
        <Text style={styles.itemDetail}>
          {item.printType} · {item.width}" × {item.height}" · Qty {item.quantity}
        </Text>
        <Text style={styles.itemPrice}>{item.priceFormatted}</Text>
      </Section>
    ))}

    <Section style={styles.totalRow}>
      <Text style={styles.totalLabel}>Total</Text>
      <Text style={styles.totalAmount}>{totalFormatted}</Text>
    </Section>

    <Section style={styles.addressBox}>
      <Text style={styles.addressLabel}>Shipping to</Text>
      <Text style={styles.addressText}>{shippingAddress}</Text>
      <Text style={{ ...styles.addressText, color: "#9ca3af", marginTop: "4px" }}>
        {shippingMethod}
      </Text>
    </Section>
  </BaseLayout>
);
