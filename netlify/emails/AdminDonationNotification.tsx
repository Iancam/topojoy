import React from "react";
import { Text, Section, Link } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";
import {
  body,
  callout,
  heading,
  label,
  largeValue,
  link,
  linkBox,
  linkLabel,
  value,
} from "./styles";

type Props = {
  donorName: string;
  donorEmail: string;
  amountFormatted: string;
  giftLinkUrl: string;
  message?: string;
};

export const AdminDonationNotification: React.FC<Props> = ({
  donorName,
  donorEmail,
  amountFormatted,
  giftLinkUrl,
  message,
}) => (
  <BaseLayout preview={`New ${amountFormatted} donation from ${donorName}`}>
    <Text style={heading}>New donation received 🎉</Text>
    <Text style={body}>
      {donorName} ({donorEmail}) just made a donation.
    </Text>

    <Section style={{ ...callout, padding: "14px 18px", margin: "16px 0" }}>
      <Text style={label}>Donation amount</Text>
      <Text style={largeValue}>{amountFormatted}</Text>
    </Section>

    {message && (
      <Section style={{ ...callout, padding: "14px 18px", margin: "16px 0" }}>
        <Text style={label}>Message</Text>
        <Text style={value}>{message}</Text>
      </Section>
    )}

    <Section style={linkBox}>
      <Text style={linkLabel}>Gift link</Text>
      <Link href={giftLinkUrl} style={link}>
        {giftLinkUrl}
      </Link>
    </Section>
  </BaseLayout>
);
