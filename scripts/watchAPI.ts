/**
 * Watches netlify/functions directory and regenerates API client when files change
 */
import { watch } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const functionsDir = "./netlify/functions";

console.log(`👀 Watching ${functionsDir} for changes...`);

let isGenerating = false;
let pendingRegenerate = false;

async function regenerateAPI() {
  if (isGenerating) {
    pendingRegenerate = true;
    return;
  }

  isGenerating = true;
  pendingRegenerate = false;

  try {
    console.log("🔄 Regenerating API client...");
    const { stdout, stderr } = await execAsync("node scripts/apiGenerator.ts");
    
    if (stderr && !stderr.includes("Warning")) {
      console.error("❌ Error:", stderr);
    } else {
      console.log("✅ API client regenerated successfully");
    }
  } catch (error: any) {
    console.error("❌ Failed to regenerate:", error.message);
  } finally {
    isGenerating = false;
    
    // If another change happened while we were generating, regenerate again
    if (pendingRegenerate) {
      setTimeout(() => regenerateAPI(), 100);
    }
  }
}

// Watch for changes in netlify/functions
watch(functionsDir, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  
  // Only watch .ts files, ignore test files
  if (filename.endsWith(".ts") && !filename.includes(".test.")) {
    console.log(`📝 Detected change: ${filename}`);
    regenerateAPI();
  }
});

// Keep the process running
process.on("SIGINT", () => {
  console.log("\n👋 Stopping watcher...");
  process.exit(0);
});
