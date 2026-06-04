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
  messageBox: {
    backgroundColor: "#f0fdfa",
    border: "1px solid #99f6e4",
    borderRadius: "8px",
    padding: "20px 24px",
    margin: "20px 0",
  },
  messageLabel: {
    color: "#0f766e",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    margin: "0 0 10px",
  },
  messageText: {
    color: "#064e3b",
    fontSize: "16px",
    fontStyle: "italic",
    lineHeight: "1.7",
    margin: 0,
  },
  mapTitle: {
    color: "#374151",
    fontSize: "13px",
    margin: "12px 0 0",
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
    marginTop: "20px",
  },
};

type Props = {
  giverName: string;
  recipientName: string;
  message: string;
  mapTitle?: string;
  reflectionUrl?: string;
};

export const GratitudeReply: React.FC<Props> = ({
  giverName,
  recipientName,
  message,
  mapTitle,
  reflectionUrl,
}) => (
  <BaseLayout preview={`${recipientName} replied to your TopoJoy gift`}>
    <Text style={styles.heading}>{recipientName} left you a reply 💚</Text>
    <Text style={styles.body}>
      Hi {giverName}, {recipientName} has left a reflection on the map you gifted them.
    </Text>

    <Section style={styles.messageBox}>
      <Text style={styles.messageLabel}>Their reflection</Text>
      <Text style={styles.messageText}>"{message}"</Text>
      {mapTitle && (
        <Text style={styles.mapTitle}>— about <em>{mapTitle}</em></Text>
      )}
    </Section>

    <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 16px" }} />

    <Text style={{ ...styles.body, fontSize: "14px" }}>
      You can view the full exchange and add your own reflection.
    </Text>

    {reflectionUrl && (
      <Button href={reflectionUrl} style={styles.button}>
        View Exchange
      </Button>
    )}
  </BaseLayout>
);
