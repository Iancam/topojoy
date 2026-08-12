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
    <Text style={heading}>Variant feedback 🎨</Text>
    <Text style={body}>
      {userName} ({userEmail}) left a message about their variants.
    </Text>

    <Section style={{ ...callout, padding: "14px 18px", margin: "16px 0" }}>
      <Text style={label}>Their message</Text>
      <Text style={{ ...value, whiteSpace: "pre-wrap" }}>{message}</Text>
    </Section>

    <Button href={adminUrl} style={button}>
      View in admin →
    </Button>
  </BaseLayout>
);
