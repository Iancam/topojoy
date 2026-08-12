import type { CSSProperties } from "react";

export const heading = {
  color: "#071e25",
  fontSize: "22px",
  fontWeight: 700,
  margin: "0 0 12px",
} as CSSProperties;

export const body = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "0 0 16px",
} as CSSProperties;

export const bodySmall = {
  ...body,
  fontSize: "14px",
} as CSSProperties;

export const button = {
  backgroundColor: "#14b8a6",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
} as CSSProperties;

export const callout = {
  backgroundColor: "#f0fdfa",
  border: "1px solid #99f6e4",
  borderRadius: "8px",
} as CSSProperties;

export const grayBox = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
} as CSSProperties;

export const label = {
  color: "#0f766e",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 4px",
} as CSSProperties;

export const grayLabel = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 4px",
} as CSSProperties;

export const value = {
  color: "#064e3b",
  fontSize: "15px",
  margin: 0,
} as CSSProperties;

export const largeValue = {
  ...value,
  fontSize: "28px",
  fontWeight: 800,
} as CSSProperties;

export const monoValue = {
  ...value,
  fontSize: "20px",
  fontWeight: 700,
  fontFamily: "monospace",
} as CSSProperties;

export const carrierText = {
  color: "#0f766e",
  fontSize: "13px",
  margin: 0,
} as CSSProperties;

export const caption = {
  color: "#374151",
  fontSize: "13px",
  margin: "12px 0 0",
} as CSSProperties;

export const messageText = {
  ...value,
  fontSize: "16px",
  fontStyle: "italic",
  lineHeight: "1.7",
} as CSSProperties;

export const linkBox = {
  ...grayBox,
  padding: "12px 16px",
  margin: "16px 0",
  wordBreak: "break-all",
} as CSSProperties;

export const linkLabel = {
  color: "#6b7280",
  fontSize: "11px",
  margin: "0 0 4px",
} as CSSProperties;

export const link = {
  color: "#14b8a6",
  fontSize: "13px",
  fontFamily: "monospace",
} as CSSProperties;

export const detailRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
} as CSSProperties;

export const detailLabel = {
  color: "#6b7280",
  fontSize: "13px",
  margin: 0,
} as CSSProperties;

export const detailValue = {
  color: "#111827",
  fontSize: "13px",
  fontWeight: 500,
  margin: 0,
} as CSSProperties;

export const itemName = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: 500,
  margin: "0 0 2px",
} as CSSProperties;

export const itemDetail = {
  color: "#6b7280",
  fontSize: "12px",
  margin: 0,
} as CSSProperties;

export const itemPrice = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: 600,
  margin: 0,
  textAlign: "right",
} as CSSProperties;

export const totalLabel = {
  color: "#374151",
  fontSize: "15px",
  fontWeight: 600,
  margin: 0,
} as CSSProperties;

export const totalAmount = {
  color: "#071e25",
  fontSize: "18px",
  fontWeight: 800,
  margin: 0,
  textAlign: "right",
} as CSSProperties;

export const addressText = {
  color: "#374151",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: 0,
} as CSSProperties;
