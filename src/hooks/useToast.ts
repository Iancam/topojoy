import { useEffect, useState } from "react";

export type ToastState = {
  message: string;
  type: "success" | "error" | "info";
} | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return { toast, setToast };
}
