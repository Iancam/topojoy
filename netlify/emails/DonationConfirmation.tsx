import React from "react";
import { Text, Section, Button } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";
import {
  body,
  button,
  callout,
  heading,
  label,
  largeValue,
} from "./styles";

type Props = {
  donorName: string;
  amountFormatted: string;
  giftLinkUrl: string;
  recipientName?: string;
  message?: string;
};

export const DonationConfirmation: React.FC<Props> = ({
  donorName,
  amountFormatted,
  giftLinkUrl,
  recipientName,
  message,
}) => (
  <BaseLayout
    preview={`Your TopoJoy gift of ${amountFormatted} is ready to share`}
  >
    <Text style={heading}>Your gift is ready! 🎁</Text>
    <Text style={{ ...body, margin: "0 0 20px" }}>
      Hi {donorName}, your donation was successful. Here's a gift link
      {recipientName ? ` for ${recipientName}` : ""} — share it whenever you're
      ready.
    </Text>

    <Section style={{ ...callout, padding: "16px 20px", margin: "20px 0" }}>
      <Text style={{ ...label, fontSize: "12px" }}>Gift amount</Text>
      <Text style={largeValue}>{amountFormatted}</Text>
    </Section>

    {message && (
      <Text style={{ ...body, fontStyle: "italic", color: "#6b7280" }}>
        Your message: "{message}"
      </Text>
    )}

    <Button href={giftLinkUrl} style={button}>
      View Gift
    </Button>
  </BaseLayout>
);
