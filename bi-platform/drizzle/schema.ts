import { bigint, index, int, mediumtext, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const platformAccess = mysqlTable(
  "platform_access",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    fullName: varchar("full_name", { length: 255 }),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    role: mysqlEnum("role", ["viewer", "admin"]).default("viewer").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("platform_access_email_unique").on(table.email)],
);

export type PlatformAccess = typeof platformAccess.$inferSelect;

export const dailyBriefings = mysqlTable(
  "daily_briefings",
  {
    id: int("id").autoincrement().primaryKey(),
    reportDate: varchar("report_date", { length: 10 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    executiveSummary: text("executive_summary").notNull(),
    narration: text("narration").notNull(),
    sectionsJson: mediumtext("sections_json").notNull(),
    // Full BI snapshot (series, posts, CRM maps) regularly exceeds TEXT's 64 KB.
    sourceSnapshotJson: mediumtext("source_snapshot_json").notNull(),
    audioUrl: varchar("audio_url", { length: 1000 }),
    audioKey: varchar("audio_key", { length: 500 }),
    audioDurationSeconds: int("audio_duration_seconds"),
    audioGeneratedAt: timestamp("audio_generated_at"),
    model: varchar("model", { length: 80 }).notNull(),
    xStatus: varchar("x_status", { length: 40 }).notNull(),
    status: mysqlEnum("status", ["generating", "ready", "failed"]).default("ready").notNull(),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("daily_briefings_report_date_unique").on(table.reportDate)],
);

export const briefingSchedules = mysqlTable(
  "briefing_schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    cronExpression: varchar("cron_expression", { length: 40 }).notNull(),
    timeZone: varchar("time_zone", { length: 80 }).default("America/Sao_Paulo").notNull(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    enabled: int("enabled").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("briefing_schedules_name_unique").on(table.name),
    index("briefing_schedules_task_uid_idx").on(table.scheduleCronTaskUid),
  ],
);

export type DailyBriefing = typeof dailyBriefings.$inferSelect;
export type InsertDailyBriefing = typeof dailyBriefings.$inferInsert;

export const operationalSources = mysqlTable(
  "operational_sources",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceKey: varchar("source_key", { length: 120 }).notNull(),
    sourceType: mysqlEnum("source_type", ["google_sheet", "operational_message", "api", "manual"]).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    externalId: varchar("external_id", { length: 255 }),
    sourceUrl: varchar("source_url", { length: 1000 }),
    active: int("active").default(1).notNull(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("operational_sources_key_unique").on(table.sourceKey),
    index("operational_sources_task_uid_idx").on(table.scheduleCronTaskUid),
  ],
);

export const operationalImportRuns = mysqlTable(
  "operational_import_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceId: int("source_id").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["started", "completed", "failed"]).default("started").notNull(),
    rowsSeen: int("rows_seen").default(0).notNull(),
    rowsInserted: int("rows_inserted").default(0).notNull(),
    rowsUpdated: int("rows_updated").default(0).notNull(),
    rowsRejected: int("rows_rejected").default(0).notNull(),
    warningsJson: mediumtext("warnings_json"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  table => [
    uniqueIndex("operational_import_runs_source_hash_unique").on(table.sourceId, table.contentHash),
    index("operational_import_runs_source_idx").on(table.sourceId),
  ],
);

export const socialVenues = mysqlTable(
  "social_venues",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    isHopiHari: int("is_hopi_hari").default(0).notNull(),
    active: int("active").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("social_venues_slug_unique").on(table.slug)],
);

export const socialProfiles = mysqlTable(
  "social_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venue_id").notNull(),
    platform: varchar("platform", { length: 40 }).notNull(),
    profileUrl: varchar("profile_url", { length: 1000 }),
    eligibleForIndex: int("eligible_for_index").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("social_profiles_venue_platform_unique").on(table.venueId, table.platform),
    index("social_profiles_platform_idx").on(table.platform),
  ],
);

export const socialFollowerSnapshots = mysqlTable(
  "social_follower_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profile_id").notNull(),
    observedDate: varchar("observed_date", { length: 10 }).notNull(),
    followerCount: int("follower_count").notNull(),
    sourceRunId: int("source_run_id").notNull(),
    sourceSheet: varchar("source_sheet", { length: 120 }).notNull(),
    sourceRow: int("source_row").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("social_follower_snapshots_profile_date_unique").on(table.profileId, table.observedDate),
    index("social_follower_snapshots_date_idx").on(table.observedDate),
    index("social_follower_snapshots_run_idx").on(table.sourceRunId),
  ],
);

export const socialContentLinks = mysqlTable(
  "social_content_links",
  {
    id: int("id").autoincrement().primaryKey(),
    platform: varchar("platform", { length: 40 }).notNull(),
    canonicalUrlHash: varchar("canonical_url_hash", { length: 64 }).notNull(),
    canonicalUrl: varchar("canonical_url", { length: 1000 }).notNull(),
    originalUrl: varchar("original_url", { length: 1200 }).notNull(),
    sourceLabel: varchar("source_label", { length: 120 }),
    sourceOrder: int("source_order"),
    sourceRunId: int("source_run_id").notNull(),
    sourceSheet: varchar("source_sheet", { length: 120 }).notNull(),
    sourceRow: int("source_row").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("social_content_links_platform_hash_unique").on(table.platform, table.canonicalUrlHash),
    index("social_content_links_run_idx").on(table.sourceRunId),
  ],
);

export const socialAudienceGoals = mysqlTable(
  "social_audience_goals",
  {
    id: int("id").autoincrement().primaryKey(),
    goalKey: varchar("goal_key", { length: 120 }).notNull(),
    effectiveFrom: varchar("effective_from", { length: 10 }).notNull(),
    targetCount: int("target_count").notNull(),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("social_audience_goals_key_date_unique").on(table.goalKey, table.effectiveFrom)],
);

export const revenueChannels = mysqlTable(
  "revenue_channels",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 80 }).notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    businessGroup: varchar("business_group", { length: 120 }).notNull(),
    classification: mysqlEnum("classification", ["internal", "external"]).notNull(),
    active: int("active").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("revenue_channels_code_unique").on(table.code)],
);

export const revenueSnapshots = mysqlTable(
  "revenue_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    observedAt: timestamp("observed_at").notNull(),
    businessDate: varchar("business_date", { length: 10 }).notNull(),
    localHour: int("local_hour").notNull(),
    internalRevenueCents: bigint("internal_revenue_cents", { mode: "number" }).notNull(),
    externalRevenueCents: bigint("external_revenue_cents", { mode: "number" }).notNull(),
    grossRevenueCents: bigint("gross_revenue_cents", { mode: "number" }).notNull(),
    internalPerCapitaCents: int("internal_per_capita_cents"),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("revenue_snapshots_observed_at_unique").on(table.observedAt),
    index("revenue_snapshots_business_date_idx").on(table.businessDate),
  ],
);

export const revenueChannelSnapshots = mysqlTable(
  "revenue_channel_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    snapshotId: int("snapshot_id").notNull(),
    channelId: int("channel_id").notNull(),
    revenueCents: bigint("revenue_cents", { mode: "number" }).notNull(),
    sourceRunId: int("source_run_id").notNull(),
    sourceRow: int("source_row"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("revenue_channel_snapshots_snapshot_channel_unique").on(table.snapshotId, table.channelId),
    index("revenue_channel_snapshots_channel_idx").on(table.channelId),
  ],
);

export const attendanceSnapshots = mysqlTable(
  "attendance_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    observedAt: timestamp("observed_at").notNull(),
    businessDate: varchar("business_date", { length: 10 }).notNull(),
    localHour: int("local_hour").notNull(),
    publicCount: int("public_count").notNull(),
    payingCount: int("paying_count").notNull(),
    complimentaryCount: int("complimentary_count").notNull(),
    entriesInterval: int("entries_interval").notNull(),
    exitsInterval: int("exits_interval").notNull(),
    currentlyInPark: int("currently_in_park").notNull(),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("attendance_snapshots_observed_at_unique").on(table.observedAt),
    index("attendance_snapshots_business_date_idx").on(table.businessDate),
  ],
);

/** "FECHAMENTO DIÁRIO" summary sent with the last attendance message of the day. */
export const attendanceDailyClosings = mysqlTable(
  "attendance_daily_closings",
  {
    id: int("id").autoincrement().primaryKey(),
    businessDate: varchar("business_date", { length: 10 }).notNull(),
    observedAt: timestamp("observed_at").notNull(),
    forecastCount: int("forecast_count").notNull(),
    realizedCount: int("realized_count").notNull(),
    variation: int("variation").notNull(),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("attendance_daily_closings_date_unique").on(table.businessDate)],
);

/** Attendance forecast for a business date as issued at a moment in time ("Previsão de Público"). */
export const attendanceForecasts = mysqlTable(
  "attendance_forecasts",
  {
    id: int("id").autoincrement().primaryKey(),
    businessDate: varchar("business_date", { length: 10 }).notNull(),
    issuedAt: timestamp("issued_at").notNull(),
    forecastCount: int("forecast_count").notNull(),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("attendance_forecasts_date_issued_unique").on(table.businessDate, table.issuedAt),
    index("attendance_forecasts_date_idx").on(table.businessDate),
  ],
);

export type OperationalSource = typeof operationalSources.$inferSelect;
export type OperationalImportRun = typeof operationalImportRuns.$inferSelect;
export type SocialFollowerSnapshot = typeof socialFollowerSnapshots.$inferSelect;
export type RevenueSnapshot = typeof revenueSnapshots.$inferSelect;
export type AttendanceSnapshot = typeof attendanceSnapshots.$inferSelect;

export const driveCampaignSources = mysqlTable(
  "drive_campaign_sources",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    rootFolderId: varchar("root_folder_id", { length: 160 }).notNull(),
    rootFolderName: varchar("root_folder_name", { length: 255 }),
    cronExpression: varchar("cron_expression", { length: 80 }).default("0 0 4,10,16,22 * * *").notNull(),
    scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
    enabled: int("enabled").default(1).notNull(),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("drive_campaign_sources_root_unique").on(table.rootFolderId),
    index("drive_campaign_sources_task_uid_idx").on(table.scheduleCronTaskUid),
  ],
);

export const driveCampaignSyncRuns = mysqlTable(
  "drive_campaign_sync_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceId: int("source_id").notNull(),
    status: mysqlEnum("status", ["started", "completed", "failed"]).default("started").notNull(),
    foldersSeen: int("folders_seen").default(0).notNull(),
    assetsSeen: int("assets_seen").default(0).notNull(),
    rowsInserted: int("rows_inserted").default(0).notNull(),
    rowsUpdated: int("rows_updated").default(0).notNull(),
    rowsRejected: int("rows_rejected").default(0).notNull(),
    warningsJson: mediumtext("warnings_json"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  table => [index("drive_campaign_sync_runs_source_idx").on(table.sourceId, table.startedAt)],
);

export const driveCampaigns = mysqlTable(
  "drive_campaigns",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceId: int("source_id").notNull(),
    driveFolderId: varchar("drive_folder_id", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    brand: varchar("brand", { length: 255 }),
    periodStart: varchar("period_start", { length: 10 }),
    periodEnd: varchar("period_end", { length: 10 }),
    folderUrl: varchar("folder_url", { length: 1000 }).notNull(),
    assetCount: int("asset_count").default(0).notNull(),
    imageCount: int("image_count").default(0).notNull(),
    videoCount: int("video_count").default(0).notNull(),
    formatsJson: text("formats_json"),
    subfoldersJson: mediumtext("subfolders_json"),
    previewsJson: text("previews_json"),
    active: int("active").default(1).notNull(),
    lastObservedAt: timestamp("last_observed_at").notNull(),
    lastRunId: int("last_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("drive_campaigns_source_folder_unique").on(table.sourceId, table.driveFolderId),
    uniqueIndex("drive_campaigns_slug_unique").on(table.slug),
    index("drive_campaigns_active_idx").on(table.active, table.lastObservedAt),
  ],
);

export const driveCampaignAssets = mysqlTable(
  "drive_campaign_assets",
  {
    id: int("id").autoincrement().primaryKey(),
    campaignId: int("campaign_id").notNull(),
    driveFileId: varchar("drive_file_id", { length: 160 }).notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 180 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    md5Checksum: varchar("md5_checksum", { length: 64 }),
    modifiedAt: timestamp("modified_at").notNull(),
    relativePath: varchar("relative_path", { length: 1000 }),
    webViewLink: varchar("web_view_link", { length: 1200 }),
    active: int("active").default(1).notNull(),
    lastRunId: int("last_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("drive_campaign_assets_file_unique").on(table.driveFileId),
    index("drive_campaign_assets_campaign_idx").on(table.campaignId, table.active),
  ],
);

export const campaignArchiveImports = mysqlTable(
  "campaign_archive_imports",
  {
    id: int("id").autoincrement().primaryKey(),
    campaignId: int("campaign_id").notNull(),
    archiveName: varchar("archive_name", { length: 500 }).notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    totalFiles: int("total_files").notNull(),
    imageFiles: int("image_files").default(0).notNull(),
    videoFiles: int("video_files").default(0).notNull(),
    documentFiles: int("document_files").default(0).notNull(),
    otherFiles: int("other_files").default(0).notNull(),
    matchedAssetCount: int("matched_asset_count").default(0).notNull(),
    verificationStatus: mysqlEnum("verification_status", ["verified_match", "needs_review"]).notNull(),
    sourceLabel: varchar("source_label", { length: 160 }).default("Arquivo enviado · Usuário").notNull(),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("campaign_archive_imports_sha256_unique").on(table.sha256),
    index("campaign_archive_imports_campaign_idx").on(table.campaignId, table.importedAt),
  ],
);

export type DriveCampaignSource = typeof driveCampaignSources.$inferSelect;
export type DriveCampaignSyncRun = typeof driveCampaignSyncRuns.$inferSelect;
export type DriveCampaign = typeof driveCampaigns.$inferSelect;
export type DriveCampaignAsset = typeof driveCampaignAssets.$inferSelect;
export type CampaignArchiveImport = typeof campaignArchiveImports.$inferSelect;

export const horaDoHorrorCampaigns = mysqlTable(
  "hora_do_horror_campaigns",
  {
    id: int("id").autoincrement().primaryKey(),
    edition: varchar("edition", { length: 160 }).notNull(),
    periodStart: varchar("period_start", { length: 10 }).notNull(),
    periodEnd: varchar("period_end", { length: 10 }).notNull(),
    status: mysqlEnum("status", ["draft", "scheduled", "active", "completed"]).default("draft").notNull(),
    notes: text("notes"),
    sourceLabel: varchar("source_label", { length: 160 }).default("Registro oficial · Dashboard").notNull(),
    createdByOpenId: varchar("created_by_open_id", { length: 64 }).notNull(),
    updatedByOpenId: varchar("updated_by_open_id", { length: 64 }).notNull(),
    active: int("active").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("hora_do_horror_campaigns_edition_unique").on(table.edition),
    index("hora_do_horror_campaigns_period_idx").on(table.active, table.periodStart, table.periodEnd),
  ],
);

export const horaDoHorrorCreatives = mysqlTable(
  "hora_do_horror_creatives",
  {
    id: int("id").autoincrement().primaryKey(),
    campaignId: int("campaign_id").notNull(),
    creativeName: varchar("creative_name", { length: 255 }).notNull(),
    platform: mysqlEnum("platform", ["instagram", "facebook", "tiktok", "multiplatform"]).notNull(),
    creativeFormat: varchar("creative_format", { length: 80 }).notNull(),
    publishedDate: varchar("published_date", { length: 10 }).notNull(),
    targetUrl: varchar("target_url", { length: 1200 }),
    utmCampaign: varchar("utm_campaign", { length: 255 }),
    callToAction: varchar("call_to_action", { length: 255 }),
    status: mysqlEnum("status", ["planned", "published", "paused"]).default("planned").notNull(),
    notes: text("notes"),
    sourceLabel: varchar("source_label", { length: 160 }).default("Registro oficial · Dashboard").notNull(),
    createdByOpenId: varchar("created_by_open_id", { length: 64 }).notNull(),
    updatedByOpenId: varchar("updated_by_open_id", { length: 64 }).notNull(),
    active: int("active").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("hora_do_horror_creatives_campaign_name_date_unique").on(table.campaignId, table.creativeName, table.publishedDate),
    index("hora_do_horror_creatives_campaign_idx").on(table.campaignId, table.active, table.publishedDate),
  ],
);

export type HoraDoHorrorCampaign = typeof horaDoHorrorCampaigns.$inferSelect;
export type HoraDoHorrorCreative = typeof horaDoHorrorCreatives.$inferSelect;

export const facebookDailyMetrics = mysqlTable(
  "facebook_daily_metrics",
  {
    id: int("id").autoincrement().primaryKey(),
    observedDate: varchar("observed_date", { length: 10 }).notNull(),
    followers: int("followers"),
    linkClicks: int("link_clicks"),
    interactions: int("interactions"),
    visits: int("visits"),
    views: int("views"),
    viewers: int("viewers"),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("facebook_daily_metrics_date_unique").on(table.observedDate),
    index("facebook_daily_metrics_run_idx").on(table.sourceRunId),
  ],
);

export const facebookDemographics = mysqlTable(
  "facebook_demographics",
  {
    id: int("id").autoincrement().primaryKey(),
    observedDate: varchar("observed_date", { length: 10 }).notNull(),
    demographicsJson: text("demographics_json").notNull(),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("facebook_demographics_date_unique").on(table.observedDate),
    index("facebook_demographics_run_idx").on(table.sourceRunId),
  ],
);

export type FacebookDailyMetric = typeof facebookDailyMetrics.$inferSelect;
export type FacebookDemographic = typeof facebookDemographics.$inferSelect;

export const instagramDailyMetrics = mysqlTable(
  "instagram_daily_metrics",
  {
    id: int("id").autoincrement().primaryKey(),
    observedDate: varchar("observed_date", { length: 10 }).notNull(),
    followers: int("followers"),
    linkClicks: int("link_clicks"),
    interactions: int("interactions"),
    visits: int("visits"),
    reach: int("reach"),
    views: int("views"),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("instagram_daily_metrics_date_unique").on(table.observedDate),
    index("instagram_daily_metrics_run_idx").on(table.sourceRunId),
  ],
);

export const instagramDemographics = mysqlTable(
  "instagram_demographics",
  {
    id: int("id").autoincrement().primaryKey(),
    observedDate: varchar("observed_date", { length: 10 }).notNull(),
    demographicsJson: text("demographics_json").notNull(),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("instagram_demographics_date_unique").on(table.observedDate),
    index("instagram_demographics_run_idx").on(table.sourceRunId),
  ],
);

export type InstagramDailyMetric = typeof instagramDailyMetrics.$inferSelect;
export type InstagramDemographic = typeof instagramDemographics.$inferSelect;

export const tiktokDailyMetrics = mysqlTable(
  "tiktok_daily_metrics",
  {
    id: int("id").autoincrement().primaryKey(),
    observedDate: varchar("observed_date", { length: 10 }).notNull(),
    followers: int("followers"),
    videoViews: int("video_views"),
    profileViews: int("profile_views"),
    likes: int("likes"),
    comments: int("comments"),
    shares: int("shares"),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("tiktok_daily_metrics_date_unique").on(table.observedDate),
    index("tiktok_daily_metrics_run_idx").on(table.sourceRunId),
  ],
);

export const tiktokViewerSnapshots = mysqlTable(
  "tiktok_viewer_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    observedDate: varchar("observed_date", { length: 10 }).notNull(),
    totalViewers: int("total_viewers"),
    newViewers: int("new_viewers"),
    returningViewers: int("returning_viewers"),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("tiktok_viewer_snapshots_date_unique").on(table.observedDate),
    index("tiktok_viewer_snapshots_run_idx").on(table.sourceRunId),
  ],
);

export const tiktokAudienceSnapshots = mysqlTable(
  "tiktok_audience_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    observedDate: varchar("observed_date", { length: 10 }).notNull(),
    demographicsJson: text("demographics_json").notNull(),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("tiktok_audience_snapshots_date_unique").on(table.observedDate),
    index("tiktok_audience_snapshots_run_idx").on(table.sourceRunId),
  ],
);

export const tiktokFollowerActivity = mysqlTable(
  "tiktok_follower_activity",
  {
    id: int("id").autoincrement().primaryKey(),
    observedDate: varchar("observed_date", { length: 10 }).notNull(),
    hour: int("hour").notNull(),
    activeFollowers: int("active_followers").notNull(),
    sourceRunId: int("source_run_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("tiktok_follower_activity_date_hour_unique").on(table.observedDate, table.hour),
    index("tiktok_follower_activity_run_idx").on(table.sourceRunId),
  ],
);

export type TiktokDailyMetric = typeof tiktokDailyMetrics.$inferSelect;
export type TiktokViewerSnapshot = typeof tiktokViewerSnapshots.$inferSelect;
export type TiktokAudienceSnapshot = typeof tiktokAudienceSnapshots.$inferSelect;
export type TiktokFollowerActivity = typeof tiktokFollowerActivity.$inferSelect;
