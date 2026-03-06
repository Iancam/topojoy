import React from "react";
import { useConfigForm } from "./configFormContext";
export const ConfigSelect = () => {
  const { config, configs, onConfigChange } = useConfigForm();
  return (
    <div className="bg-white">
      <label className="text-sm font-medium mb-2 block" htmlFor="config-select">
        Color Scheme
      </label>
      <select
        id="config-select"
        value={config}
        onChange={onConfigChange}
        className="w-full p-2 border rounded"
      >
        {Object.keys(configs).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
};
