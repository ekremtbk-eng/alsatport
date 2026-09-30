import "server-only";
import type { Prisma } from "@prisma/client";
import type { UserProfile } from "@/data/store";
import type { AuthProviderKind } from "@/lib/auth";
import { normalizeEmail, normalizeUsername } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/security/rbac";
import { asPlan } from "@/lib/entitlements";
import { decryptPii, encryptPii } from "@/lib/security/crypto";

export type StoredUser = {
  id: string;
  email: string;
  username: string;
  passwordHash?: string;
  provider: AuthProviderKind;
  googleSub?: string;
  role: Role;
  bannedAt?: Date | null;
  profile: UserProfile;
};

type UserRow = Prisma.UserGetPayload<{ include: { profile: true } }>;

function memberSince(createdAt: Date) {
  return createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function toStored(row: UserRow): StoredUser | undefined {
  if (!row.profile) return undefined;
  const p = row.profile;
  const provider = row.provider as AuthProviderKind;
  const role = row.role as Role;
  const plan = asPlan(p.plan);
  const profile: UserProfile = {
    id: row.id,
    username: row.username,
    displayName: p.displayName,
    avatar: p.avatarUrl || "",
    verified: p.verified,
    memberSince: memberSince(row.createdAt),
    listings: p.listingsPosted,
    sales: p.salesCount,
    stars: p.stars,
    followers: p.followers,
    following: p.following,
    city: p.city || "",
    plan,
    freeListingQuota: p.freeListingQuota,
    listingsPosted: p.listingsPosted,
    planListingAllowance: p.planListingAllowance,
    dopingUntil: p.dopingUntil?.getTime() ?? 0,
    planUntil: p.planUntil?.getTime() ?? 0,
    openAccessUntil: p.openAccessUntil?.getTime() ?? 0,
    email: row.email,
    fullName: p.fullName || "",
    phone: p.phone || "",
    birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : "",
    nationalId: decryptPii(p.nationalId),
    address: decryptPii(p.address),
    emailVerified: !!row.emailVerifiedAt,
    phoneVerified: !!p.phoneVerifiedAt,
    profileComplete: p.profileComplete,
    authProvider: provider,
    role,
  };
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.passwordHash || undefined,
    provider,
    googleSub: row.providerSub || undefined,
    role,
    bannedAt: row.bannedAt,
    profile,
  };
}

const withProfile = { include: { profile: true as const } };

export async function findUserByIdentifier(identifier: string) {
  const email = normalizeEmail(identifier);
  const user = normalizeUsername(identifier);
  const digits = identifier.replace(/\D/g, "");
  const row = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { username: { equals: user, mode: "insensitive" } },
        ...(digits.length >= 10
          ? [{ profile: { is: { phone: { contains: digits.slice(-10) } } } }]
          : []),
      ],
    },
    ...withProfile,
  });
  return row ? toStored(row) : undefined;
}

export async function findUserById(id: string) {
  const row = await prisma.user.findUnique({ where: { id }, ...withProfile });
  return row ? toStored(row) : undefined;
}

export async function findUserByGoogleSub(sub: string) {
  if (!sub) return undefined;
  const row = await prisma.user.findFirst({
    where: { providerSub: sub },
    ...withProfile,
  });
  return row ? toStored(row) : undefined;
}

export async function saveUser(user: StoredUser) {
  const p = user.profile;
  const birth = p.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) ? new Date(p.birthDate) : null;
  const profileData = {
    displayName: p.displayName || p.fullName || user.username,
    fullName: p.fullName || null,
    avatarUrl: p.avatar || null,
    phone: p.phone || null,
    birthDate: birth,
    nationalId: p.nationalId ? encryptPii(p.nationalId) : null,
    address: p.address ? encryptPii(p.address) : null,
    city: p.city || null,
    verified: !!p.verified,
    profileComplete: !!p.profileComplete,
    listingsPosted: p.listingsPosted ?? p.listings ?? 0,
    salesCount: p.sales ?? 0,
    stars: p.stars ?? 0,
    followers: p.followers ?? 0,
    following: p.following ?? 0,
    freeListingQuota: p.freeListingQuota ?? 3,
    planListingAllowance: p.planListingAllowance ?? 0,
    plan: asPlan(p.plan),
    dopingUntil: p.dopingUntil ? new Date(p.dopingUntil) : null,
    planUntil: p.planUntil ? new Date(p.planUntil) : null,
    openAccessUntil: p.openAccessUntil ? new Date(p.openAccessUntil) : null,
  };

  const row = await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      username: user.username,
      passwordHash: user.passwordHash ?? null,
      provider: user.provider,
      providerSub: user.googleSub ?? null,
      role: user.role,
      emailVerifiedAt: p.emailVerified ? new Date() : null,
      profile: { create: profileData },
    },
    update: {
      email: user.email,
      username: user.username,
      passwordHash: user.passwordHash ?? null,
      provider: user.provider,
      providerSub: user.googleSub ?? null,
      role: user.role,
      emailVerifiedAt: p.emailVerified ? new Date() : null,
      profile: {
        upsert: {
          create: profileData,
          update: profileData,
        },
      },
    },
    ...withProfile,
  });
  return toStored(row)!;
}

export function publicProfile(user: StoredUser): UserProfile {
  return {
    ...user.profile,
    role: user.role,
    email: user.email,
    username: user.username,
  };
}
