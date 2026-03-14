import React from "react";
import { FormElementType } from "./configFormData";

export interface DonationFormElements {
  [key: string]:
    | [FormElementType, string, any, string]
    | [FormElementType, string, any, string, { [key: string]: any }];
}

export const donationFormElements: DonationFormElements = {
  amount: [
    "number",
    "The amount you'd like to donate, in dollars",
    25,
    "Amount ($)",
    { min: 1, step: 1 },
  ],
  message: [
    "textarea",
    "A message to share with recipients of the gift",
    "",
    "Message",
  ],
  public: [
    "boolean",
    "Make this donation visible to anyone, or keep it private (accessible via a link only)",
    true,
    "Public",
  ],
  restricted: [
    "boolean",
    "Restrict this donation so it can only be used alone, not combined with others",
    false,
    "Restricted Use",
  ],
  donateResiduals: [
    "boolean",
    "Donate any unused balance back to the pool after expiry",
    true,
    "Donate Residuals",
    // { disabled: true },
  ],
  expiryDate: [
    "text",
    "Date after which this donation expires (YYYY-MM-DD)",
    "",
    "Expiry Date",
  ],
  discretionary: [
    "boolean",
    "Allow this donation to be used for any map, or restrict it to a specific map",
    false,
    "Discretionary",
  ],
};

export type DonationForm = {
  amount: number;
  message: string;
  discretionary: boolean;
  public: boolean;
  restricted: boolean;
  donateResiduals: boolean;
  // expiryDate: string; // YYYY-MM-DD, sent as DateTime to backend
};

export const donationJourney: {
  title: string;
  description: string;
  formElements: string[];
}[] = [
  {
    title: "Your Gift",
    description: "Set the amount and a personal message for your donation.",
    formElements: ["amount", "message"],
  },
  {
    title: "Settings",
    description: "Control how this donation can be used and who can see it.",
    formElements: [
      "discretionary",
      "public",
      "restricted",
      "donateResiduals",
      // "expiryDate",
    ],
  },
];
