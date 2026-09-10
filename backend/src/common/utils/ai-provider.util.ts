/** Anthropic's API host, which speaks its own protocol rather than the OpenAI one. */
const ANTHROPIC_HOST = 'api.anthropic.com';

/** The version header Anthropic's REST API requires on every request. */
export const ANTHROPIC_API_VERSION = '2023-06-01';

/**
 * Compares the parsed host, not a substring: `https://evil.test/api.anthropic.com`
 * and `https://api.anthropic.com.evil.test` both contain the literal but are
 * neither of them Anthropic, and routing them to the SDK would send the
 * workspace's key to whoever owns that host.
 */
export function isAnthropicBaseUrl(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname.toLowerCase() === ANTHROPIC_HOST;
  } catch {
    return false;
  }
}
