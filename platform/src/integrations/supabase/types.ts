export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          area: string
          created_at: string
          details: Json
          id: string
          record_ref: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind?: string
          area: string
          created_at?: string
          details?: Json
          id?: string
          record_ref?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          area?: string
          created_at?: string
          details?: Json
          id?: string
          record_ref?: string | null
        }
        Relationships: []
      }
      behavior_events: {
        Row: {
          channel: string | null
          event_name: string
          expires_at: string
          id: string
          occurred_at: string
          page_path: string | null
          props: Json
          pseudonym_id: string | null
          session_id: string | null
        }
        Insert: {
          channel?: string | null
          event_name: string
          expires_at?: string
          id?: string
          occurred_at?: string
          page_path?: string | null
          props?: Json
          pseudonym_id?: string | null
          session_id?: string | null
        }
        Update: {
          channel?: string | null
          event_name?: string
          expires_at?: string
          id?: string
          occurred_at?: string
          page_path?: string | null
          props?: Json
          pseudonym_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_events_pseudonym_id_fkey"
            columns: ["pseudonym_id"]
            isOneToOne: false
            referencedRelation: "identity_consents"
            referencedColumns: ["pseudonym_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand: string | null
          charts: Json
          created_at: string
          id: string
          name: string
          period_end: string | null
          period_start: string | null
          slug: string
          source: string
          summary: Json
          updated_at: string
        }
        Insert: {
          brand?: string | null
          charts?: Json
          created_at?: string
          id?: string
          name: string
          period_end?: string | null
          period_start?: string | null
          slug: string
          source?: string
          summary?: Json
          updated_at?: string
        }
        Update: {
          brand?: string | null
          charts?: Json
          created_at?: string
          id?: string
          name?: string
          period_end?: string | null
          period_start?: string | null
          slug?: string
          source?: string
          summary?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ci_competitors: {
        Row: {
          active: boolean
          created_at: string
          exclude_flags: Json
          id: string
          instagram: string | null
          is_self: boolean
          name: string
          slug: string
          tiktok: string | null
          trends_query: string
          youtube: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          exclude_flags?: Json
          id?: string
          instagram?: string | null
          is_self?: boolean
          name: string
          slug: string
          tiktok?: string | null
          trends_query: string
          youtube?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          exclude_flags?: Json
          id?: string
          instagram?: string | null
          is_self?: boolean
          name?: string
          slug?: string
          tiktok?: string | null
          trends_query?: string
          youtube?: string | null
        }
        Relationships: []
      }
      ci_insights: {
        Row: {
          body_ptbr: string
          created_at: string
          headline: string
          id: number
          model: string
          ranking: Json | null
          week_ending: string
        }
        Insert: {
          body_ptbr: string
          created_at?: string
          headline: string
          id?: never
          model?: string
          ranking?: Json | null
          week_ending: string
        }
        Update: {
          body_ptbr?: string
          created_at?: string
          headline?: string
          id?: never
          model?: string
          ranking?: Json | null
          week_ending?: string
        }
        Relationships: []
      }
      ci_posts: {
        Row: {
          caption: string | null
          captured_at: string
          comments: number | null
          competitor_id: string
          external_id: string
          id: number
          likes: number | null
          platform: string
          posted_at: string | null
          url: string | null
          views: number | null
        }
        Insert: {
          caption?: string | null
          captured_at?: string
          comments?: number | null
          competitor_id: string
          external_id: string
          id?: never
          likes?: number | null
          platform: string
          posted_at?: string | null
          url?: string | null
          views?: number | null
        }
        Update: {
          caption?: string | null
          captured_at?: string
          comments?: number | null
          competitor_id?: string
          external_id?: string
          id?: never
          likes?: number | null
          platform?: string
          posted_at?: string | null
          url?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_posts_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "ci_competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_social_snapshots: {
        Row: {
          avg_comments: number | null
          avg_likes: number | null
          captured_at: string
          competitor_id: string
          engagement_rate: number | null
          followers: number | null
          id: number
          platform: string
          posts_count: number | null
          raw: Json | null
        }
        Insert: {
          avg_comments?: number | null
          avg_likes?: number | null
          captured_at?: string
          competitor_id: string
          engagement_rate?: number | null
          followers?: number | null
          id?: never
          platform: string
          posts_count?: number | null
          raw?: Json | null
        }
        Update: {
          avg_comments?: number | null
          avg_likes?: number | null
          captured_at?: string
          competitor_id?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: never
          platform?: string
          posts_count?: number | null
          raw?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ci_social_snapshots_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "ci_competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_trend_scores: {
        Row: {
          batch: string | null
          captured_at: string
          competitor_id: string
          date: string
          id: number
          raw_score: number | null
          score: number
        }
        Insert: {
          batch?: string | null
          captured_at?: string
          competitor_id: string
          date: string
          id?: never
          raw_score?: number | null
          score: number
        }
        Update: {
          batch?: string | null
          captured_at?: string
          competitor_id?: string
          date?: string
          id?: never
          raw_score?: number | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ci_trend_scores_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "ci_competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      ci_weekly_input: {
        Row: {
          created_at: string
          engagement: number | null
          facebook: number | null
          id: number
          instagram: number | null
          linkedin: number | null
          mentions: number | null
          name: string
          notes: string | null
          sentiment: number | null
          slug: string
          tiktok: number | null
          total_followers: number | null
          updated_at: string
          week: string
          youtube: number | null
        }
        Insert: {
          created_at?: string
          engagement?: number | null
          facebook?: number | null
          id?: number
          instagram?: number | null
          linkedin?: number | null
          mentions?: number | null
          name: string
          notes?: string | null
          sentiment?: number | null
          slug: string
          tiktok?: number | null
          total_followers?: number | null
          updated_at?: string
          week: string
          youtube?: number | null
        }
        Update: {
          created_at?: string
          engagement?: number | null
          facebook?: number | null
          id?: number
          instagram?: number | null
          linkedin?: number | null
          mentions?: number | null
          name?: string
          notes?: string | null
          sentiment?: number | null
          slug?: string
          tiktok?: number | null
          total_followers?: number | null
          updated_at?: string
          week?: string
          youtube?: number | null
        }
        Relationships: []
      }
      competitor_snapshot: {
        Row: {
          collected_at: string
          created_at: string
          engagement_index: number
          excluded: boolean
          exclusion_note: string | null
          followers: number
          id: number
          mentions_index: number
          park_name: string
        }
        Insert: {
          collected_at: string
          created_at?: string
          engagement_index: number
          excluded?: boolean
          exclusion_note?: string | null
          followers: number
          id?: number
          mentions_index: number
          park_name: string
        }
        Update: {
          collected_at?: string
          created_at?: string
          engagement_index?: number
          excluded?: boolean
          exclusion_note?: string | null
          followers?: number
          id?: number
          mentions_index?: number
          park_name?: string
        }
        Relationships: []
      }
      crm_lead_dimensions: {
        Row: {
          bucket_key: string
          bucket_label: string
          created_at: string
          dimension: string
          id: string
          leads: number
          sort_order: number
          source: string
          updated_at: string
        }
        Insert: {
          bucket_key: string
          bucket_label: string
          created_at?: string
          dimension: string
          id?: string
          leads?: number
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Update: {
          bucket_key?: string
          bucket_label?: string
          created_at?: string
          dimension?: string
          id?: string
          leads?: number
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_leads_geo: {
        Row: {
          city: string
          created_at: string
          id: string
          leads: number
          source: string
          uf: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          leads?: number
          source?: string
          uf: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          leads?: number
          source?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_cpf_regions: {
        Row: {
          created_at: string
          id: string
          region_digit: number
          region_label: string
          registrations: number
          registrations_2018_2019: number
          registrations_pos_2023: number
          states: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          region_digit: number
          region_label: string
          registrations?: number
          registrations_2018_2019?: number
          registrations_pos_2023?: number
          states?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          region_digit?: number
          region_label?: string
          registrations?: number
          registrations_2018_2019?: number
          registrations_pos_2023?: number
          states?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      customer_demographics: {
        Row: {
          bucket_key: string
          bucket_label: string
          created_at: string
          customers: number
          dimension: string
          id: string
          sort_order: number
          source: string
          updated_at: string
        }
        Insert: {
          bucket_key: string
          bucket_label: string
          created_at?: string
          customers?: number
          dimension: string
          id?: string
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Update: {
          bucket_key?: string
          bucket_label?: string
          created_at?: string
          customers?: number
          dimension?: string
          id?: string
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_registration_heatmap: {
        Row: {
          created_at: string
          hour: number
          id: string
          registrations: number
          source: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          hour: number
          id?: string
          registrations?: number
          source?: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          hour?: number
          id?: string
          registrations?: number
          source?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      customer_registrations_daily: {
        Row: {
          created_at: string
          date: string
          id: string
          registrations: number
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          registrations?: number
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          registrations?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          comments: number | null
          created_at: string
          date: string
          engagement_rate: number | null
          followers: number | null
          id: string
          impressions: number | null
          likes: number | null
          new_followers: number | null
          notes: string | null
          platform: string
          post_url: string | null
          posted: boolean | null
          reach: number | null
          shares: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          date: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          new_followers?: number | null
          notes?: string | null
          platform: string
          post_url?: string | null
          posted?: boolean | null
          reach?: number | null
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          date?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          new_followers?: number | null
          notes?: string | null
          platform?: string
          post_url?: string | null
          posted?: boolean | null
          reach?: number | null
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          key: string
          retention_months: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          key: string
          retention_months: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          key?: string
          retention_months?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_retention_runs: {
        Row: {
          consents_deleted: number
          events_deleted: number
          id: string
          ran_at: string
          segments_deleted: number
          triggered_by: string
        }
        Insert: {
          consents_deleted?: number
          events_deleted?: number
          id?: string
          ran_at?: string
          segments_deleted?: number
          triggered_by?: string
        }
        Update: {
          consents_deleted?: number
          events_deleted?: number
          id?: string
          ran_at?: string
          segments_deleted?: number
          triggered_by?: string
        }
        Relationships: []
      }
      distributor_business_portfolio: {
        Row: {
          city: string | null
          client_name: string
          cnpj: string | null
          contact: string | null
          created_at: string
          distributor_name: string
          id: string
          phone: string | null
          segment: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          client_name: string
          cnpj?: string | null
          contact?: string | null
          created_at?: string
          distributor_name: string
          id?: string
          phone?: string | null
          segment?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          client_name?: string
          cnpj?: string | null
          contact?: string | null
          created_at?: string
          distributor_name?: string
          id?: string
          phone?: string | null
          segment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      distributor_goal_monthly: {
        Row: {
          created_at: string
          goal_revenue: number
          id: string
          month: number
          realized_revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          goal_revenue?: number
          id?: string
          month: number
          realized_revenue?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          goal_revenue?: number
          id?: string
          month?: number
          realized_revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      distributor_sales_daily: {
        Row: {
          created_at: string
          id: string
          kind: string
          month: number
          quantity: number
          revenue: number
          sale_date: string | null
          source: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          month: number
          quantity?: number
          revenue?: number
          sale_date?: string | null
          source?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          month?: number
          quantity?: number
          revenue?: number
          sale_date?: string | null
          source?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      distributor_sales_monthly: {
        Row: {
          created_at: string
          distributor_key: string
          goal_quantity: number | null
          id: string
          month: number
          quantity: number
          revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          distributor_key: string
          goal_quantity?: number | null
          id?: string
          month: number
          quantity?: number
          revenue?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          distributor_key?: string
          goal_quantity?: number | null
          id?: string
          month?: number
          quantity?: number
          revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      distributors: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          email: string | null
          full_key: string
          id: string
          name: string
          phone: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          email?: string | null
          full_key: string
          id?: string
          name: string
          phone?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          email?: string | null
          full_key?: string
          id?: string
          name?: string
          phone?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ecommerce_funnel: {
        Row: {
          add_to_cart: number
          avg_ticket: number | null
          conversion_rate: number | null
          created_at: string
          id: string
          period_end: string
          period_label: string
          period_start: string
          product_views: number
          purchases: number
          revenue: number
          source: string
          updated_at: string
          visits: number
        }
        Insert: {
          add_to_cart?: number
          avg_ticket?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          period_end: string
          period_label: string
          period_start: string
          product_views?: number
          purchases?: number
          revenue?: number
          source?: string
          updated_at?: string
          visits?: number
        }
        Update: {
          add_to_cart?: number
          avg_ticket?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          period_end?: string
          period_label?: string
          period_start?: string
          product_views?: number
          purchases?: number
          revenue?: number
          source?: string
          updated_at?: string
          visits?: number
        }
        Relationships: []
      }
      facebook_insights: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          period_end: string
          period_start: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics: Json
          period_end: string
          period_start: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          period_end?: string
          period_start?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      facebook_posts: {
        Row: {
          ai_analysis: Json | null
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          like_count: number | null
          media_type: string | null
          media_url: string | null
          owner_username: string | null
          post_url: string
          raw_data: Json | null
          scrape_status: string
          scraped_at: string | null
          share_count: number | null
          shortcode: string | null
          thumbnail_url: string | null
          timestamp: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url?: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      follower_daily: {
        Row: {
          anomaly_note: string | null
          created_at: string
          facebook: number
          instagram: number
          is_anomaly: boolean
          linkedin: number
          reading_date: string
          source: string
          tiktok: number
          total: number | null
          youtube: number
        }
        Insert: {
          anomaly_note?: string | null
          created_at?: string
          facebook: number
          instagram: number
          is_anomaly?: boolean
          linkedin: number
          reading_date: string
          source?: string
          tiktok: number
          total?: number | null
          youtube: number
        }
        Update: {
          anomaly_note?: string | null
          created_at?: string
          facebook?: number
          instagram?: number
          is_anomaly?: boolean
          linkedin?: number
          reading_date?: string
          source?: string
          tiktok?: number
          total?: number | null
          youtube?: number
        }
        Relationships: []
      }
      gender_audit_reviews: {
        Row: {
          actual_gender: string
          created_at: string
          first_name: string
          id: string
          is_correct: boolean
          notes: string | null
          predicted_gender: string
          reviewer: string | null
          sample_id: string
        }
        Insert: {
          actual_gender: string
          created_at?: string
          first_name: string
          id?: string
          is_correct: boolean
          notes?: string | null
          predicted_gender: string
          reviewer?: string | null
          sample_id: string
        }
        Update: {
          actual_gender?: string
          created_at?: string
          first_name?: string
          id?: string
          is_correct?: boolean
          notes?: string | null
          predicted_gender?: string
          reviewer?: string | null
          sample_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gender_audit_reviews_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "gender_audit_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      gender_audit_samples: {
        Row: {
          created_at: string
          first_name: string
          id: string
          occurrences: number
          predicted_gender: string
          reviewed: boolean
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          occurrences?: number
          predicted_gender: string
          reviewed?: boolean
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          occurrences?: number
          predicted_gender?: string
          reviewed?: boolean
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      goal_cycle: {
        Row: {
          created_at: string
          cycle_end: string | null
          cycle_start: string
          goal: number
          id: number
          is_active: boolean
          label: string
        }
        Insert: {
          created_at?: string
          cycle_end?: string | null
          cycle_start: string
          goal: number
          id?: number
          is_active?: boolean
          label: string
        }
        Update: {
          created_at?: string
          cycle_end?: string | null
          cycle_start?: string
          goal?: number
          id?: number
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      gsc_daily_queries: {
        Row: {
          clicks: number
          ctr: number
          date: string
          fetched_at: string
          id: number
          impressions: number
          is_brand: boolean
          position: number
          query: string
          site_url: string
        }
        Insert: {
          clicks?: number
          ctr?: number
          date: string
          fetched_at?: string
          id?: number
          impressions?: number
          is_brand?: boolean
          position?: number
          query: string
          site_url: string
        }
        Update: {
          clicks?: number
          ctr?: number
          date?: string
          fetched_at?: string
          id?: number
          impressions?: number
          is_brand?: boolean
          position?: number
          query?: string
          site_url?: string
        }
        Relationships: []
      }
      gsc_daily_totals: {
        Row: {
          clicks: number
          ctr: number
          date: string
          fetched_at: string
          id: number
          impressions: number
          position: number
          site_url: string
        }
        Insert: {
          clicks?: number
          ctr?: number
          date: string
          fetched_at?: string
          id?: number
          impressions?: number
          position?: number
          site_url: string
        }
        Update: {
          clicks?: number
          ctr?: number
          date?: string
          fetched_at?: string
          id?: number
          impressions?: number
          position?: number
          site_url?: string
        }
        Relationships: []
      }
      gsc_sync_log: {
        Row: {
          days_range: string | null
          error_message: string | null
          finished_at: string | null
          id: number
          rows_queries: number | null
          rows_totals: number | null
          site_url: string | null
          started_at: string
          status: string
        }
        Insert: {
          days_range?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: number
          rows_queries?: number | null
          rows_totals?: number | null
          site_url?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          days_range?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: number
          rows_queries?: number | null
          rows_totals?: number | null
          site_url?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      identity_consents: {
        Row: {
          created_at: string
          granted_at: string | null
          policy_version: string
          pseudonym_id: string
          purposes: string[]
          revoked_at: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          granted_at?: string | null
          policy_version?: string
          pseudonym_id: string
          purposes?: string[]
          revoked_at?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          granted_at?: string | null
          policy_version?: string
          pseudonym_id?: string
          purposes?: string[]
          revoked_at?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      identity_segments: {
        Row: {
          age_group: string | null
          cohort: string | null
          cpf_region_label: string | null
          created_at: string
          pseudonym_id: string
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          cohort?: string | null
          cpf_region_label?: string | null
          created_at?: string
          pseudonym_id: string
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          cohort?: string | null
          cpf_region_label?: string | null
          created_at?: string
          pseudonym_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_segments_pseudonym_id_fkey"
            columns: ["pseudonym_id"]
            isOneToOne: true
            referencedRelation: "identity_consents"
            referencedColumns: ["pseudonym_id"]
          },
        ]
      }
      instagram_audience_geo: {
        Row: {
          city: string | null
          created_at: string
          followers: number | null
          id: string
          level: string
          period_label: string | null
          share_pct: number
          source: string
          uf: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          followers?: number | null
          id?: string
          level: string
          period_label?: string | null
          share_pct: number
          source?: string
          uf: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          followers?: number | null
          id?: string
          level?: string
          period_label?: string | null
          share_pct?: number
          source?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      instagram_insights: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          period_end: string
          period_start: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics: Json
          period_end: string
          period_start: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          period_end?: string
          period_start?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      instagram_posts: {
        Row: {
          ai_analysis: Json | null
          caption: string | null
          comments_count: number | null
          created_at: string
          error_message: string | null
          id: string
          like_count: number | null
          media_type: string | null
          media_url: string | null
          owner_username: string | null
          post_url: string
          raw_data: Json | null
          scrape_status: string
          scraped_at: string | null
          share_count: number | null
          shortcode: string | null
          thumbnail_url: string | null
          timestamp: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url?: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      instagram_reports: {
        Row: {
          created_at: string
          id: string
          insights: Json | null
          scope: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insights?: Json | null
          scope?: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insights?: Json | null
          scope?: string
          summary?: string | null
        }
        Relationships: []
      }
      linkedin_posts: {
        Row: {
          ai_analysis: Json | null
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          like_count: number | null
          media_type: string | null
          media_url: string | null
          owner_username: string | null
          post_url: string
          raw_data: Json | null
          scrape_status: string
          scraped_at: string | null
          share_count: number | null
          shortcode: string | null
          thumbnail_url: string | null
          timestamp: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url?: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      park_attraction_monthly: {
        Row: {
          area: string
          attraction: string
          created_at: string
          id: string
          month: number
          penetration_pct: number
          rides: number
          updated_at: string
          year: number
        }
        Insert: {
          area: string
          attraction: string
          created_at?: string
          id?: string
          month: number
          penetration_pct?: number
          rides?: number
          updated_at?: string
          year: number
        }
        Update: {
          area?: string
          attraction?: string
          created_at?: string
          id?: string
          month?: number
          penetration_pct?: number
          rides?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      park_event_sync_runs: {
        Row: {
          created_at: string
          errors: Json
          id: string
          insights_generated: number
          new_events: number
          ran_at: string
          saved: number
          scraped: number
          success: boolean
          triggered_by: string
          updated_events: number
        }
        Insert: {
          created_at?: string
          errors?: Json
          id?: string
          insights_generated?: number
          new_events?: number
          ran_at?: string
          saved?: number
          scraped?: number
          success?: boolean
          triggered_by?: string
          updated_events?: number
        }
        Update: {
          created_at?: string
          errors?: Json
          id?: string
          insights_generated?: number
          new_events?: number
          ran_at?: string
          saved?: number
          scraped?: number
          success?: boolean
          triggered_by?: string
          updated_events?: number
        }
        Relationships: []
      }
      park_events: {
        Row: {
          active: boolean
          ai_insights: Json | null
          category: string | null
          created_at: string
          description: string | null
          end_date: string | null
          highlight: boolean
          id: string
          image_url: string | null
          insights_generated_at: string | null
          last_seen_at: string
          raw_data: Json | null
          slug: string
          source: string
          start_date: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          ai_insights?: Json | null
          category?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          highlight?: boolean
          id?: string
          image_url?: string | null
          insights_generated_at?: string | null
          last_seen_at?: string
          raw_data?: Json | null
          slug: string
          source?: string
          start_date?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          ai_insights?: Json | null
          category?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          highlight?: boolean
          id?: string
          image_url?: string | null
          insights_generated_at?: string | null
          last_seen_at?: string
          raw_data?: Json | null
          slug?: string
          source?: string
          start_date?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      park_gate_flow_hourly: {
        Row: {
          created_at: string
          date: string
          entries: number
          exits: number
          hour: number
          id: string
        }
        Insert: {
          created_at?: string
          date: string
          entries?: number
          exits?: number
          hour: number
          id?: string
        }
        Update: {
          created_at?: string
          date?: string
          entries?: number
          exits?: number
          hour?: number
          id?: string
        }
        Relationships: []
      }
      park_outlet_revenue_daily: {
        Row: {
          created_at: string
          date: string
          id: string
          outlet: string
          revenue: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          outlet: string
          revenue?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          outlet?: string
          revenue?: number
        }
        Relationships: []
      }
      park_percapita_daily: {
        Row: {
          category: string
          created_at: string
          date: string
          id: string
          penetration_pct: number | null
          per_capita: number | null
          public: number | null
          quantity: number | null
          revenue: number
        }
        Insert: {
          category: string
          created_at?: string
          date: string
          id?: string
          penetration_pct?: number | null
          per_capita?: number | null
          public?: number | null
          quantity?: number | null
          revenue?: number
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          id?: string
          penetration_pct?: number | null
          per_capita?: number | null
          public?: number | null
          quantity?: number | null
          revenue?: number
        }
        Relationships: []
      }
      park_public_monthly: {
        Row: {
          created_at: string
          id: string
          month: number
          open_days: number | null
          updated_at: string
          visitors: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          open_days?: number | null
          updated_at?: string
          visitors?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          open_days?: number | null
          updated_at?: string
          visitors?: number
          year?: number
        }
        Relationships: []
      }
      park_visitors_forecast: {
        Row: {
          created_at: string
          date: string
          id: string
          source: string
          updated_at: string
          visitors: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          source?: string
          updated_at?: string
          visitors?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          source?: string
          updated_at?: string
          visitors?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          follower_count: number
          platform: string
          updated_at: string
        }
        Insert: {
          follower_count?: number
          platform: string
          updated_at?: string
        }
        Update: {
          follower_count?: number
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      reputation_reviews: {
        Row: {
          ai_summary: string | null
          author: string | null
          body: string | null
          category: string | null
          created_at: string
          external_id: string
          id: string
          location: string | null
          published_at: string | null
          rating: number | null
          raw_data: Json | null
          resolved: boolean
          responded_at: string | null
          response_time_hours: number | null
          sentiment: string | null
          sentiment_score: number | null
          source: string
          status: string | null
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          ai_summary?: string | null
          author?: string | null
          body?: string | null
          category?: string | null
          created_at?: string
          external_id: string
          id?: string
          location?: string | null
          published_at?: string | null
          rating?: number | null
          raw_data?: Json | null
          resolved?: boolean
          responded_at?: string | null
          response_time_hours?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          source: string
          status?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          ai_summary?: string | null
          author?: string | null
          body?: string | null
          category?: string | null
          created_at?: string
          external_id?: string
          id?: string
          location?: string | null
          published_at?: string | null
          rating?: number | null
          raw_data?: Json | null
          resolved?: boolean
          responded_at?: string | null
          response_time_hours?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          source?: string
          status?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      sales_channel_monthly: {
        Row: {
          channel: string
          created_at: string
          id: string
          month: number
          quantity: number
          updated_at: string
          year: number
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          month: number
          quantity?: number
          updated_at?: string
          year: number
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          month?: number
          quantity?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      sales_funnel_deals: {
        Row: {
          company: string
          contact_channel: string | null
          contact_email: string | null
          created_at: string
          event_date: string | null
          event_type: string | null
          id: string
          loss_reason: string | null
          paid_value: number | null
          pax: number | null
          stage: string
          status: string | null
          total_value: number
          updated_at: string
          year: number
        }
        Insert: {
          company: string
          contact_channel?: string | null
          contact_email?: string | null
          created_at?: string
          event_date?: string | null
          event_type?: string | null
          id?: string
          loss_reason?: string | null
          paid_value?: number | null
          pax?: number | null
          stage: string
          status?: string | null
          total_value?: number
          updated_at?: string
          year: number
        }
        Update: {
          company?: string
          contact_channel?: string | null
          contact_email?: string | null
          created_at?: string
          event_date?: string | null
          event_type?: string | null
          id?: string
          loss_reason?: string | null
          paid_value?: number | null
          pax?: number | null
          stage?: string
          status?: string | null
          total_value?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      sales_funnel_monthly: {
        Row: {
          created_at: string
          id: string
          month: number
          revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          revenue?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      sales_meeting_channels: {
        Row: {
          channel: string
          created_at: string
          forecast: number | null
          goal: number
          id: string
          meeting_date: string
          period_end: string
          period_start: string
          realized_current: number
          realized_previous: number
          scope: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          forecast?: number | null
          goal?: number
          id?: string
          meeting_date: string
          period_end: string
          period_start: string
          realized_current?: number
          realized_previous?: number
          scope: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          forecast?: number | null
          goal?: number
          id?: string
          meeting_date?: string
          period_end?: string
          period_start?: string
          realized_current?: number
          realized_previous?: number
          scope?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales_product_yearly: {
        Row: {
          channel: string
          created_at: string
          id: string
          product: string
          quantity: number
          revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          product: string
          quantity?: number
          revenue?: number
          updated_at?: string
          year: number
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          product?: string
          quantity?: number
          revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      sales_revenue_monthly: {
        Row: {
          channel: string
          created_at: string
          id: string
          month: number
          quantity: number
          revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          month: number
          quantity?: number
          revenue?: number
          updated_at?: string
          year: number
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          month?: number
          quantity?: number
          revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      school_portfolio: {
        Row: {
          created_at: string
          distributor_name: string | null
          id: string
          municipality: string
          network: string
          schools: number
          uf: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distributor_name?: string | null
          id?: string
          municipality: string
          network: string
          schools?: number
          uf: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distributor_name?: string | null
          id?: string
          municipality?: string
          network?: string
          schools?: number
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      segment_aggregate_cache: {
        Row: {
          cache_key: string
          computed_at: string
          expires_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          computed_at?: string
          expires_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          computed_at?: string
          expires_at?: string
          payload?: Json
        }
        Relationships: []
      }
      social_content_formats: {
        Row: {
          created_at: string
          format_label: string
          id: string
          metric: string
          period_end: string
          period_start: string
          platform: string
          source: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          format_label: string
          id?: string
          metric: string
          period_end: string
          period_start: string
          platform: string
          source?: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          format_label?: string
          id?: string
          metric?: string
          period_end?: string
          period_start?: string
          platform?: string
          source?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      tiktok_posts: {
        Row: {
          ai_analysis: Json | null
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          like_count: number | null
          media_type: string | null
          media_url: string | null
          owner_username: string | null
          post_url: string
          raw_data: Json | null
          scrape_status: string
          scraped_at: string | null
          share_count: number | null
          shortcode: string | null
          thumbnail_url: string | null
          timestamp: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url?: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_sales_daily: {
        Row: {
          created_at: string
          id: string
          orders: number | null
          revenue: number
          sale_date: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          orders?: number | null
          revenue?: number
          sale_date: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          orders?: number | null
          revenue?: number
          sale_date?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_insight: {
        Row: {
          edited_at: string | null
          edited_by: string | null
          generated_at: string
          model: string
          notes: Json
          script_md: string | null
          week_end: string
        }
        Insert: {
          edited_at?: string | null
          edited_by?: string | null
          generated_at?: string
          model: string
          notes: Json
          script_md?: string | null
          week_end: string
        }
        Update: {
          edited_at?: string | null
          edited_by?: string | null
          generated_at?: string
          model?: string
          notes?: Json
          script_md?: string | null
          week_end?: string
        }
        Relationships: []
      }
      x_mentions: {
        Row: {
          ai_summary: string | null
          author_followers: number | null
          author_handle: string | null
          author_name: string | null
          brand: string
          created_at: string
          id: string
          keyword: string | null
          lang: string | null
          likes: number
          published_at: string | null
          quotes: number
          replies: number
          retweets: number
          sentiment: string | null
          text: string | null
          topic: string | null
          tweet_id: string
          url: string | null
          views: number
        }
        Insert: {
          ai_summary?: string | null
          author_followers?: number | null
          author_handle?: string | null
          author_name?: string | null
          brand?: string
          created_at?: string
          id?: string
          keyword?: string | null
          lang?: string | null
          likes?: number
          published_at?: string | null
          quotes?: number
          replies?: number
          retweets?: number
          sentiment?: string | null
          text?: string | null
          topic?: string | null
          tweet_id: string
          url?: string | null
          views?: number
        }
        Update: {
          ai_summary?: string | null
          author_followers?: number | null
          author_handle?: string | null
          author_name?: string | null
          brand?: string
          created_at?: string
          id?: string
          keyword?: string | null
          lang?: string | null
          likes?: number
          published_at?: string | null
          quotes?: number
          replies?: number
          retweets?: number
          sentiment?: string | null
          text?: string | null
          topic?: string | null
          tweet_id?: string
          url?: string | null
          views?: number
        }
        Relationships: []
      }
      x_posts: {
        Row: {
          ai_analysis: Json | null
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          like_count: number | null
          media_type: string | null
          media_url: string | null
          owner_username: string | null
          post_url: string
          raw_data: Json | null
          scrape_status: string
          scraped_at: string | null
          share_count: number | null
          shortcode: string | null
          thumbnail_url: string | null
          timestamp: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url?: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      youtube_channel_daily: {
        Row: {
          created_at: string
          date: string
          id: string
          views: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          views?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          views?: number
        }
        Relationships: []
      }
      youtube_channel_totals: {
        Row: {
          created_at: string
          ctr: number
          id: string
          impressions: number
          snapshot_date: string
          source: string
          subscribers_gained: number
          views: number
          watch_time_hours: number
        }
        Insert: {
          created_at?: string
          ctr?: number
          id?: string
          impressions?: number
          snapshot_date?: string
          source?: string
          subscribers_gained?: number
          views?: number
          watch_time_hours?: number
        }
        Update: {
          created_at?: string
          ctr?: number
          id?: string
          impressions?: number
          snapshot_date?: string
          source?: string
          subscribers_gained?: number
          views?: number
          watch_time_hours?: number
        }
        Relationships: []
      }
      youtube_daily_views: {
        Row: {
          created_at: string
          date: string
          id: string
          video_id: string
          views: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          video_id: string
          views?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          video_id?: string
          views?: number
        }
        Relationships: []
      }
      youtube_posts: {
        Row: {
          ai_analysis: Json | null
          caption: string | null
          comments_count: number | null
          created_at: string
          ctr: number | null
          duration_seconds: number | null
          id: string
          impressions: number | null
          like_count: number | null
          media_type: string | null
          media_url: string | null
          owner_username: string | null
          post_url: string
          raw_data: Json | null
          scrape_status: string
          scraped_at: string | null
          share_count: number | null
          shortcode: string | null
          subscribers_gained: number | null
          thumbnail_url: string | null
          timestamp: string | null
          updated_at: string
          video_id: string | null
          view_count: number | null
          watch_time_hours: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          ctr?: number | null
          duration_seconds?: number | null
          id?: string
          impressions?: number | null
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          subscribers_gained?: number | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          video_id?: string | null
          view_count?: number | null
          watch_time_hours?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          ctr?: number | null
          duration_seconds?: number | null
          id?: string
          impressions?: number | null
          like_count?: number | null
          media_type?: string | null
          media_url?: string | null
          owner_username?: string | null
          post_url?: string
          raw_data?: Json | null
          scrape_status?: string
          scraped_at?: string | null
          share_count?: number | null
          shortcode?: string | null
          subscribers_gained?: number | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          video_id?: string | null
          view_count?: number | null
          watch_time_hours?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      ci_weekly_ranking: {
        Row: {
          avg_engagement: number | null
          composite_score: number | null
          is_self: boolean | null
          name: string | null
          slug: string | null
          total_followers: number | null
          trend_7d: number | null
          weekly_delta: number | null
        }
        Relationships: []
      }
      daily_engagement: {
        Row: {
          comments: number | null
          day: string | null
          interactions: number | null
          likes: number | null
          platform: string | null
          posts: number | null
          shares: number | null
          views: number | null
        }
        Relationships: []
      }
      gsc_brand_split: {
        Row: {
          brand_clicks: number | null
          brand_impressions: number | null
          brand_share_pct: number | null
          date: string | null
          nonbrand_clicks: number | null
          nonbrand_impressions: number | null
          site_url: string | null
        }
        Relationships: []
      }
      gsc_weekly: {
        Row: {
          avg_position: number | null
          clicks: number | null
          ctr_pct: number | null
          impressions: number | null
          site_url: string | null
          week_start: string | null
        }
        Relationships: []
      }
      unified_posts: {
        Row: {
          ai_analysis: Json | null
          caption: string | null
          comments_count: number | null
          id: string | null
          like_count: number | null
          media_type: string | null
          platform: string | null
          post_url: string | null
          scrape_status: string | null
          share_count: number | null
          thumbnail_url: string | null
          timestamp: string | null
          view_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      build_audience_aggregates: { Args: { _days?: number }; Returns: Json }
      get_audience_aggregates: {
        Args: { _days?: number; _ttl_minutes?: number }
        Returns: Json
      }
      get_behavior_by_segment: {
        Args: { _days?: number }
        Returns: {
          age_group: string
          channel: string
          cohort: string
          day: string
          event_name: string
          events: number
          identities: number
          region: string
          sessions: number
        }[]
      }
      get_business_portfolio_safe: {
        Args: never
        Returns: {
          city: string
          client_name: string
          distributor_name: string
          has_cnpj: boolean
          segment: string
        }[]
      }
      get_consent_summary: {
        Args: never
        Returns: {
          active_consents: number
          last_granted_at: string
          revoked_consents: number
          total_identities: number
        }[]
      }
      get_my_access: {
        Args: never
        Returns: {
          email: string
          full_name: string
          roles: Database["public"]["Enums"]["app_role"][]
          status: Database["public"]["Enums"]["account_status"]
        }[]
      }
      get_pipeline_health: {
        Args: never
        Returns: {
          failed: number
          last_scraped_at: string
          newest_post: string
          pending: number
          platform: string
          scraped: number
          stale: boolean
          total_posts: number
        }[]
      }
      get_platform_kpis: {
        Args: { _end?: string; _start?: string }
        Returns: {
          avg_interactions_per_post: number
          engagement_rate_pct: number
          follower_count: number
          platform: string
          posts: number
          total_comments: number
          total_interactions: number
          total_likes: number
          total_shares: number
          total_views: number
        }[]
      }
      get_reputation_summary: {
        Args: { _days?: number }
        Returns: {
          answer_rate_pct: number
          answered: number
          avg_rating: number
          avg_response_hours: number
          negatives: number
          neutrals: number
          positives: number
          resolved_rate_pct: number
          reviews: number
          source: string
        }[]
      }
      get_top_posts: {
        Args: {
          _end?: string
          _limit?: number
          _platform?: string
          _start?: string
        }
        Returns: {
          ai_analysis: Json | null
          caption: string | null
          comments_count: number | null
          id: string | null
          like_count: number | null
          media_type: string | null
          platform: string | null
          post_url: string | null
          scrape_status: string | null
          share_count: number | null
          thumbnail_url: string | null
          timestamp: string | null
          view_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "unified_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_wow_growth: {
        Args: never
        Returns: {
          growth_pct: number
          last_week_interactions: number
          platform: string
          this_week_interactions: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invalidate_audience_aggregates: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_approved: { Args: never; Returns: boolean }
      purge_expired_behavior_events: { Args: never; Returns: number }
      run_data_retention: {
        Args: { _triggered_by?: string }
        Returns: {
          consents_deleted: number
          events_deleted: number
          segments_deleted: number
        }[]
      }
      write_audit_log: {
        Args: {
          _action: string
          _area: string
          _details?: Json
          _record_ref?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "viewer"],
    },
  },
} as const
