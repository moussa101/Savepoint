/** Server-only flags for which Auth.js providers / library APIs are configured. */
export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isXboxLibraryConfigured() {
  return Boolean(process.env.OPENXBL_API_KEY?.trim());
}
