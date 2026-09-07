import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getSocialComparison } from "./lib/socialComparison";
import { getHoraDoHorrorCorrelation } from "./lib/horaDoHorrorCorrelation";
import { listHoraDoHorrorRegistry, saveHoraDoHorrorCampaign, saveHoraDoHorrorCreative } from "./lib/horaDoHorrorRegistry";
import { getFollowerSheetStatus } from "./lib/followerSheetSync";
import { getCampaignSalesCorrelation, saveDriveCampaignPeriod } from "./lib/campaignSalesCorrelation";
import { listCampaignArchiveImports } from "./lib/campaignArchiveImports";
import { getWeekly360Report } from "./lib/weekly360Report";
import { TRPCError } from "@trpc/server";
import { countOtherApprovedAdmins, getLatestFacebookDemographics, getLatestInstagramDemographics, getLatestTiktokAudience, getPlatformAccessById, listFacebookDailyMetrics, listInstagramDailyMetrics, listPlatformAccess, listSocialFollowerHistory, listTiktokDailyMetrics, listTiktokFollowerActivity, listTiktokViewerSnapshots, setPlatformAccessRole, setPlatformAccessStatus } from "./db";

const normalizeEmail = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * Access management. `platform_access` is the table the server consults on
   * every request (see server/lib/supabaseAuth.ts), so approvals and role
   * changes must land here — not in the Supabase data project.
   */
  platformAccess: router({
    list: adminProcedure.query(async () =>
      (await listPlatformAccess()).map(row => ({
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        status: row.status,
        role: row.role,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    ),
    setStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "approved", "rejected"]) }))
      .mutation(async ({ input, ctx }) => {
        const target = await getPlatformAccessById(input.id);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Access record not found" });
        const isSelf = normalizeEmail(target.email) === normalizeEmail(ctx.user.email);
        if (isSelf && input.status !== "approved") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot revoke your own access" });
        }
        if (target.role === "admin" && input.status !== "approved" && (await countOtherApprovedAdmins(target.id)) === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "At least one approved administrator must remain" });
        }
        return setPlatformAccessStatus(input.id, input.status);
      }),
    setRole: adminProcedure
      .input(z.object({ id: z.number().int().positive(), role: z.enum(["viewer", "admin"]) }))
      .mutation(async ({ input, ctx }) => {
        const target = await getPlatformAccessById(input.id);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Access record not found" });
        const isSelf = normalizeEmail(target.email) === normalizeEmail(ctx.user.email);
        if (isSelf && input.role !== "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own administrator role" });
        }
        if (target.role === "admin" && input.role !== "admin" && (await countOtherApprovedAdmins(target.id)) === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "At least one approved administrator must remain" });
        }
        return setPlatformAccessRole(input.id, input.role);
      }),
  }),

  socialFollowers: router({
    history: protectedProcedure.query(() => listSocialFollowerHistory()),
    status: protectedProcedure.query(() => getFollowerSheetStatus()),
  }),

  facebook: router({
    dailyMetrics: protectedProcedure.query(() => listFacebookDailyMetrics(90)),
    demographics: protectedProcedure.query(() => getLatestFacebookDemographics()),
  }),

  instagram: router({
    dailyMetrics: protectedProcedure.query(() => listInstagramDailyMetrics(90)),
    demographics: protectedProcedure.query(() => getLatestInstagramDemographics()),
  }),

  tiktok: router({
    dailyMetrics: protectedProcedure.query(() => listTiktokDailyMetrics(90)),
    viewers: protectedProcedure.query(() => listTiktokViewerSnapshots(90)),
    audience: protectedProcedure.query(() => getLatestTiktokAudience()),
    followerActivity: protectedProcedure.query(() => listTiktokFollowerActivity(240)),
  }),

  socialComparison: protectedProcedure
    .input(z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      platforms: z.array(z.enum(["facebook", "instagram", "tiktok"])).min(1).max(3),
    }).refine(value => value.from <= value.to, { message: "from must be before or equal to to" }))
    .query(({ input }) => getSocialComparison(input)),

  campaignSales: router({
    correlation: protectedProcedure.query(() => getCampaignSalesCorrelation()),
    savePeriod: adminProcedure
      .input(z.object({
        driveFolderId: z.string().trim().min(3).max(160),
        periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        brand: z.string().trim().max(255).optional(),
      }).refine(value => value.periodStart <= value.periodEnd, { message: "periodStart must be before or equal to periodEnd" }))
      .mutation(({ input }) => saveDriveCampaignPeriod(input)),
  }),

  campaignArchiveImports: router({
    list: protectedProcedure.query(() => listCampaignArchiveImports()),
  }),

  weekly360Report: router({
    get: protectedProcedure.query(() => getWeekly360Report()),
  }),

  horaDoHorror: router({
    correlation: protectedProcedure.query(() => getHoraDoHorrorCorrelation()),
  }),

  horaDoHorrorRegistry: router({
    list: protectedProcedure.query(() => listHoraDoHorrorRegistry()),
    saveCampaign: adminProcedure
      .input(z.object({
        id: z.number().int().positive().optional(),
        edition: z.string().trim().min(3).max(160),
        periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.enum(["draft", "scheduled", "active", "completed"]),
        notes: z.string().trim().max(2_000).optional(),
      }).refine(value => value.periodStart <= value.periodEnd, { message: "periodStart must be before or equal to periodEnd" }))
      .mutation(({ input, ctx }) => saveHoraDoHorrorCampaign({ ...input, actorOpenId: ctx.user.openId })),
    saveCreative: adminProcedure
      .input(z.object({
        id: z.number().int().positive().optional(),
        campaignId: z.number().int().positive(),
        creativeName: z.string().trim().min(2).max(255),
        platform: z.enum(["instagram", "facebook", "tiktok", "multiplatform"]),
        creativeFormat: z.string().trim().min(2).max(80),
        publishedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        targetUrl: z.union([z.string().url().max(1_200), z.literal("")]).optional(),
        utmCampaign: z.string().trim().max(255).optional(),
        callToAction: z.string().trim().max(255).optional(),
        status: z.enum(["planned", "published", "paused"]),
        notes: z.string().trim().max(2_000).optional(),
      }))
      .mutation(({ input, ctx }) => saveHoraDoHorrorCreative({ ...input, actorOpenId: ctx.user.openId })),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
