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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string
          department: string | null
          full_name: string
          must_change_password: boolean
          password_hash: string
          role: string
          status: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          full_name: string
          must_change_password?: boolean
          password_hash: string
          role: string
          status?: string
          user_id?: string
          username: string
        }
        Update: {
          created_at?: string
          department?: string | null
          full_name?: string
          must_change_password?: boolean
          password_hash?: string
          role?: string
          status?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          target_record: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          target_record?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_record?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          case_id: string
          created_at: string
          date: string
          followup_id: string
          progress_notes: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          date: string
          followup_id?: string
          progress_notes?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          date?: string
          followup_id?: string
          progress_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "risk_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      intervention_forms: {
        Row: {
          advisor_notes: string | null
          case_id: string
          course_strategy: string[] | null
          created_at: string
          id: string
          monitoring_requirements: string[] | null
          root_cause_academic: string[] | null
          root_cause_engagement: string[] | null
          root_cause_external: string[] | null
          support_services: string[] | null
        }
        Insert: {
          advisor_notes?: string | null
          case_id: string
          course_strategy?: string[] | null
          created_at?: string
          id?: string
          monitoring_requirements?: string[] | null
          root_cause_academic?: string[] | null
          root_cause_engagement?: string[] | null
          root_cause_external?: string[] | null
          support_services?: string[] | null
        }
        Update: {
          advisor_notes?: string | null
          case_id?: string
          course_strategy?: string[] | null
          created_at?: string
          id?: string
          monitoring_requirements?: string[] | null
          root_cause_academic?: string[] | null
          root_cause_engagement?: string[] | null
          root_cause_external?: string[] | null
          support_services?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_forms_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "risk_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      outcomes: {
        Row: {
          case_id: string
          cgpa_change: number | null
          created_at: string
          final_outcome: string
          id: string
          other_outcome: string | null
          probation_avoided: boolean | null
          withdrawal_status: boolean | null
        }
        Insert: {
          case_id: string
          cgpa_change?: number | null
          created_at?: string
          final_outcome: string
          id?: string
          other_outcome?: string | null
          probation_avoided?: boolean | null
          withdrawal_status?: boolean | null
        }
        Update: {
          case_id?: string
          cgpa_change?: number | null
          created_at?: string
          final_outcome?: string
          id?: string
          other_outcome?: string | null
          probation_avoided?: boolean | null
          withdrawal_status?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "risk_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      risk_cases: {
        Row: {
          advisor_email: string | null
          aip_status: string
          assigned_advisor: string | null
          assigned_advisor_name: string | null
          campus: string | null
          case_id: string
          cgpa: number | null
          created_date: string
          credits_completed: number | null
          date_of_meeting: string | null
          department: string
          financial_aid: string | null
          major: string | null
          meeting_status: string
          midterm_review_status: string
          outcome_status: string
          risk_category: string
          student_email: string | null
          student_id: string
          student_name: string
          student_phone: string | null
          term_semester: string | null
          updated_at: string
        }
        Insert: {
          advisor_email?: string | null
          aip_status?: string
          assigned_advisor?: string | null
          assigned_advisor_name?: string | null
          campus?: string | null
          case_id?: string
          cgpa?: number | null
          created_date?: string
          credits_completed?: number | null
          date_of_meeting?: string | null
          department: string
          financial_aid?: string | null
          major?: string | null
          meeting_status?: string
          midterm_review_status?: string
          outcome_status?: string
          risk_category: string
          student_email?: string | null
          student_id: string
          student_name: string
          student_phone?: string | null
          term_semester?: string | null
          updated_at?: string
        }
        Update: {
          advisor_email?: string | null
          aip_status?: string
          assigned_advisor?: string | null
          assigned_advisor_name?: string | null
          campus?: string | null
          case_id?: string
          cgpa?: number | null
          created_date?: string
          credits_completed?: number | null
          date_of_meeting?: string | null
          department?: string
          financial_aid?: string | null
          major?: string | null
          meeting_status?: string
          midterm_review_status?: string
          outcome_status?: string
          risk_category?: string
          student_email?: string | null
          student_id?: string
          student_name?: string
          student_phone?: string | null
          term_semester?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_cases_assigned_advisor_fkey"
            columns: ["assigned_advisor"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      students: {
        Row: {
          campus: string
          cgpa: number | null
          created_at: string
          credits_completed: number | null
          department: string
          id: string
          major: string | null
          student_id: string
          student_name: string
        }
        Insert: {
          campus?: string
          cgpa?: number | null
          created_at?: string
          credits_completed?: number | null
          department: string
          id?: string
          major?: string | null
          student_id: string
          student_name: string
        }
        Update: {
          campus?: string
          cgpa?: number | null
          created_at?: string
          credits_completed?: number | null
          department?: string
          id?: string
          major?: string | null
          student_id?: string
          student_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
