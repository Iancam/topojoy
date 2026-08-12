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
  recipientName: string;
  giverName: string;
  message: string;
  mapTitle?: string;
  reflectionUrl?: string;
};

export const GratitudeMessage: React.FC<Props> = ({
  recipientName,
  giverName,
  message,
  mapTitle,
  reflectionUrl,
}) => (
  <BaseLayout preview={`${giverName} left you a message on your TopoJoy map`}>
    <Text style={heading}>A note from {giverName} 💌</Text>
    <Text style={{ ...body, margin: "0 0 20px" }}>
      Hi {recipientName}, {giverName} left you a message about the map they gifted you.
    </Text>

    <Section style={{ ...callout, padding: "20px 24px", margin: "20px 0" }}>
      <Text style={{ ...label, margin: "0 0 10px" }}>Their message</Text>
      <Text style={messageText}>"{message}"</Text>
      {mapTitle && (
        <Text style={caption}>— about <em>{mapTitle}</em></Text>
      )}
    </Section>

    <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 16px" }} />

    <Text style={{ ...body, fontSize: "14px" }}>
      You can leave a reply or your own reflection on this gift.
    </Text>

    {reflectionUrl && (
      <Button href={reflectionUrl} style={{ ...button, marginTop: "20px" }}>
        Leave a Reflection
      </Button>
    )}
  </BaseLayout>
);
