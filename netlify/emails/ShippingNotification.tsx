import React from "react";
import { Text, Section, Button, Hr } from "@react-email/components";
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
  trackingBox: {
    backgroundColor: "#f0fdfa",
    border: "1px solid #99f6e4",
    borderRadius: "8px",
    padding: "16px 20px",
    margin: "20px 0",
  },
  trackingLabel: {
    color: "#0f766e",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    margin: "0 0 4px",
  },
  trackingNumber: {
    color: "#064e3b",
    fontSize: "20px",
    fontWeight: "700",
    fontFamily: "monospace",
    margin: "0 0 8px",
  },
  carrierText: {
    color: "#0f766e",
    fontSize: "13px",
    margin: 0,
  },
  button: {
    backgroundColor: "#14b8a6",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 24px",
    textDecoration: "none",
    display: "inline-block",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
  },
  detailLabel: {
    color: "#6b7280",
    fontSize: "13px",
    margin: 0,
  },
  detailValue: {
    color: "#111827",
    fontSize: "13px",
    fontWeight: "500",
    margin: 0,
  },
};

type Props = {
  recipientName: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  items: { title: string; quantity: number }[];
};

export const ShippingNotification: React.FC<Props> = ({
  recipientName,
  trackingNumber,
  carrier,
  trackingUrl,
  estimatedDelivery,
  items,
}) => (
  <BaseLayout preview={`Your TopoJoy order has shipped — tracking: ${trackingNumber}`}>
    <Text style={styles.heading}>Your order is on its way! 📦</Text>
    <Text style={styles.body}>
      Hi {recipientName}, great news — your map print
      {items.length === 1 ? "" : "s"} ha{items.length === 1 ? "s" : "ve"} been
      shipped and {items.length === 1 ? "is" : "are"} on the way to you.
    </Text>

    <Section style={styles.trackingBox}>
      <Text style={styles.trackingLabel}>Tracking number</Text>
      <Text style={styles.trackingNumber}>{trackingNumber}</Text>
      <Text style={styles.carrierText}>{carrier}</Text>
    </Section>

    {estimatedDelivery && (
      <>
        <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 12px" }} />
        <Section style={styles.detailRow}>
          <Text style={styles.detailLabel}>Estimated delivery</Text>
          <Text style={styles.detailValue}>{estimatedDelivery}</Text>
        </Section>
      </>
    )}

    {items.length > 0 && (
      <>
        <Hr style={{ borderColor: "#e5e7eb", margin: "12px 0" }} />
        {items.map((item, i) => (
          <Section key={i} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{item.title || "Topographic Map Print"}</Text>
            <Text style={styles.detailValue}>Qty {item.quantity}</Text>
          </Section>
        ))}
      </>
    )}

    {trackingUrl && (
      <Button href={trackingUrl} style={{ ...styles.button, marginTop: "20px" }}>
        Track Package
      </Button>
    )}
  </BaseLayout>
);
