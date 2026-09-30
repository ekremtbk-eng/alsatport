import { z } from "zod";
import { isValidEmail, normalizeEmail } from "@/lib/auth";
import { UUID_RE } from "@/lib/ids";
import { looksLikeSqli } from "@/lib/security/inputGuard";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import {
  isAdult,
  isValidFullName,
  isValidIdentityNo,
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

const recaptchaField = z.string().max(4000).optional();

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
  birthDate: z.string().max(10).optional().default(""),
  nationalId: z.string().max(20).optional().default(""),
  address: z.string().max(400).optional().default(""),
});

export const passwordChangeSchema = z.object({
  current: z.string().min(1, "dash.pw.missing").max(128),
  next: passwordField,
});

export const forgotBodySchema = z.object({
  email: emailField,
});

export const resetBodySchema = z.object({
  token: z.string().min(20, "auth.err.required").max(2000),
  password: passwordField,
});

export const messageBodySchema = z.object({
  conversationId: z.string().regex(UUID_RE, "auth.err.required"),
  text: z.string().trim().min(1, "auth.err.required").max(4000).refine(noSqli, "auth.err.required"),
});

export const reportBodySchema = z.object({
  targetType: z.enum(["listing", "user", "message"]),
  reason: z.enum(["spam", "fraud", "inappropriate", "counterfeit", "wrong_category", "other"]).optional().default("other"),
  listingId: z.string().regex(UUID_RE).optional(),
  reportedUserId: z.string().regex(UUID_RE).optional(),
  messageId: z.string().regex(UUID_RE).optional(),
  details: z.string().max(500).optional().default(""),
});

export const listingQuerySchema = z.object({
  q: z.string().max(80).optional().default(""),
  categoryId: z.string().max(80).optional().default(""),
  kategori: z.string().max(80).optional().default(""),
  city: z.string().max(40).optional().default(""),
  district: z.string().max(40).optional().default(""),
  priceMin: z.string().max(16).optional(),
  priceMax: z.string().max(16).optional(),
  status: z.enum(["active", "passive"]).optional(),
  sellerId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(UUID_RE).optional()),
  mine: z.enum(["0", "1"]).optional(),
});

export const listingCreateBodySchema = z
  .object({
    id: z.string().max(80).optional(),
    title: z.string().min(1, "auth.err.required").max(200),
    subtitle: z.string().max(200).optional(),
    description: z.string().max(12000).optional().default(""),
    categoryId: z.string().min(1, "auth.err.required").max(80),
    city: z.string().min(1, "auth.err.required").max(80),
    district: z.string().max(80).optional(),
    neighborhood: z.string().max(80).optional(),
    price: z.union([z.number(), z.string()]),
    images: z.array(z.unknown()).max(16).optional(),
    specs: z.array(z.unknown()).max(48).optional(),
    features: z.array(z.unknown()).max(48).optional(),
    chassis: z.unknown().optional(),
    urgent: z.boolean().optional(),
    refurbished: z.boolean().optional(),
    listingNo: z.string().max(20).optional(),
    expiresAt: z.number().optional(),
    featured: z.boolean().optional(),
    vip: z.boolean().optional(),
    status: z.enum(["active", "passive"]).optional(),
    recaptchaToken: recaptchaField,
  })
  .passthrough();

export function profileFieldErrors(data: {
  fullName: string;
  phone: string;
  birthDate: string;
  nationalId: string;
  address: string;
}) {
  if (data.fullName && !isValidFullName(data.fullName)) return "complete.err.name";
  if (data.phone && !isValidPhone(data.phone)) return "complete.err.phone";
  if (data.birthDate && !isAdult(data.birthDate)) return "complete.err.age";
  if (data.nationalId && !isValidIdentityNo(data.nationalId)) return "complete.err.id";
  if (data.address && !isValidOpenAddress(data.address)) return "complete.err.address";
  return null;
}

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
