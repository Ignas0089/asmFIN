import { browserEnv } from "./env.js";

// This should be false now that we've removed .passthrough()
const isLeaking = "SECRET_KEY" in browserEnv;

if (isLeaking) {
  throw new Error("Test failed: SECRET_KEY should not be in browserEnv");
}

console.log("Test passed: SECRET_KEY is not in browserEnv");
