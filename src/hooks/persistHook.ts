import { LS } from "@/lib/utils";
import { useEffect } from "react";

export const usePersistHook = ({
  configId,
  config,
  form,
  collisions,
  isInitialRun,
}: {
  configId: string | null;
  config: string;
  form: Record<string, any>;
  collisions: Record<string, any>;
  isInitialRun: boolean;
}) => {
  useEffect(() => {
    if (configId) return;
    localStorage.setItem(LS.CONFIG, config);
  }, [config]);

  // Persist form entries whenever they change
  useEffect(() => {
    if (configId) return;
    localStorage.setItem(LS.FORM, JSON.stringify(form));
  }, [form]);

  // Persist collisions whenever they change
  useEffect(() => {
    if (configId) return;
    localStorage.setItem(LS.COLLISIONS, JSON.stringify(collisions));
  }, [collisions]);

  // Persist default keep list flag whenever it changes
  useEffect(() => {
    if (configId) return;
    localStorage.setItem(
      LS.IS_DEFAULT_KEEP_LIST_SET,
      JSON.stringify(isInitialRun),
    );
  }, [isInitialRun]);
};
