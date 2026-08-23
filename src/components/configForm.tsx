import React from "react";
import { Info } from "lucide-react";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { DualRangeSlider } from "./ui/dual-range-slider";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./ui/tooltip";
import { Config } from "../types";
import { Slider } from "./ui/slider";
import p5 from "p5";
import { MultiSelect } from "./multi-select";
import { FormElementType, formJourney, formElements } from "./configFormData";
import { MultiStepForm } from "./multiStepForm";
import { ConfigFormContext } from "./configFormContext";

interface TooltipWrapperProps {
  children: React.ReactNode;
}

interface ConfigFormProps {
  config: string;
  configs: { [key: string]: Config };
  form: any;
  features: { [key: string]: string[] };
  collisions: Record<string, string[]>;
  isPurchasing: boolean;
  isUploading: boolean;
  onPurchase?: () => void;
  onAddToOrder?: () => void;
  onUpload?: () => void;
  onConfigChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFormChange: (key: string, value: any) => void;
  renderSketch: () => any;
  onSubmitSave?: () => void;

  annotationsMode?: boolean;
  onAnnotationsModeToggle?: () => void;
  canEdit?: boolean;
}

const RenderFormElement = ({
  form,
  onFormChange: originalOnFormChange,
  props,
  id,
  elementType,
  description,
  label,
}: {
  form: any;
  onFormChange: (key: string, value: any) => void;
  id: string;
  elementType: FormElementType;
  description: string;
  label: string;
  props?: { [key: string]: any };
}): React.ReactElement | null => {
  const value = form[id];
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );

  const onFormChange = (key: string, value: any) => {
    // Run validation if provided
    if (props?.validation) {
      const result = props.validation(value);

      if (result.success) {
        // Validation passed
        setValidationError(null);
      } else {
        // Validation failed - extract error messages
        const errorMessages = result.error.errors
          .map((err: any) => err.message)
          .join(", ");
        setValidationError(errorMessages);
      }
    }
    originalOnFormChange(key, value);
  };

  const cases: Record<FormElementType, React.ReactElement> = {
    text: (
      <Input
        type="text"
        value={value ?? ""}
        onChange={(e) => onFormChange(id, e.target.value)}
      />
    ),
    textarea: (
      <textarea
        className="border border-gray-300 rounded p-2 w-full"
        rows={5}
        cols={20}
        value={value ?? ""}
        onChange={(e) => onFormChange(id, e.target.value)}
      />
    ),
    number: (
      <Input
        type="number"
        value={value ?? ""}
        {...props}
        onChange={(e) => onFormChange(id, Number(e.target.value))}
      />
    ),
    boolean: (
      <Checkbox
        checked={value}
        onCheckedChange={(checked) => onFormChange(id, checked)}
      />
    ),
    list: (
      <MultiSelect
        options={props?.options || []}
        defaultValue={value}
        onValueChange={(v) => onFormChange(id, v)}
      />
    ),
    range: (
      <DualRangeSlider
        min={0}
        max={1}
        step={0.01}
        value={value}
        onValueChange={(val) => onFormChange(id, val)}
      />
    ),
    slider: (
      <div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[Number(value)]}
          onValueChange={([val]) => onFormChange(id, val)}
          className="w-full"
        />
        <span className="text-sm w-12 text-right">
          {Number(value).toFixed(2)}
        </span>
      </div>
    ),
    select: (
      <select
        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
        value={value}
        onChange={(e) => onFormChange(id, e.target.value)}
      >
        {(props?.options || []).map(
          (opt: { value: string; label: string }, index: number) => (
            <option key={opt.value ?? index} value={opt.value}>
              {opt.label}
            </option>
          ),
        )}
      </select>
    ),
  };

  const TooltipWrapper = ({ children }: TooltipWrapperProps) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  const element = cases[elementType] || null;
  return (
    <div key={id} className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center space-x-2">
        {element}
        <TooltipWrapper>
          <Info className={"h-4 w-4 tooltip-" + id.replace(".", "-")} />
        </TooltipWrapper>
      </div>
      {validationError && (
        <p className="text-red-500 text-xs">{validationError}</p>
      )}
    </div>
  );
};

export const toFormElement =
  (
    form: any,
    onFormChange: (key: string, value: any) => void,
    elementLookup?: Record<string, any>,
  ) =>
  (FormElement: string | React.ComponentType<any>, i: number) => {
    const lookup = elementLookup ?? formElements;
    const [elementType, description, defaultValue, label, props, oFCDecorator] =
      typeof FormElement === "string"
        ? lookup[FormElement]
        : ["", "", "", "", {}, undefined];

    const decoratedOFC = oFCDecorator?.(onFormChange) || onFormChange;
    return (
      <div
        key={typeof FormElement === "string" ? FormElement : i}
        className="flex flex-col gap-2 mt-4"
      >
        {typeof FormElement === "string" ? (
          <RenderFormElement
            form={form}
            onFormChange={decoratedOFC}
            id={FormElement}
            elementType={elementType}
            description={description}
            label={label}
            props={props}
          />
        ) : (
          <FormElement form={form} onFormChange={onFormChange} />
        )}
      </div>
    );
  };

// Reusable multistep form wrapper
export const ConfigForm = ({
  config,
  configs,
  form,
  features,
  collisions,
  isPurchasing,
  isUploading,
  onPurchase,
  onAddToOrder,
  onUpload,
  onConfigChange,
  onFormChange,
  renderSketch,
  onSubmitSave,
  annotationsMode = false,
  onAnnotationsModeToggle,
  canEdit = true,
}: ConfigFormProps) => {
  const steps = formJourney.map((step) => ({
    title: step.title,
    content: (
      <div>
        <div className="flex flex-col gap-2 mt-4">
          {step.formElements.map(
            toFormElement(form, onFormChange, formElements),
          )}
        </div>
        {step.advanced && step.advanced.length > 0 && (
          <details className="mt-4 group">
            <summary className="cursor-pointer select-none text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
              Advanced
              <span className="ml-2 transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <div className="pl-4 mt-2 flex flex-col gap-2">
              {step.advanced.map(toFormElement(form, onFormChange))}
            </div>
          </details>
        )}
      </div>
    ),
  }));

  const ctxValue = {
    config,
    configs,
    features,
    collisions,
    onConfigChange,
    renderFormElement: RenderFormElement,
    annotationsMode: annotationsMode ?? false,
    onAnnotationsModeToggle: onAnnotationsModeToggle ?? (() => {}),
  };

  return (
    <ConfigFormContext.Provider value={ctxValue}>
      <MultiStepForm
        steps={steps}
        onSubmit={() => {
          onSubmitSave?.();
          //put save image code here
        }}
        submitLabel="Save Image"
        onRender={renderSketch}
        onSave={canEdit ? onSubmitSave : undefined}
        onUpload={canEdit ? onUpload : undefined}
        // onPurchase={onPurchase}
        onAddToOrder={canEdit ? onAddToOrder : undefined}
        isPurchasing={isPurchasing}
        isUploading={isUploading}
        canEdit={canEdit}
      />
    </ConfigFormContext.Provider>
  );
};
