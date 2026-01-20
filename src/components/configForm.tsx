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
  onPurchase?: () => void;
  onAddToOrder?: () => void;
  onUpload?: () => void;
  onConfigChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFormChange: (key: string, value: any) => void;
  renderSketch: () => p5;
  onSubmitSave?: () => void;
}

const collisionFoundFactory =
  (form: any, collisions: Record<string, string[]>) => (feature: string) => {
    // get master keeplist
    const keepMap = [
      form["river.keepList"],
      form["trail.keepList"],
      form["mountain.keepList"],
      form["lake.keepList"],
    ]
      .flat()
      .reduce((acc, val) => {
        acc[val] = true;
        return acc;
      }, {});
    const collidesWith = collisions[feature] || [];
    let collisionsFound: string[] = [feature];
    for (const feature of collidesWith) {
      if (keepMap[feature]) {
        collisionsFound.push(feature);
      }
    }

    return collisionsFound;
  };

const RenderFormElement = ({
  form,
  onFormChange,
  features,
  collisions,
  props,
  id,
  elementType,
  description,
  label,
}: {
  form: any;
  onFormChange: (key: string, value: any) => void;
  features: { [key: string]: string[] };
  collisions: Record<string, string[]>;
  id: string;
  elementType: FormElementType;
  description: string;
  label: string;
  props?: { [key: string]: any };
}): React.ReactElement | null => {
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

  const value = form[id];
  const collisionFound = collisionFoundFactory(form, collisions);
  const options = (features[id.split(".")[0]] || []).map((feature: string) => {
    const collides = collisionFound(feature);
    return {
      style:
        collides.length > 1
          ? {
              badgeColor: "red",
            }
          : undefined,
      value: feature,
      label: feature,
    };
  });

  const cases: Record<FormElementType, React.ReactElement> = {
    text: (
      <Input
        type="text"
        value={value}
        onChange={(e) => onFormChange(id, e.target.value)}
      />
    ),
    textarea: (
      <textarea
        className="border border-gray-300 rounded p-2 w-full"
        rows={5}
        cols={20}
        value={value}
        onChange={(e) => onFormChange(id, e.target.value)}
      />
    ),
    number: (
      <Input
        type="number"
        value={value}
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
        options={options}
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
  };

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
  onPurchase,
  onAddToOrder,
  onUpload,
  onConfigChange,
  onFormChange,
  renderSketch,
  onSubmitSave,
}: ConfigFormProps) => {
  const toFormElement = (
    FormElement: string | React.ComponentType<any>,
    i: number
  ) => {
    const [elementType, description, defaultValue, label, props] =
      typeof FormElement === "string"
        ? formElements[FormElement]
        : ["", "", "", "", {}];
    return (
      <div
        key={typeof FormElement === "string" ? FormElement : i}
        className="flex flex-col gap-2 mt-4"
      >
        {typeof FormElement === "string" ? (
          <RenderFormElement
            form={form}
            onFormChange={onFormChange}
            features={features}
            collisions={collisions}
            id={FormElement}
            elementType={elementType}
            description={description}
            label={label}
            props={props}
          />
        ) : (
          <FormElement
            config={config}
            configs={configs}
            features={features}
            collisions={collisions}
            renderFormElement={RenderFormElement}
            onConfigChange={onConfigChange}
            onFormChange={onFormChange}
            form={form}
          />
        )}
      </div>
    );
  };

  const steps = formJourney.map((step) => ({
    title: step.title,
    content: (
      <div>
        <div className="flex flex-col gap-2 mt-4">
          {step.formElements.map(toFormElement)}
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
              {step.advanced.map(toFormElement)}
            </div>
          </details>
        )}
      </div>
    ),
  }));

  return (
    <MultiStepForm
      steps={steps}
      onSubmit={() => {
        onSubmitSave?.();
        //put save image code here
      }}
      submitLabel="Save Image"
      onRender={renderSketch}
      onSave={onSubmitSave}
      onUpload={onUpload}
      onPurchase={onPurchase}
      onAddToOrder={onAddToOrder}
      isPurchasing={isPurchasing}
    />
  );
};
