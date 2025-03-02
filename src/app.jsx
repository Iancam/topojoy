import React, { useEffect, useState, useRef } from "react";
import p5 from "p5";
import { sketch } from "./sketch";
import emeraldLakesConfig from "../data/emeraldLakesConfig";
import LHKConfig from "../data/LHKConfig";
import snowMesaConfig from "../data/snowMesaConfig";
export const App = () => {
  const p5Ref = useRef(null);
  const configs = {
    emeraldLakesConfig,
    LHKConfig,
    snowMesaConfig,
  };

  const [config, setConfig] = useState("emeraldLakesConfig");
  const [backgroundText, setBackgroundText] = useState("");

  useEffect(() => {
    const p5Instance = new p5(
      sketch(configs[config]({ backgroundText })),
      p5Ref.current
    );
    return () => {
      p5Instance.remove();
    };
  }, [backgroundText, config]);

  return (
    <div>
      <div
        style={{ position: "absolute", top: 0, left: 0, zIndex: -1 }}
        ref={p5Ref}
      />
      <select name="config" id="" onChange={(e) => setConfig(e.target.value)}>
        <option value="emeraldLakesConfig">Emerald Lakes</option>
        <option value="LHKConfig">LHK</option>
        <option value="snowMesaConfig">Snow Mesa</option>
      </select>
      <label htmlFor="Text">Background Text</label>
      <textarea
        type="textarea"
        value={backgroundText}
        rows={10}
        cols={50}
        name="Text"
        id="Text"
        onChange={(e) => {
          setBackgroundText(e.target.value);
        }}
      ></textarea>
      <h1 style={{ color: "white" }}>TopoJoy</h1>
    </div>
  );
};
