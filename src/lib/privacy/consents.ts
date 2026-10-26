import "server-only";
import { prisma } from "@/lib/db";
import { MARKETING_TEXT_VERSION } from "@/lib/privacy/marketingChoices";

export type ConsentChannel = "email" | "sms";
export type ConsentSource = "register" | "settings";

/**
 * Stores the member's own choice. No İYS request is made: the project has no İYS credentials.
 * `iysStatus` stays `not_submitted` so a later job can submit the same row.
 */
export async function recordMarketingChoice(
  userId: string,
  channel: ConsentChannel,
  granted: boolean,
  source: ConsentSource,
) {
  await prisma.marketingConsent.create({
    data: {
      userId,
      channel,
      granted,
      source,
      textVersion: MARKETING_TEXT_VERSION,
      iysStatus: "not_submitted",
    },
  });
}
