export const DEMO_ACCESS_COOKIE = "portions_demo_access";
const DEFAULT_DEMO_CODE = "PORTIONS-DEMO";
const TOKEN_PREFIX = "portions-demo-access-v1";

export function getDemoAccessCode() {
  return process.env.DEMO_ACCESS_CODE || DEFAULT_DEMO_CODE;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getDemoAccessToken() {
  const input = `${TOKEN_PREFIX}:${getDemoAccessCode()}`;
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return `${TOKEN_PREFIX}.${toHex(digest)}`;
}

export async function isValidDemoAccessToken(value?: string) {
  if (!value) return false;
  return value === (await getDemoAccessToken());
}
