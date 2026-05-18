import { emeraldLakesConfig, snowMesaConfig } from "./configs";
import { MapConfig } from "./configs/schema";

interface Configs {
  [key: string]: MapConfig;
}

export const configs: Configs = {
  Original: snowMesaConfig,
  "Juniper Bark": emeraldLakesConfig,
};
