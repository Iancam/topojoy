import React from "react";
import { Text, Section, Button } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";
import { body, button, callout, heading } from "./styles";

type Props = {
  userName: string;
  mapTitle: string;
  adviceUrl: string;
};

export const MapSubmissionConfirmation: React.FC<Props> = ({
  userName,
  mapTitle,
  adviceUrl,
}) => (
  <BaseLayout preview={`We received your map submission: "${mapTitle}"`}>
    <Text style={heading}>We received your map submission</Text>
    <Text style={body}>
      Hi {userName}, we have received your map submission{" "}
      <strong>{mapTitle}</strong> and are looking forward to turning it into
      variations for you.
    </Text>

    <Section style={{ ...callout, padding: "14px 18px", margin: "16px 0" }}>
      <Text style={{ ...body, margin: 0 }}>
        While you wait, we recommend reading{" "}
        <a href={adviceUrl} style={{ color: "#0d9488", textDecoration: "underline" }}>
          Giving Advice
        </a>
        . It shares some perspective on the spirit of giving that often goes into
        these maps.
      </Text>
    </Section>

    <Button href={adviceUrl} style={button}>
      Read Giving Advice
    </Button>
  </BaseLayout>
);
