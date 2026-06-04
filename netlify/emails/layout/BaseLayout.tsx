import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
  Preview,
} from "@react-email/components";

const BASE_URL = "https://topojoy.studio";

const styles = {
  body: {
    backgroundColor: "#f4f6f7",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
    padding: 0,
  },
  wrapper: {
    maxWidth: "560px",
    margin: "0 auto",
  },
  header: {
    backgroundColor: "#071e25",
    padding: "20px 32px",
    borderRadius: "8px 8px 0 0",
  },
  logo: {
    color: "#14b8a6",
    fontSize: "20px",
    fontWeight: "800",
    letterSpacing: "0.05em",
    margin: 0,
    textDecoration: "none",
  },
  contentSection: {
    backgroundColor: "#ffffff",
    padding: "32px",
  },
  footer: {
    backgroundColor: "#f4f6f7",
    padding: "20px 32px",
    borderRadius: "0 0 8px 8px",
  },
  footerText: {
    color: "#9ca3af",
    fontSize: "11px",
    textAlign: "center" as const,
    margin: 0,
    lineHeight: "1.6",
  },
  footerLink: {
    color: "#14b8a6",
    textDecoration: "underline",
  },
};

type Props = {
  preview: string;
  children: React.ReactNode;
};

export const BaseLayout: React.FC<Props> = ({ preview, children }) => (
  <Html lang="en">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={styles.body}>
      <Container style={styles.wrapper}>
        <Section style={styles.header}>
          <Link href={BASE_URL} style={styles.logo}>
            TopoJoy
          </Link>
        </Section>

        <Section style={styles.contentSection}>{children}</Section>

        <Section style={styles.footer}>
          <Hr style={{ borderColor: "#e5e7eb", margin: "0 0 12px" }} />
          <Text style={styles.footerText}>
            TopoJoy · Gifts of friendship and wilderness{"\n"}
            <Link href={BASE_URL} style={styles.footerLink}>
              topojoy.studio
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
