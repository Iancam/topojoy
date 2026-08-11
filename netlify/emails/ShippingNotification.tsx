import React from "react";
import { Text, Section, Button, Hr } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";
import {
  body,
  button,
  callout,
  carrierText,
  detailLabel,
  detailRow,
  detailValue,
  heading,
  label,
  monoValue,
} from "./styles";

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
    <Text style={heading}>Your order is on its way! 📦</Text>
    <Text style={{ ...body, margin: "0 0 20px" }}>
      Hi {recipientName}, great news — your map print
      {items.length === 1 ? "" : "s"} ha{items.length === 1 ? "s" : "ve"} been
      shipped and {items.length === 1 ? "is" : "are"} on the way to you.
    </Text>

    <Section style={{ ...callout, padding: "16px 20px", margin: "20px 0" }}>
      <Text style={label}>Tracking number</Text>
      <Text style={monoValue}>{trackingNumber}</Text>
      <Text style={carrierText}>{carrier}</Text>
    </Section>

    {estimatedDelivery && (
      <>
        <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 12px" }} />
        <Section style={detailRow}>
          <Text style={detailLabel}>Estimated delivery</Text>
          <Text style={detailValue}>{estimatedDelivery}</Text>
        </Section>
      </>
    )}

    {items.length > 0 && (
      <>
        <Hr style={{ borderColor: "#e5e7eb", margin: "12px 0" }} />
        {items.map((item, i) => (
          <Section key={i} style={detailRow}>
            <Text style={detailLabel}>{item.title || "Topographic Map Print"}</Text>
            <Text style={detailValue}>Qty {item.quantity}</Text>
          </Section>
        ))}
      </>
    )}

    {trackingUrl && (
      <Button href={trackingUrl} style={{ ...button, marginTop: "20px" }}>
        Track Package
      </Button>
    )}
  </BaseLayout>
);
