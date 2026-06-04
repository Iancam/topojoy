import React from "react";
import { Text, Link, Section, Button } from "@react-email/components";
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
  amountBox: {
    backgroundColor: "#f0fdfa",
    border: "1px solid #99f6e4",
    borderRadius: "8px",
    padding: "16px 20px",
    margin: "20px 0",
  },
  amountLabel: {
    color: "#0f766e",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    margin: "0 0 4px",
  },
  amount: {
    color: "#064e3b",
    fontSize: "28px",
    fontWeight: "800",
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
  linkSection: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "12px 16px",
    margin: "16px 0",
    wordBreak: "break-all" as const,
  },
  linkLabel: {
    color: "#6b7280",
    fontSize: "11px",
    margin: "0 0 4px",
  },
  giftLink: {
    color: "#14b8a6",
    fontSize: "13px",
    fontFamily: "monospace",
  },
};

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
  <BaseLayout preview={`Your TopoJoy gift of ${amountFormatted} is ready to share`}>
    <Text style={styles.heading}>Your gift is ready! 🎁</Text>
    <Text style={styles.body}>
      Hi {donorName}, your donation was successful. Here's a gift link
      {recipientName ? ` for ${recipientName}` : ""} — share it whenever you're
      ready.
    </Text>

    <Section style={styles.amountBox}>
      <Text style={styles.amountLabel}>Gift amount</Text>
      <Text style={styles.amount}>{amountFormatted}</Text>
    </Section>

    {message && (
      <Text style={{ ...styles.body, fontStyle: "italic", color: "#6b7280" }}>
        Your message: "{message}"
      </Text>
    )}

    <Text style={{ ...styles.body, margin: "20px 0 8px" }}>
      Share this link with the recipient so they can apply the gift at checkout:
    </Text>

    <Section style={styles.linkSection}>
      <Text style={styles.linkLabel}>Gift link</Text>
      <Link href={giftLinkUrl} style={styles.giftLink}>
        {giftLinkUrl}
      </Link>
    </Section>

    <Button href={giftLinkUrl} style={styles.button}>
      View Gift
    </Button>
  </BaseLayout>
);
