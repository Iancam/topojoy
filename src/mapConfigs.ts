import { configs as configurations } from "./configs";
import { MapConfig } from "./configs/schema";

interface Configs {
  [key: string]: MapConfig;
}

console.log(configurations);

export const configs: Configs = configurations;

// {Original: snowMesaConfig,
//   "Juniper Bark": emeraldLakesConfig,
// };
