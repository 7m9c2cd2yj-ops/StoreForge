/**
 * Database types for the Supabase client. Mirrors
 * `supabase/migrations/*_initial_schema.sql`. Regenerate with
 * `npx supabase gen types typescript --linked > src/lib/database.types.ts`
 * once the project is linked, or keep this file in sync by hand.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProjectStatus = "generating" | "ready" | "failed";
export type UsageType = "store_generation" | "ai_tool";
export type UsageStatus = "reserved" | "consumed" | "refunded";

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          store_name: string;
          niche: string;
          status: ProjectStatus;
          input: Json;
          content: Json | null;
          checklist: Json;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          store_name: string;
          niche?: string;
          status?: ProjectStatus;
          input?: Json;
          content?: Json | null;
          checklist?: Json;
          error_message?: string | null;
        };
        Update: {
          store_name?: string;
          niche?: string;
          status?: ProjectStatus;
          input?: Json;
          content?: Json | null;
          checklist?: Json;
          error_message?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          project_id: string;
          owner_id: string;
          title: string;
          description: string;
          price: number;
          category: string;
          seo: Json;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          owner_id: string;
          title: string;
          description?: string;
          price?: number;
          category?: string;
          seo?: Json;
          position?: number;
        };
        Update: {
          title?: string;
          description?: string;
          price?: number;
          category?: string;
          seo?: Json;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "products_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: "free" | "pro" | "business";
          status: string;
          price_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "free" | "pro" | "business";
          status?: string;
          price_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "free" | "pro" | "business";
          status?: string;
          price_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: { id: string; type: string; processed_at: string };
        Insert: { id: string; type: string; processed_at?: string };
        Update: { type?: string };
        Relationships: [];
      };
      usage_events: {
        Row: {
          id: string;
          user_id: string;
          usage_type: UsageType;
          credits: number;
          status: UsageStatus;
          period_start: string;
          period_end: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      rate_limits: {
        Row: { key: string; window_start: string; count: number };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      reserve_usage: {
        Args: {
          p_user_id: string;
          p_usage_type: UsageType;
          p_credits: number;
          p_limit: number;
          p_period_start: string;
          p_period_end: string;
          p_metadata?: Json;
        };
        Returns: string | null;
      };
      finalize_usage: {
        Args: { p_reservation_id: string; p_status: "consumed" | "refunded" };
        Returns: boolean;
      };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
