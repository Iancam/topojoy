import React, { useContext } from "react";
import { Config } from "../types";

export type ConfigFormContextValue = {
  config: string;
  configs: Record<string, Config>;
  features: Record<string, string[]>;
  collisions: Record<string, string[]>;
  onConfigChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  renderFormElement: (props: any) => React.ReactNode;
  annotationsMode: boolean;
  onAnnotationsModeToggle: () => void;
  imageIsStale: boolean;
};

export const ConfigFormContext =
  React.createContext<ConfigFormContextValue | null>(null);

export const useConfigForm = (): ConfigFormContextValue => {
  const ctx = useContext(ConfigFormContext);
  if (!ctx) {
    throw new Error("useConfigForm must be used inside ConfigForm");
  }
  return ctx;
};
