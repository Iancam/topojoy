import React from "react";
import { Text, Section, Button } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";
import {
  body,
  button,
  callout,
  heading,
  label,
  value,
} from "./styles";

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
    <Text style={heading}>New map submission 🗺️</Text>
    <Text style={body}>
      {userName} ({userEmail}) has submitted a map for your review.
    </Text>

    <Section style={{ ...callout, padding: "14px 18px", margin: "16px 0" }}>
      <Text style={label}>Map title</Text>
      <Text style={value}>{mapTitle}</Text>
    </Section>

    {who && (
      <Section style={{ ...callout, padding: "14px 18px", margin: "16px 0" }}>
        <Text style={label}>Who is this map for?</Text>
        <Text style={value}>{who}</Text>
      </Section>
    )}

    {why && (
      <Section style={{ ...callout, padding: "14px 18px", margin: "16px 0" }}>
        <Text style={label}>Why this place / why them?</Text>
        <Text style={value}>{why}</Text>
      </Section>
    )}

    {message && (
      <Section style={{ ...callout, padding: "14px 18px", margin: "16px 0" }}>
        <Text style={label}>Message to Ian</Text>
        <Text style={value}>{message}</Text>
      </Section>
    )}

    <Button href={editorUrl} style={button}>
      Open in editor →
    </Button>
  </BaseLayout>
);
