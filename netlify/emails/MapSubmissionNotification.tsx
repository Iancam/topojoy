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
  mapTitle: string;
  editorUrl: string;
  who?: string;
  why?: string;
  message?: string;
};

export const MapSubmissionNotification: React.FC<Props> = ({
  userEmail,
  userName,
  mapTitle,
  editorUrl,
  who,
  why,
  message,
}) => (
  <BaseLayout preview={`New map submission: "${mapTitle}" from ${userName}`}>
    <Text style={styles.heading}>New map submission 🗺️</Text>
    <Text style={styles.body}>
      {userName} ({userEmail}) has submitted a map for your review.
    </Text>

    <Section style={styles.box}>
      <Text style={styles.label}>Map title</Text>
      <Text style={styles.value}>{mapTitle}</Text>
    </Section>

    {who && (
      <Section style={styles.box}>
        <Text style={styles.label}>Who is this map for?</Text>
        <Text style={styles.value}>{who}</Text>
      </Section>
    )}

    {why && (
      <Section style={styles.box}>
        <Text style={styles.label}>Why this place / why them?</Text>
        <Text style={styles.value}>{why}</Text>
      </Section>
    )}

    {message && (
      <Section style={styles.box}>
        <Text style={styles.label}>Message to Ian</Text>
        <Text style={styles.value}>{message}</Text>
      </Section>
    )}

    <Button href={editorUrl} style={styles.button}>
      Open in editor →
    </Button>
  </BaseLayout>
);
