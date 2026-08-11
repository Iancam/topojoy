import React from "react";
import { Text, Section, Button, Hr } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";
import {
  body,
  button,
  callout,
  caption,
  heading,
  label,
  messageText,
} from "./styles";

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
    <Text style={heading}>{recipientName} left you a reply 💚</Text>
    <Text style={{ ...body, margin: "0 0 20px" }}>
      Hi {giverName}, {recipientName} has left a reflection on the map you gifted them.
    </Text>

    <Section style={{ ...callout, padding: "20px 24px", margin: "20px 0" }}>
      <Text style={{ ...label, margin: "0 0 10px" }}>Their reflection</Text>
      <Text style={messageText}>"{message}"</Text>
      {mapTitle && (
        <Text style={caption}>— about <em>{mapTitle}</em></Text>
      )}
    </Section>

    <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 16px" }} />

    <Text style={{ ...body, fontSize: "14px" }}>
      You can view the full exchange and add your own reflection.
    </Text>

    {reflectionUrl && (
      <Button href={reflectionUrl} style={{ ...button, marginTop: "20px" }}>
        View Exchange
      </Button>
    )}
  </BaseLayout>
);
