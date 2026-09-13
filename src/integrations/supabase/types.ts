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
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string | null
          id: string
          kind: string
          name: string
          parent_id: string | null
          sort_order: number
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          debt_id: string
          group_id: string | null
          id: string
          month: number
          note: string | null
          payment_date: string
          user_id: string | null
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          debt_id: string
          group_id?: string | null
          id?: string
          month: number
          note?: string | null
          payment_date?: string
          user_id?: string | null
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          debt_id?: string
          group_id?: string | null
          id?: string
          month?: number
          note?: string | null
          payment_date?: string
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string
          group_id: string | null
          id: string
          sort_order: number
          start_month: number | null
          start_year: number | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description: string
          group_id?: string | null
          id?: string
          sort_order?: number
          start_month?: number | null
          start_year?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          group_id?: string | null
          id?: string
          sort_order?: number
          start_month?: number | null
          start_year?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          entry_date: string
          group_id: string | null
          id: string
          month: number
          note: string | null
          paid: boolean
          paid_at: string | null
          reminder_sent_0d: boolean
          reminder_sent_1d: boolean
          reminder_sent_2d: boolean
          updated_at: string
          updated_by: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          entry_date?: string
          group_id?: string | null
          id?: string
          month: number
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          reminder_sent_0d?: boolean
          reminder_sent_1d?: boolean
          reminder_sent_2d?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          entry_date?: string
          group_id?: string | null
          id?: string
          month?: number
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          reminder_sent_0d?: boolean
          reminder_sent_1d?: boolean
          reminder_sent_2d?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      family_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string
          invited_email: string
          joined_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_email: string
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_email?: string
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_report_sends: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          recipient_email: string
          report_month: number
          report_year: number
          sent_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          recipient_email: string
          report_month: number
          report_year: number
          sent_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          recipient_email?: string
          report_month?: number
          report_year?: number
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_group_id: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          monthly_csv_email: boolean
          notify_email: boolean
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          active_group_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          monthly_csv_email?: boolean
          notify_email?: boolean
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          active_group_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          monthly_csv_email?: boolean
          notify_email?: boolean
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      recurring_amounts: {
        Row: {
          active: boolean
          amount: number
          category_id: string
          created_at: string
          created_by: string | null
          due_day: number | null
          group_id: string | null
          id: string
          note: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          amount?: number
          category_id: string
          created_at?: string
          created_by?: string | null
          due_day?: number | null
          group_id?: string | null
          id?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          due_day?: number | null
          group_id?: string | null
          id?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_email: { Args: never; Returns: string }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      seed_default_categories: {
        Args: { _user_id: string }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
