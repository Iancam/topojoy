import React from "react";
import { Text, Section, Button } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";

const styles = {
  heading: {
    color: "#071e25",
    fontSize: "22px",
    fontWeight: "700" as const,
    margin: "0 0 12px",
  },
  body: {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "1.7",
    margin: "0 0 16px",
  },
  box: {
    backgroundColor: "#f0fdfa",
    border: "1px solid #99f6e4",
    borderRadius: "8px",
    padding: "14px 18px",
    margin: "16px 0",
  },
  label: {
    color: "#0f766e",
    fontSize: "11px",
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    margin: "0 0 4px",
  },
  value: {
    color: "#064e3b",
    fontSize: "15px",
    margin: "0",
    whiteSpace: "pre-wrap" as const,
  },
  button: {
    backgroundColor: "#14b8a6",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600" as const,
    padding: "12px 24px",
    textDecoration: "none",
    display: "inline-block",
  },
};

type Props = {
  userEmail: string;
  userName: string;
  message: string;
  adminUrl: string;
};

export const VariantFeedback: React.FC<Props> = ({
  userEmail,
  userName,
  message,
  adminUrl,
}) => (
  <BaseLayout preview={`Variant feedback from ${userName}`}>
    <Text style={styles.heading}>Variant feedback 🎨</Text>
    <Text style={styles.body}>
      {userName} ({userEmail}) left a message about their variants.
    </Text>

    <Section style={styles.box}>
      <Text style={styles.label}>Their message</Text>
      <Text style={styles.value}>{message}</Text>
    </Section>

    <Button href={adminUrl} style={styles.button}>
      View in admin →
    </Button>
  </BaseLayout>
);
