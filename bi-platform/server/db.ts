import { and, desc, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  briefingSchedules,
  dailyBriefings,
  facebookDailyMetrics,
  facebookDemographics,
  instagramDailyMetrics,
  instagramDemographics,
  tiktokDailyMetrics,
  tiktokViewerSnapshots,
  tiktokAudienceSnapshots,
  tiktokFollowerActivity,
  socialFollowerSnapshots,
  socialProfiles,
  socialVenues,
  platformAccess,
  type InsertDailyBriefing,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getOrCreatePlatformAccess(email: string, fullName?: string | null) {
  const normalizedEmail = email.trim().toLowerCase();
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const existing = await db
    .select()
    .from(platformAccess)
    .where(eq(platformAccess.email, normalizedEmail))
    .limit(1);
  if (existing[0]) return existing[0];

  // The dashboard fires several authenticated requests in parallel on first
  // load, so concurrent first-time callers race here. Let the unique index
  // absorb the duplicate instead of failing every request but one.
  await db
    .insert(platformAccess)
    .values({
      email: normalizedEmail,
      fullName: fullName?.trim() || null,
      status: "pending",
      role: "viewer",
    })
    .onDuplicateKeyUpdate({ set: { email: normalizedEmail } });

  return (
    await db
      .select()
      .from(platformAccess)
      .where(eq(platformAccess.email, normalizedEmail))
      .limit(1)
  )[0];
}

export type PlatformAccessStatus = "pending" | "approved" | "rejected";
export type PlatformAccessRole = "viewer" | "admin";

export async function listPlatformAccess() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(platformAccess).orderBy(desc(platformAccess.createdAt)).limit(1000);
}

export async function getPlatformAccessById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return (await db.select().from(platformAccess).where(eq(platformAccess.id, id)).limit(1))[0];
}

export async function setPlatformAccessStatus(id: number, status: PlatformAccessStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(platformAccess).set({ status }).where(eq(platformAccess.id, id));
  return getPlatformAccessById(id);
}

export async function setPlatformAccessRole(id: number, role: PlatformAccessRole) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(platformAccess).set({ role }).where(eq(platformAccess.id, id));
  return getPlatformAccessById(id);
}

/** Number of approved administrators other than the given row (lock-out guard). */
export async function countOtherApprovedAdmins(excludeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select({ id: platformAccess.id })
    .from(platformAccess)
    .where(and(eq(platformAccess.role, "admin"), eq(platformAccess.status, "approved"), ne(platformAccess.id, excludeId)));
  return rows.length;
}

export async function upsertDailyBriefing(briefing: InsertDailyBriefing) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .insert(dailyBriefings)
    .values(briefing)
    .onDuplicateKeyUpdate({
      set: {
        title: briefing.title,
        executiveSummary: briefing.executiveSummary,
        narration: briefing.narration,
        sectionsJson: briefing.sectionsJson,
        sourceSnapshotJson: briefing.sourceSnapshotJson,
        model: briefing.model,
        xStatus: briefing.xStatus,
        status: briefing.status,
        generatedAt: briefing.generatedAt ?? new Date(),
        // A regenerated briefing has a new narration; the previous day's audio
        // no longer matches it and must be detached.
        audioKey: null,
        audioUrl: null,
        audioDurationSeconds: null,
        audioGeneratedAt: null,
      },
    });
  return getDailyBriefingByDate(briefing.reportDate);
}

export async function getDailyBriefingByDate(reportDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return (await db.select().from(dailyBriefings).where(eq(dailyBriefings.reportDate, reportDate)).limit(1))[0];
}

export async function getDailyBriefingById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return (await db.select().from(dailyBriefings).where(eq(dailyBriefings.id, id)).limit(1))[0];
}

export async function saveDailyBriefingAudio(
  reportDate: string,
  audio: { key: string; url: string; durationSeconds?: number },
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .update(dailyBriefings)
    .set({
      audioKey: audio.key,
      audioUrl: audio.url,
      audioDurationSeconds: audio.durationSeconds ?? null,
      audioGeneratedAt: new Date(),
    })
    .where(eq(dailyBriefings.reportDate, reportDate));
  return getDailyBriefingByDate(reportDate);
}

export async function listDailyBriefings(limit = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(dailyBriefings).orderBy(desc(dailyBriefings.reportDate)).limit(Math.min(limit, 90));
}

export async function saveBriefingSchedule(taskUid: string, cronExpression: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .insert(briefingSchedules)
    .values({
      name: "daily-bi-briefing",
      cronExpression,
      timeZone: "America/Sao_Paulo",
      scheduleCronTaskUid: taskUid,
      enabled: 1,
    })
    .onDuplicateKeyUpdate({
      set: { cronExpression, scheduleCronTaskUid: taskUid, enabled: 1 },
    });
}

export async function getBriefingScheduleByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return (
    await db
      .select()
      .from(briefingSchedules)
      .where(eq(briefingSchedules.scheduleCronTaskUid, taskUid))
      .limit(1)
  )[0];
}

export async function listSocialFollowerHistory(limit = 2000) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({
      platform: socialProfiles.platform,
      observedDate: socialFollowerSnapshots.observedDate,
      followerCount: socialFollowerSnapshots.followerCount,
      sourceSheet: socialFollowerSnapshots.sourceSheet,
      sourceRow: socialFollowerSnapshots.sourceRow,
    })
    .from(socialFollowerSnapshots)
    .innerJoin(socialProfiles, eq(socialFollowerSnapshots.profileId, socialProfiles.id))
    .innerJoin(socialVenues, eq(socialProfiles.venueId, socialVenues.id))
    .where(eq(socialVenues.isHopiHari, 1))
    .orderBy(desc(socialFollowerSnapshots.observedDate))
    .limit(Math.min(limit, 3000));
}

export async function listFacebookDailyMetrics(limit = 90) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(facebookDailyMetrics).orderBy(desc(facebookDailyMetrics.observedDate)).limit(Math.min(limit, 365));
}

export async function getLatestFacebookDemographics() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return (await db.select().from(facebookDemographics).orderBy(desc(facebookDemographics.observedDate)).limit(1))[0];
}

export async function listInstagramDailyMetrics(limit = 90) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(instagramDailyMetrics).orderBy(desc(instagramDailyMetrics.observedDate)).limit(Math.min(limit, 365));
}

export async function getLatestInstagramDemographics() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return (await db.select().from(instagramDemographics).orderBy(desc(instagramDemographics.observedDate)).limit(1))[0];
}

export async function listTiktokDailyMetrics(limit = 90) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(tiktokDailyMetrics).orderBy(desc(tiktokDailyMetrics.observedDate)).limit(Math.min(limit, 365));
}

export async function listTiktokViewerSnapshots(limit = 90) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(tiktokViewerSnapshots).orderBy(desc(tiktokViewerSnapshots.observedDate)).limit(Math.min(limit, 365));
}

export async function getLatestTiktokAudience() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return (await db.select().from(tiktokAudienceSnapshots).orderBy(desc(tiktokAudienceSnapshots.observedDate)).limit(1))[0];
}

export async function listTiktokFollowerActivity(limit = 240) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(tiktokFollowerActivity).orderBy(desc(tiktokFollowerActivity.observedDate), desc(tiktokFollowerActivity.hour)).limit(Math.min(limit, 720));
}
