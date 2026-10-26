/** Commercial-message choices. Email and SMS never imply each other. */
export function marketingChoices(input: {
  marketing?: boolean;
  marketingEmail?: boolean;
  marketingSms?: boolean;
}) {
  const email = input.marketingEmail ?? (input.marketing === true);
  const sms = input.marketingSms === true;
  return { email, sms };
}

export const MARKETING_TEXT_VERSION = "2026-10-uye";
