import React from "react";
interface ColorPlan {
  height: number;
  colors: string | string[] | ((params: any) => string);
}
export const ColorPlan = ({ config, configs, renderFormElement }: any) => (
  <>
    <h2 className="text-lg font-semibold color-height">Color Plans</h2>
    {configs[config].colorPlan.map((colorPlan: ColorPlan, index: number) => (
      <div key={index} className="flex flex-col gap-2 p-2 border rounded">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Height {index + 1}</label>
          <span className="text-sm text-gray-500">
            {colorPlan.height.toFixed(2)}
          </span>
        </div>
        {renderFormElement({
          id: `colorPlan.${index}.height`,
          elementType: "slider",
          description: `Set the height value for color plan ${index + 1}`,
          label: `Color Height ${index + 1}`,
        })}
      </div>
    ))}
  </>
);
