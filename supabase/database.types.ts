// =============================================================================
// Supabase 스키마 TypeScript 타입 (자동 생성)
// 재생성: pnpm exec supabase gen types typescript --project-id <ref> > supabase/database.types.ts
//   (또는 Supabase MCP generate_typescript_types)
// EPIC-C(인증) 착수 시 src/lib/supabase 클라이언트에서 import 예정.
// =============================================================================

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      books: {
        Row: {
          chapters: Json
          created_at: string
          description: Json
          external_purchase_url: string
          id: string
          list_price_krw: number | null
          price_krw: number | null
          slug: string
          status: string
          subtitle: Json
          thumbnail_url: string | null
          title: Json
          updated_at: string
        }
        Insert: {
          chapters?: Json
          created_at?: string
          description?: Json
          external_purchase_url: string
          id?: string
          list_price_krw?: number | null
          price_krw?: number | null
          slug: string
          status?: string
          subtitle?: Json
          thumbnail_url?: string | null
          title?: Json
          updated_at?: string
        }
        Update: {
          chapters?: Json
          created_at?: string
          description?: Json
          external_purchase_url?: string
          id?: string
          list_price_krw?: number | null
          price_krw?: number | null
          slug?: string
          status?: string
          subtitle?: Json
          thumbnail_url?: string | null
          title?: Json
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          is_active: boolean
          max_redemptions: number | null
          redeemed_count: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          is_active?: boolean
          max_redemptions?: number | null
          redeemed_count?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          is_active?: boolean
          max_redemptions?: number | null
          redeemed_count?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description: Json
          id: string
          instructor_title: Json
          level: string | null
          list_price_krw: number | null
          price_krw: number
          slug: string
          status: string
          tags: string[]
          thumbnail_url: string | null
          title: Json
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: Json
          id?: string
          instructor_title?: Json
          level?: string | null
          list_price_krw?: number | null
          price_krw?: number
          slug: string
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: Json
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description?: Json
          id?: string
          instructor_title?: Json
          level?: string | null
          list_price_krw?: number | null
          price_krw?: number
          slug?: string
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: Json
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          granted_at: string
          id: string
          order_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          granted_at?: string
          id?: string
          order_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          granted_at?: string
          id?: string
          order_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "admin_course_sales"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter_index: number
          chapter_title: Json
          course_id: string
          created_at: string
          duration_sec: number | null
          id: string
          is_preview: boolean
          mux_asset_id: string | null
          mux_playback_id: string | null
          order_index: number
          title: Json
          updated_at: string
        }
        Insert: {
          chapter_index?: number
          chapter_title?: Json
          course_id: string
          created_at?: string
          duration_sec?: number | null
          id?: string
          is_preview?: boolean
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          order_index?: number
          title?: Json
          updated_at?: string
        }
        Update: {
          chapter_index?: number
          chapter_title?: Json
          course_id?: string
          created_at?: string
          duration_sec?: number | null
          id?: string
          is_preview?: boolean
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          order_index?: number
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "admin_course_sales"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          storage_path: string
          title: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          storage_path: string
          title?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          storage_path?: string
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_krw: number
          coupon_code: string | null
          course_id: string
          created_at: string
          currency: string
          discount_krw: number
          id: string
          paid_at: string | null
          payment_key: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_krw: number
          coupon_code?: string | null
          course_id: string
          created_at?: string
          currency?: string
          discount_krw?: number
          id?: string
          paid_at?: string | null
          payment_key?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_krw?: number
          coupon_code?: string | null
          course_id?: string
          created_at?: string
          currency?: string
          discount_krw?: number
          id?: string
          paid_at?: string | null
          payment_key?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "admin_course_sales"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress: {
        Row: {
          completed: boolean
          lesson_id: string
          updated_at: string
          user_id: string
          watched_sec: number
        }
        Insert: {
          completed?: boolean
          lesson_id: string
          updated_at?: string
          user_id: string
          watched_sec?: number
        }
        Update: {
          completed?: boolean
          lesson_id?: string
          updated_at?: string
          user_id?: string
          watched_sec?: number
        }
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "admin_course_sales"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_course_sales: {
        Row: {
          active_enrollments: number | null
          course_id: string | null
          gross_krw: number | null
          title: Json | null
        }
        Relationships: []
      }
      course_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          description: Json | null
          duration_sec: number | null
          id: string | null
          instructor_title: Json | null
          lesson_count: number | null
          level: string | null
          list_price_krw: number | null
          price_krw: number | null
          rating: number | null
          review_count: number | null
          slug: string | null
          students_count: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: Json | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: Json | null
          duration_sec?: never
          id?: string | null
          instructor_title?: Json | null
          lesson_count?: never
          level?: string | null
          list_price_krw?: number | null
          price_krw?: number | null
          rating?: never
          review_count?: never
          slug?: string | null
          students_count?: never
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: Json | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: Json | null
          duration_sec?: never
          id?: string | null
          instructor_title?: Json | null
          lesson_count?: never
          level?: string | null
          list_price_krw?: number | null
          price_krw?: number | null
          rating?: never
          review_count?: never
          slug?: string | null
          students_count?: never
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      grant_enrollment: {
        Args: { p_course_id: string; p_order_id: string; p_user_id: string }
        Returns: string
      }
      has_course_access: { Args: { p_course_id: string }; Returns: boolean }
      increment_coupon_redemption: {
        Args: { p_code: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      validate_coupon: {
        Args: { p_code: string; p_course_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
