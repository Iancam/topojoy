class ConfigManager {
  constructor(baseConfig) {
    this.validateConfig(baseConfig);
    this.baseConfig = baseConfig;
    this.currentConfig = baseConfig;
    this.history = [baseConfig];
  }

  validateConfig(config) {
    try {
      MapConfigSchema.parse(config);
    } catch (error) {
      throw new Error(`Invalid configuration: ${error.message}`);
    }
  }

  update(partialConfig) {
    const newConfig = deepMerge({}, this.currentConfig, partialConfig);
    this.validateConfig(newConfig);
    this.currentConfig = newConfig;
    this.history.push(newConfig);
    return this.currentConfig;
  }

  undo() {
    if (this.history.length > 1) {
      this.history.pop();
      this.currentConfig = this.history[this.history.length - 1];
    }
    return this.currentConfig;
  }

  reset() {
    this.currentConfig = this.baseConfig;
    this.history = [this.baseConfig];
    return this.currentConfig;
  }

  export() {
    return JSON.stringify(this.currentConfig, null, 2);
  }

  import(configString) {
    const config = JSON.parse(configString);
    this.validateConfig(config);
    this.currentConfig = config;
    this.history.push(config);
    return this.currentConfig;
  }
}
