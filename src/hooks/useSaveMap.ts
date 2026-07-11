import { maps, order, saveImageToAws } from "@/api";
import { printTypes } from "@/lib/printSIzeHelpers";
// import { printTypes } from "@/(components/PrintOptions";
import { needsFilenamePrompt } from "@/lib/utils";
import { configs } from "@/mapConfigs";
import { useState } from "react";
import { getStoredGiftIntent } from "@/components/GiftIntentForm";

export const useSaveMap = ({
  form,
  onFormChange,
  captureImage,
  captureImageForPrint,
  setToast,
  features,
  bbox,
  selectedTrails,
  user,
  config,
  isSignedIn,
  cartContext,
}: {
  form: Record<string, any>;
  onFormChange: (form: Record<string, any>) => void;
  captureImage: () => Promise<Blob | null> | undefined;
  captureImageForPrint: (
    w: number,
    h: number,
  ) => Promise<Blob | null> | undefined;
  setToast: (toast: {
    message: string;
    type: "success" | "error" | "info";
  }) => void;
  features: any;
  bbox: [number, number, number, number];
  selectedTrails: string[];
  user: any;
  config: string;
  isSignedIn: boolean | undefined;
  cartContext: any;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const buildReflections = () => {
    const intent = getStoredGiftIntent();
    if (!intent) return [];
    const questions = [
      { key: "who", prompt: "Who are you making this map for?" },
      { key: "why", prompt: "Why this place? Why them?" },
      {
        key: "empathy",
        prompt:
          "Put yourself in their shoes for a moment. How would it feel to receive this?",
      },
    ] as const;
    return questions
      .filter((q) => intent[q.key]?.trim())
      .map((q) => ({ question: q.prompt, answer: intent[q.key] }));
  };

  const upsertMap = async (
    mapConfigData: {
      form: Record<string, string>;
      givenFeatures: any;
      bbox: [number, number, number, number];
      selectedTrails: string[];
      user: any;
      configName: string;
      defaultConfig: Record<string, any>;
    },
    blob: Blob,
  ) => {
    const newMapConfig = await maps.upsert({
      ...mapConfigData,
      reflections: buildReflections(),
    });
    const AWSPutUrl = newMapConfig.AWSPutURL;
    saveImageToAws({
      blob,
      AWSPutURL: AWSPutUrl,
    });
    onFormChange({ id: newMapConfig.id, s3Key: newMapConfig.s3Key });
    return newMapConfig;
  };

  const handleUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);
    try {
      const blob = await captureImage();
      if (!blob) {
        console.error("Failed to capture image");
        return;
      }

      const newMapConfig = await upsertMap(
        {
          form: form,
          givenFeatures: features,
          bbox: bbox,
          selectedTrails: selectedTrails,
          user,
          configName: config,
          defaultConfig: configs[config],
        },
        blob,
      );

      setToast({ message: "Map saved to server", type: "success" });
    } catch (error: any) {
      console.error("Failed to upload map", error);

      // Handle unauthorized access
      if (
        error.message?.includes("UNAUTHORIZED") ||
        error.message?.includes("permission")
      ) {
        setToast({
          message:
            "You don't have permission to edit this map. Only the owner and collaborators can make changes.",
          type: "error",
        });
      }
      // Handle filename conflict
      else if (
        error.message?.includes("FILENAME_CONFLICT") ||
        error.message?.includes("filename already exists")
      ) {
        const newFilename = prompt(
          `A map with filename "${form.filename}" already exists.\n\nPlease enter a different filename:`,
          `${form.filename}-v2`,
        );

        if (newFilename && newFilename !== form.filename) {
          onFormChange({ filename: newFilename });
          setToast({
            message: "Filename updated. Please try saving again.",
            type: "info",
          });
        } else {
          setToast({
            message:
              "Filename conflict - map not saved. Please change the filename and try again.",
            type: "error",
          });
        }
      } else {
        setToast({ message: "Failed to save map to server", type: "error" });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddToOrder = async () => {
    if (isPurchasing) return;
    if (!isSignedIn) {
      setIsPurchasing(false);
      return;
    }
    setIsPurchasing(true);
    if (needsFilenamePrompt(form["filename"])) {
      // setIsFilenamePromptOpen(true);
      const filename = prompt(
        "Please enter a unique filename",
        form["filename"],
      );
      if (!filename) {
        setIsPurchasing(false);
        return;
      }
      onFormChange({
        filename,
      });

      // setIsFilenamePromptOpen(false);
      // setIsPurchasing(false);
    }
    if (!form["print.size"] || !form["print.price"]) {
      setToast({ message: "Please select a print size", type: "error" });
      setIsPurchasing(false);
      return;
    }
    try {
      const size = form["print.sizeActual"] || form["print.size"];
      const blob =
        size && size.width && size.height
          ? await captureImageForPrint(size.width, size.height)
          : await captureImage();

      if (!blob) {
        console.error("Failed to capture image");
        return;
      }

      const newMapConfig = await upsertMap(
        {
          form: form,
          givenFeatures: features,
          bbox: bbox,
          selectedTrails: selectedTrails,
          user,
          configName: config,
          defaultConfig: configs[config],
        },
        blob,
      );

      console.log({ newMapConfig });
      const mapConfigId = newMapConfig.id;
      if (!mapConfigId) {
        console.error("Failed to create map config");
        return;
      }
      const printType =
        printTypes[form["print.type"] as keyof typeof printTypes];
      await order.addItem({
        orderItem: {
          mapConfigId,
          itemPrice: form["print.price"] || 0,
          userContribution: (form["print.contribution"] as number) || 0,
          subcategoryId: printType.subcategoryId,
          printType: form["print.type"] as string,
          width: form["print.size"]?.width,
          height: form["print.size"]?.height,
          options: printType.options.map((option) => option.optionId),
          quantity: form["print.quantity"] || 1,
          filename: form["filename"] as string,
        },
      });
      cartContext.refresh();
      setToast({ message: "Map added to cart", type: "success" });
    } catch (error: any) {
      console.error("Failed to add to cart map", error);

      // Handle unauthorized access
      if (
        error.message?.includes("UNAUTHORIZED") ||
        error.message?.includes("permission")
      ) {
        setToast({
          message:
            "You don't have permission to edit this map. Only the owner and collaborators can make changes.",
          type: "error",
        });
      } else {
        setToast({ message: "Failed to add to cart map", type: "error" });
      }
    } finally {
      setIsPurchasing(false);
    }
  };
  return {
    handleUpload,
    handleAddToOrder,
    isUploading,
    isPurchasing,
  };
};
