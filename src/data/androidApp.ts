/** Android app (Trusted Web Activity, project in /android). */
export const ANDROID_PACKAGE = "com.alsatport.app";

/**
 * SHA-256 fingerprints of the certificates that sign the Android app, from Play Console → App integrity
 * (the Play App Signing key, plus the upload key for testing local release builds). They are public values.
 * Empty until the app is created in Play Console; /.well-known/assetlinks.json answers 404 until then.
 */
export const ANDROID_CERT_SHA256: readonly string[] = [];

const FINGERPRINT = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function validFingerprints(list: readonly string[]): string[] {
  return [...new Set(list.map((f) => f.trim().toUpperCase()).filter((f) => FINGERPRINT.test(f)))];
}

/** Digital Asset Links statement for https://alsatport.com, or null when no valid fingerprint is configured. */
export function assetLinks(list: readonly string[] = ANDROID_CERT_SHA256) {
  const fingerprints = validFingerprints(list);
  if (!fingerprints.length) return null;
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints },
    },
  ];
}
