import React from "react";
import { Text, Button } from "@react-email/components";
import { BaseLayout } from "./layout/BaseLayout";
import { body, button, heading } from "./styles";

type Props = {
  userName: string;
  mapTitle: string;
  chooseUrl: string;
};

export const VariantsReady: React.FC<Props> = ({
  userName,
  mapTitle,
  chooseUrl,
}) => (
  <BaseLayout preview={`Your variants for "${mapTitle}" are ready`}>
    <Text style={heading}>Your variants are ready 🎉</Text>
    <Text style={body}>
      Hi {userName}, we've finished creating variants for "{mapTitle}". Take a
      look and let us know which one you'd like to move forward with.
    </Text>

    <Button href={chooseUrl} style={button}>
      View your variants →
    </Button>
  </BaseLayout>
);
