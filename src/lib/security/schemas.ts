import { z } from "zod";
import { isDeletePhrase } from "@/lib/accountDelete";
import { isValidEmail, normalizeEmail } from "@/lib/auth";
import { UUID_RE } from "@/lib/ids";
import { looksLikeSqli } from "@/lib/security/inputGuard";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import {
  isValidFullName,
  isValidOpenAddress,
  isValidPhone,
} from "@/lib/profile";

const emailField = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .transform((v) => normalizeEmail(v))
  .refine(isValidEmail, "auth.err.email");

const passwordField = z
  .string()
  .min(8)
  .max(128)
  .refine(isStrongPassword, "auth.err.passPolicy");

const recaptchaField = z.string().max(8192).optional();

function noSqli(value: string) {
  return !looksLikeSqli(value);
}

export const loginBodySchema = z.object({
  identifier: z.string().trim().min(1, "auth.err.required").max(80).refine(noSqli, "auth.err.required"),
  password: z.string().min(1, "auth.err.required").max(128),
});

export const registerBodySchema = z.object({
  email: emailField,
  password: passwordField,
  firstName: z.string().trim().max(40).optional().default(""),
  lastName: z.string().trim().max(40).optional().default(""),
  username: z.string().trim().max(40).optional().default(""),
  phone: z.string().max(20).optional().default(""),
  marketing: z.boolean().optional(),
  recaptchaToken: recaptchaField,
});

export const profileBodySchema = z.object({
  fullName: z.string().max(80).optional().default(""),
  displayName: z.string().max(40).optional().default(""),
  phone: z.string().max(20).optional().default(""),
  address: z.string().max(400).optional().default(""),
});

/** `current` is only optional for accounts without a password (Google/Apple sign-up). */
export const passwordChangeSchema = z.object({
  current: z.string().max(128).optional().default(""),
  next: passwordField,
});

export const accountDeleteSchema = z.object({
  password: z.string().max(128).optional().default(""),
  confirm: z.string().max(40).refine(isDeletePhrase, "account.delete.err.phrase"),
});

export const otpField = z.string().regex(/^\d{6}$/, "complete.err.emailCode");

export const emailChangeStartSchema = z.object({ email: emailField });
export const emailChangeConfirmSchema = z.object({ email: emailField, otp: otpField });

export const twoFactorSchema = z.object({
  action: z.enum(["start", "confirm"]),
  change: z.enum(["enable", "disable", "method"]),
  method: z.enum(["email", "sms"]).optional().default("email"),
  otp: z.string().max(6).optional().default(""),
});

export const recoveryEmailSchema = z.object({
  action: z.enum(["start", "confirm", "remove"]),
  email: z.string().trim().max(254).optional().default(""),
  otp: z.string().max(6).optional().default(""),
});

export const loginVerifySchema = z.object({
  otp: otpField,
  trust: z.boolean().optional().default(false),
});

export const loginResendSchema = z.object({
  to: z.enum(["primary", "recovery", "email"]).optional().default("primary"),
});

export const accountSettingsSchema = z
  .object({
    readReceipts: z.boolean().optional(),
    marketingEmail: z.boolean().optional(),
    marketingSms: z.boolean().optional(),
    marketingPush: z.boolean().optional(),
  })
  .strict();

export const blockBodySchema = z.object({
  conversationId: z.string().regex(UUID_RE, "auth.err.required"),
});

export const qrTokenSchema = z.object({
  t: z.string().regex(/^[A-Za-z0-9_-]{32,64}$/, "qr.err.invalid"),
});

export const qrApproveSchema = qrTokenSchema.extend({ approve: z.boolean() });

export const qrPhotoStartSchema = z.object({
  listingId: z.string().regex(UUID_RE, "auth.err.required"),
});

export const qrPhotoAddSchema = qrTokenSchema.extend({
  url: z.string().min(1).max(2000),
});

export const forgotBodySchema = z.object({
  email: emailField,
});

export const resetTokenSchema = z.object({
  token: z.string().min(20, "auth.err.required").max(2000),
});

export const resetBodySchema = resetTokenSchema
  .extend({
    password: passwordField,
    confirm: z.string().max(200),
  })
  .refine((v) => v.password === v.confirm, { message: "auth.err.passMatch", path: ["confirm"] });

export const messageBodySchema = z.object({
  conversationId: z.string().regex(UUID_RE, "auth.err.required"),
  text: z.string().trim().min(1, "auth.err.required").max(4000).refine(noSqli, "auth.err.required"),
});

export const reportBodySchema = z.object({
  targetType: z.enum(["listing", "user", "message"]),
  reason: z
    .enum(["misleading", "fraud", "prohibited", "copyright", "privacy", "inappropriate", "other", "spam", "counterfeit", "wrong_category"])
    .optional()
    .default("other"),
  listingId: z.string().regex(UUID_RE).optional(),
  reportedUserId: z.string().regex(UUID_RE).optional(),
  messageId: z.string().regex(UUID_RE).optional(),
  details: z.string().max(500).optional().default(""),
});

export const listingQuerySchema = z.object({
  q: z.string().max(80).optional().default("").refine((v) => !v || noSqli(v), "auth.err.required"),
  categoryId: z.string().max(80).optional().default(""),
  kategori: z.string().max(80).optional().default(""),
  city: z.string().max(40).optional().default(""),
  district: z.string().max(40).optional().default(""),
  priceMin: z.string().max(16).optional(),
  priceMax: z.string().max(16).optional(),
  posted: z.string().max(40).optional(),
  status: z.enum(["active", "passive"]).optional(),
  sellerId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(UUID_RE).optional()),
  mine: z.enum(["0", "1"]).optional(),
});

/** Identity, numbering, lifetime and promotion flags are always assigned on the server. */
export const listingCreateBodySchema = z
  .object({
    title: z.string().min(1, "auth.err.required").max(200),
    subtitle: z.string().max(200).optional(),
    description: z.string().max(12000).optional().default(""),
    categoryId: z.string().min(1, "auth.err.required").max(80),
    city: z.string().min(1, "auth.err.required").max(80),
    district: z.string().max(80).optional(),
    neighborhood: z.string().max(80).optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    price: z.union([z.number(), z.string()]),
    images: z.array(z.unknown()).max(16).optional(),
    specs: z.array(z.unknown()).max(48).optional(),
    features: z.array(z.unknown()).max(48).optional(),
    chassis: z.unknown().optional(),
    urgent: z.boolean().optional(),
    refurbished: z.boolean().optional(),
    status: z.enum(["active", "passive"]).optional(),
  });

export function profileFieldErrors(data: {
  fullName: string;
  phone: string;
  address: string;
}) {
  if (data.fullName && !isValidFullName(data.fullName)) return "complete.err.name";
  if (data.phone && !isValidPhone(data.phone)) return "complete.err.phone";
  if (data.address && !isValidOpenAddress(data.address)) return "complete.err.address";
  return null;
}

export const specialDayBodySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "auth.err.required"),
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["milli", "dini", "yilbasi", "ozel"]),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
  year: z.union([z.number().int().min(2020).max(2100), z.null()]).optional(),
  durationDays: z.number().int().min(1).max(40).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  theme: z.enum(["milli", "dini", "yilbasi", "ozel"]).optional(),
  eyebrow: z.string().trim().min(2).max(160),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(8).max(2000),
  closing: z.string().trim().min(2).max(240),
  cta: z.string().trim().min(2).max(80).optional(),
});

const uuidField = z.string().regex(UUID_RE, "auth.err.required");

export const idBodySchema = z.object({ id: uuidField });
export const listingIdBodySchema = z.object({ listingId: uuidField });
export const sellerQuerySchema = z.object({
  sellerId: z.preprocess((v) => (v === "" || v == null ? undefined : v), uuidField.optional()),
});
export const otpBodySchema = z.object({ otp: z.string().min(4).max(12) });
export const reviewBodySchema = z.object({
  sellerId: uuidField,
  listingId: uuidField.optional(),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().max(2000).optional().default(""),
});
export const notifPrefsSchema = z.object({
  priceDrop: z.boolean().optional(),
  savedSearch: z.boolean().optional(),
  nearby: z.boolean().optional(),
});
export const listingSaleBodySchema = z.object({ action: z.enum(["sold", "resale"]) }).strict();
const channelPrefSchema = z.object({ inApp: z.boolean().optional(), email: z.boolean().optional() }).strict();
export const notificationPrefsPatchSchema = z
  .object({ prefs: z.record(z.string().max(40), channelPrefSchema) })
  .strict()
  .refine((v) => Object.keys(v.prefs).length <= 40);
export const notificationsActionSchema = z
  .object({
    action: z.enum(["read", "readAll", "clear"]),
    ids: z.array(z.string().max(60)).max(100).optional(),
  })
  .strict();
export const savedSearchBodySchema = z.object({
  query: z.string().max(80).optional().default(""),
  city: z.string().max(40).optional(),
  filter: z.string().max(40).optional(),
  seenIds: z.array(z.string().max(80)).max(200).optional(),
});
export const checkoutBodySchema = z.object({
  product: z.enum(["profesyonel", "vip", "doping"]),
  legalAccepted: z.literal(true),
});
export const adminListingActionSchema = z.object({
  action: z.enum(["approve", "reject", "remove"]),
  reason: z.string().max(240).optional(),
});
export const adminUserPatchSchema = z.object({
  banned: z.boolean().optional(),
  role: z.enum(["member", "seller"]).optional(),
  business: z
    .object({
      name: z.string().trim().min(2).max(120).nullable(),
      verified: z.boolean(),
    })
    .optional(),
});
export const adminReportPatchSchema = z.object({
  status: z.enum(["reviewing", "resolved", "dismissed"]),
  resolution: z.string().max(400).optional(),
  removeListing: z.boolean().optional(),
  banSeller: z.boolean().optional(),
});

const businessText = (min: number, max: number) =>
  z.string().trim().min(min, "biz.err.required").max(max, "biz.err.tooLong");
const businessUrlField = z.string().trim().max(500).optional().default("");

/** Strict: unknown keys (e.g. national ID or birth date) are rejected, never stored. */
export const businessApplySchema = z
  .object({
    name: businessText(2, 120),
    contactName: businessText(3, 80).refine(isValidFullName, "biz.err.contactName"),
    companyType: z.enum(["sahis", "limited", "anonim", "diger"]),
    taxOffice: businessText(2, 60),
    taxNumber: z.string().trim().max(20),
    categoryId: businessText(1, 80),
    city: businessText(2, 40),
    district: z.string().trim().max(40).optional().default(""),
    description: z.string().trim().max(2000, "biz.err.tooLong"),
    website: z.string().trim().max(200).optional().default(""),
    email: emailField,
    phone: z.string().trim().max(24),
    logoUrl: businessUrlField,
    coverUrl: businessUrlField,
  })
  .strict();

/** Owner edits after approval; legal identity (name, tax data, company type) is locked. */
export const businessProfilePatchSchema = z
  .object({
    categoryId: businessText(1, 80).optional(),
    city: businessText(2, 40).optional(),
    district: z.string().trim().max(40).optional(),
    description: z.string().trim().max(2000, "biz.err.tooLong").optional(),
    website: z.string().trim().max(200).optional(),
    email: emailField.optional(),
    phone: z.string().trim().max(24).optional(),
    logoUrl: z.string().trim().max(500).optional(),
    coverUrl: z.string().trim().max(500).optional(),
  })
  .strict();

export const adminBusinessActionSchema = z
  .object({
    action: z.enum(["approve", "reject", "revoke"]),
    reason: z.string().trim().max(500).optional().default(""),
  })
  .strict();

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
