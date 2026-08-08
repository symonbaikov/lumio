import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Inference must not run on the main thread — a 4B model blocks the UI for
// seconds per token otherwise.
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (event: MessageEvent): void => {
  handler.onmessage(event);
};
