import "server-only";
import { prisma } from "@/lib/db";
import { sanitizeText } from "@/lib/security/sanitize";
import {
  VEHICLE_REQUEST_SEGMENTS,
  type AdminVehicleRequest,
  type ApprovedVehicle,
  type VehicleRequestStatus,
} from "@/data/vehicleRequests";
import type { VehicleSegment } from "@/data/vehicleIndex";

type Fail = { error: string; status: number };
const fail = (error: string, status = 400): Fail => ({ error, status });

/** Pending requests a single account may keep open at once. */
const MAX_PENDING_PER_USER = 10;
const APPROVED_TTL_MS = 60_000;

let approvedCache: { at: number; rows: ApprovedVehicle[] } | null = null;

function toSegment(value: string): VehicleSegment {
  return (VEHICLE_REQUEST_SEGMENTS as readonly string[]).includes(value) ? (value as VehicleSegment) : "auto";
}

/** Approved additions for the listing form and server-side cascade check (short in-memory cache). */
export async function approvedVehicles(): Promise<ApprovedVehicle[]> {
  if (approvedCache && Date.now() - approvedCache.at < APPROVED_TTL_MS) return approvedCache.rows;
  const rows = await prisma.vehicleCatalogRequest
    .findMany({
      where: { status: "approved" },
      select: { segment: true, brand: true, model: true, series: true, engine: true },
      orderBy: { reviewedAt: "asc" },
      take: 2000,
    })
    .catch(() => null);
  if (!rows) return approvedCache?.rows ?? [];
  const mapped = rows.map((r) => ({ ...r, segment: toSegment(r.segment) }));
  approvedCache = { at: Date.now(), rows: mapped };
  return mapped;
}

export type VehicleRequestInput = {
  segment: VehicleSegment;
  brand: string;
  model: string;
  series?: string;
  engine?: string;
  yearFrom?: number;
  yearTo?: number;
  note?: string;
};

export async function createVehicleRequest(userId: string, input: VehicleRequestInput): Promise<{ id: string } | Fail> {
  const brand = sanitizeText(input.brand, 60);
  const model = sanitizeText(input.model, 80);
  if (brand.length < 2 || model.length < 1) return fail("auth.err.required");
  const yearFrom = input.yearFrom ?? null;
  const yearTo = input.yearTo ?? null;
  if (yearFrom && yearTo && yearFrom > yearTo) return fail("vreq.err.years");
  const pending = await prisma.vehicleCatalogRequest.count({ where: { userId, status: "pending" } });
  if (pending >= MAX_PENDING_PER_USER) return fail("vreq.err.tooMany", 429);
  const series = sanitizeText(input.series ?? "", 80);
  const duplicate = await prisma.vehicleCatalogRequest.findFirst({
    where: {
      segment: input.segment,
      brand: { equals: brand, mode: "insensitive" },
      model: { equals: model, mode: "insensitive" },
      series: { equals: series, mode: "insensitive" },
      status: { in: ["pending", "approved"] },
    },
    select: { id: true },
  });
  if (duplicate) return fail("vreq.err.duplicate", 409);
  const row = await prisma.vehicleCatalogRequest.create({
    data: {
      userId,
      segment: input.segment,
      brand,
      model,
      series,
      engine: sanitizeText(input.engine ?? "", 80),
      yearFrom,
      yearTo,
      note: sanitizeText(input.note ?? "", 300),
    },
    select: { id: true },
  });
  return row;
}

export async function adminListVehicleRequests(status: VehicleRequestStatus | "all"): Promise<AdminVehicleRequest[]> {
  const rows = await prisma.vehicleCatalogRequest.findMany({
    where: status === "all" ? {} : { status },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    segment: toSegment(r.segment),
    brand: r.brand,
    model: r.model,
    series: r.series,
    engine: r.engine,
    yearFrom: r.yearFrom,
    yearTo: r.yearTo,
    note: r.note,
    status: r.status as VehicleRequestStatus,
    rejectReason: r.rejectReason,
    username: r.user.username,
    createdAt: r.createdAt.getTime(),
    reviewedAt: r.reviewedAt?.getTime() ?? null,
  }));
}

export async function adminVehicleRequestAction(
  adminId: string,
  id: string,
  action: "approve" | "reject",
  rawReason: string,
): Promise<{ previous: string; next: VehicleRequestStatus; userId: string } | Fail> {
  const row = await prisma.vehicleCatalogRequest.findUnique({ where: { id } });
  if (!row) return fail("vreq.err.none", 404);
  if (row.status !== "pending") return fail("vreq.err.state", 409);
  const reason = sanitizeText(rawReason, 300);
  if (action === "reject" && reason.length < 3) return fail("vreq.err.reason");
  const next: VehicleRequestStatus = action === "approve" ? "approved" : "rejected";
  const updated = await prisma.vehicleCatalogRequest.updateMany({
    where: { id, status: "pending" },
    data: { status: next, reviewedById: adminId, reviewedAt: new Date(), rejectReason: action === "reject" ? reason : null },
  });
  if (!updated.count) return fail("vreq.err.state", 409);
  approvedCache = null;
  return { previous: row.status, next, userId: row.userId };
}
