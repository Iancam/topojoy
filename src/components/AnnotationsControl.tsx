import React from "react";
import { MapPin, Trash2 } from "lucide-react";
import type { Annotation } from "./AnnotationLayer";
import { useConfigForm } from "./configFormContext";

// Store annotations in form — they will be persisted to the server with the map config.

type Props = {
  form: any;
  onFormChange: (formUpdate: any) => void;
};

export const AnnotationsControl: React.FC<Props> = ({ form, onFormChange }) => {
  const { annotationsMode, onAnnotationsModeToggle } = useConfigForm();
  const annotations: Annotation[] = form.annotations ?? [];

  const onUpdate = (id: string, patch: Partial<Annotation>) => {
    onFormChange({
      annotations: annotations.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    });
  };

  const onRemove = (id: string) => {
    onFormChange({ annotations: annotations.filter((a) => a.id !== id) });
  };

  const onToggleMode = onAnnotationsModeToggle;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Map Annotations
        </span>
        <button
          type="button"
          onClick={onToggleMode}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            annotationsMode
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          <MapPin className="h-3 w-3" />
          {annotationsMode ? "Click map to place" : "Enable annotations"}
        </button>
      </div>

      {annotationsMode && (
        <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1.5">
          Click anywhere on the map to place an annotation. Click an existing
          label to edit it.
        </p>
      )}

      {annotations.length > 0 && (
        <ul className="space-y-1.5">
          {annotations.map((ann) => (
            <li
              key={ann.id}
              className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
            >
              <span
                className="h-3 w-3 rounded-full shrink-0 border border-gray-300"
                style={{ background: ann.color }}
              />
              <input
                type="text"
                value={ann.text}
                onChange={(e) => onUpdate(ann.id, { text: e.target.value })}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-gray-800 text-xs"
              />
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="color"
                  value={ann.color}
                  onChange={(e) => onUpdate(ann.id, { color: e.target.value })}
                  className="h-5 w-5 cursor-pointer rounded border-0 p-0 bg-transparent"
                  title="Label color"
                />
                <input
                  type="number"
                  value={ann.fontSize}
                  min={8}
                  max={72}
                  onChange={(e) =>
                    onUpdate(ann.id, { fontSize: Number(e.target.value) })
                  }
                  className="w-10 border border-gray-300 rounded px-1 py-0.5 text-xs text-center"
                  title="Font size (px)"
                />
                <button
                  type="button"
                  onClick={() => onRemove(ann.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove annotation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {annotations.length === 0 && !annotationsMode && (
        <p className="text-xs text-gray-400">No annotations yet.</p>
      )}
    </div>
  );
};
