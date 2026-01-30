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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          barbershop_id: string | null
          client_name: string
          client_phone: string
          created_at: string
          id: string
          notes: string | null
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          barbershop_id?: string | null
          client_name: string
          client_phone: string
          created_at?: string
          id?: string
          notes?: string | null
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barber_id?: string
          barbershop_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          id?: string
          notes?: string | null
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_accounts: {
        Row: {
          approval_status: string
          barber_id: string | null
          barbershop_id: string | null
          barbershop_name: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approval_status?: string
          barber_id?: string | null
          barbershop_id?: string | null
          barbershop_name?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approval_status?: string
          barber_id?: string | null
          barbershop_id?: string | null
          barbershop_name?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_accounts_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_accounts_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_services: {
        Row: {
          barber_id: string
          id: string
          service_id: string
        }
        Insert: {
          barber_id: string
          id?: string
          service_id: string
        }
        Update: {
          barber_id?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          active: boolean
          barbershop_id: string | null
          created_at: string
          has_app_access: boolean | null
          id: string
          name: string
          phone: string | null
          specialty: string | null
          updated_at: string
          working_hours: Json | null
        }
        Insert: {
          active?: boolean
          barbershop_id?: string | null
          created_at?: string
          has_app_access?: boolean | null
          id?: string
          name: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          working_hours?: Json | null
        }
        Update: {
          active?: boolean
          barbershop_id?: string | null
          created_at?: string
          has_app_access?: boolean | null
          id?: string
          name?: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          active: boolean
          approval_status: string
          background_color: string
          background_image_url: string | null
          background_overlay_level: string | null
          business_type: string
          cleanup_buffer_minutes: number
          closing_time: string | null
          created_at: string
          emola_number: string | null
          id: string
          logo_url: string | null
          mpesa_number: string | null
          name: string
          opening_time: string | null
          owner_email: string | null
          payment_methods_enabled: string[] | null
          payment_required: boolean
          prep_buffer_minutes: number
          primary_color: string
          secondary_color: string
          slot_interval_minutes: number
          slug: string
          text_color: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          active?: boolean
          approval_status?: string
          background_color?: string
          background_image_url?: string | null
          background_overlay_level?: string | null
          business_type?: string
          cleanup_buffer_minutes?: number
          closing_time?: string | null
          created_at?: string
          emola_number?: string | null
          id?: string
          logo_url?: string | null
          mpesa_number?: string | null
          name: string
          opening_time?: string | null
          owner_email?: string | null
          payment_methods_enabled?: string[] | null
          payment_required?: boolean
          prep_buffer_minutes?: number
          primary_color?: string
          secondary_color?: string
          slot_interval_minutes?: number
          slug: string
          text_color?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          active?: boolean
          approval_status?: string
          background_color?: string
          background_image_url?: string | null
          background_overlay_level?: string | null
          business_type?: string
          cleanup_buffer_minutes?: number
          closing_time?: string | null
          created_at?: string
          emola_number?: string | null
          id?: string
          logo_url?: string | null
          mpesa_number?: string | null
          name?: string
          opening_time?: string | null
          owner_email?: string | null
          payment_methods_enabled?: string[] | null
          payment_required?: boolean
          prep_buffer_minutes?: number
          primary_color?: string
          secondary_color?: string
          slot_interval_minutes?: number
          slug?: string
          text_color?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          barbershop_id: string
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          barbershop_id: string
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          barbershop_id?: string
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      managers: {
        Row: {
          active: boolean
          barbershop_id: string
          created_at: string
          created_by: string
          email: string
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          barbershop_id: string
          created_at?: string
          created_by: string
          email: string
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          barbershop_id?: string
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_confirmations: {
        Row: {
          amount_detected: number | null
          amount_expected: number
          appointment_id: string
          barbershop_id: string
          confirmation_text: string
          created_at: string
          id: string
          payment_method: string
          phone_detected: string | null
          phone_expected: string | null
          reject_reason: string | null
          status: string
          transaction_code: string
        }
        Insert: {
          amount_detected?: number | null
          amount_expected: number
          appointment_id: string
          barbershop_id: string
          confirmation_text: string
          created_at?: string
          id?: string
          payment_method: string
          phone_detected?: string | null
          phone_expected?: string | null
          reject_reason?: string | null
          status?: string
          transaction_code: string
        }
        Update: {
          amount_detected?: number | null
          amount_expected?: number
          appointment_id?: string
          barbershop_id?: string
          confirmation_text?: string
          created_at?: string
          id?: string
          payment_method?: string
          phone_detected?: string | null
          phone_expected?: string | null
          reject_reason?: string | null
          status?: string
          transaction_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_confirmations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmations_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_attendance: {
        Row: {
          attendance_date: string
          barber_id: string
          barbershop_id: string
          created_at: string | null
          id: string
          marked_at: string | null
          marked_by: string | null
          status: string
        }
        Insert: {
          attendance_date?: string
          barber_id: string
          barbershop_id: string
          created_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          status?: string
        }
        Update: {
          attendance_date?: string
          barber_id?: string
          barbershop_id?: string
          created_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_attendance_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_schedules: {
        Row: {
          barber_id: string
          barbershop_id: string
          break_end: string | null
          break_start: string | null
          created_at: string | null
          day_of_week: number
          end_time: string | null
          id: string
          is_working_day: boolean | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          break_end?: string | null
          break_start?: string | null
          created_at?: string | null
          day_of_week: number
          end_time?: string | null
          id?: string
          is_working_day?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          break_end?: string | null
          break_start?: string | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_working_day?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_schedules_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_time_off: {
        Row: {
          barber_id: string
          barbershop_id: string
          created_at: string | null
          id: string
          off_date: string
          reason: string | null
        }
        Insert: {
          barber_id: string
          barbershop_id: string
          created_at?: string | null
          id?: string
          off_date: string
          reason?: string | null
        }
        Update: {
          barber_id?: string
          barbershop_id?: string
          created_at?: string | null
          id?: string
          off_date?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_time_off_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      service_images: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          image_url: string
          is_cover: boolean
          service_id: string
          sort_order: number
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          image_url: string
          is_cover?: boolean
          service_id: string
          sort_order?: number
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_cover?: boolean
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_professionals: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          professional_id: string
          service_id: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          professional_id: string
          service_id: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_professionals_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_professionals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_professionals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          allowed_business_types: string[]
          barbershop_id: string | null
          created_at: string
          duration: number
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_business_types?: string[]
          barbershop_id?: string | null
          created_at?: string
          duration?: number
          id?: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_business_types?: string[]
          barbershop_id?: string | null
          created_at?: string
          duration?: number
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          barbershop_id: string
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          plan_name: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          barbershop_id: string
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_name?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          barbershop_id?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          plan_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          barbershop_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          barbershop_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          barbershop_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_client_data: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      create_barbershop: {
        Args: {
          p_background_color?: string
          p_business_type?: string
          p_logo_url?: string
          p_name: string
          p_owner_email?: string
          p_primary_color?: string
          p_secondary_color?: string
          p_slug: string
          p_text_color?: string
          p_whatsapp_number?: string
        }
        Returns: string
      }
      create_public_appointment: {
        Args: {
          p_appointment_date: string
          p_appointment_time: string
          p_barber_id: string
          p_barbershop_id: string
          p_client_name: string
          p_client_phone: string
          p_notes?: string
          p_service_id: string
        }
        Returns: Json
      }
      current_user_barbershop_id: { Args: never; Returns: string }
      get_appointment_stats_for_barbershop: {
        Args: { p_barbershop_id: string; p_date?: string }
        Returns: {
          cancelled_count: number
          completed_count: number
          confirmed_count: number
          pending_count: number
          total_appointments: number
        }[]
      }
      get_appointment_summary_for_professional: {
        Args: { p_barber_id: string; p_date: string }
        Returns: {
          appointment_time: string
          duration: number
          service_name: string
          status: string
        }[]
      }
      get_available_professionals: {
        Args: { p_barbershop_id: string; p_date: string }
        Returns: {
          attendance_status: string
          id: string
          is_day_off: boolean
          name: string
          working_hours: Json
        }[]
      }
      get_barbershop_whatsapp_for_appointment: {
        Args: { p_appointment_id: string }
        Returns: string
      }
      get_professionals_for_service: {
        Args: { p_barbershop_id: string; p_service_id: string }
        Returns: {
          id: string
          name: string
          specialty: string
          working_hours: Json
        }[]
      }
      get_public_appointments_for_day: {
        Args: { p_barber_id: string; p_date: string }
        Returns: {
          appointment_time: string
          service_duration: number
        }[]
      }
      get_public_barbers: {
        Args: { p_barbershop_id: string }
        Returns: {
          id: string
          name: string
          working_hours: Json
        }[]
      }
      get_public_barbershop: {
        Args: { p_slug: string }
        Returns: {
          background_color: string
          background_image_url: string
          background_overlay_level: string
          business_type: string
          cleanup_buffer_minutes: number
          closing_time: string
          emola_number: string
          id: string
          logo_url: string
          mpesa_number: string
          name: string
          opening_time: string
          payment_methods_enabled: string[]
          payment_required: boolean
          prep_buffer_minutes: number
          primary_color: string
          secondary_color: string
          slot_interval_minutes: number
          slug: string
          text_color: string
          whatsapp_number: string
        }[]
      }
      get_public_business: {
        Args: { p_slug: string }
        Returns: {
          background_color: string
          background_image_url: string
          background_overlay_level: string
          business_type: string
          closing_time: string
          id: string
          logo_url: string
          name: string
          opening_time: string
          primary_color: string
          secondary_color: string
          slug: string
          text_color: string
          whatsapp_number: string
        }[]
      }
      get_public_professional_schedules: {
        Args: { p_barbershop_id: string }
        Returns: {
          barber_id: string
          break_end: string
          break_start: string
          day_of_week: number
          end_time: string
          id: string
          is_working_day: boolean
          start_time: string
        }[]
      }
      get_public_professional_time_off: {
        Args: { p_barbershop_id: string }
        Returns: {
          barber_id: string
          id: string
          off_date: string
          reason: string
        }[]
      }
      get_public_professionals: {
        Args: { p_barbershop_id: string }
        Returns: {
          id: string
          name: string
          specialty: string
          working_hours: Json
        }[]
      }
      get_public_professionals_for_service: {
        Args: { p_business_id: string; p_service_id: string }
        Returns: {
          id: string
          name: string
          working_hours: Json
        }[]
      }
      get_public_service_images: {
        Args: { p_service_id: string }
        Returns: {
          id: string
          image_url: string
          is_cover: boolean
          sort_order: number
        }[]
      }
      get_public_service_professionals: {
        Args: { p_barbershop_id: string }
        Returns: {
          id: string
          professional_id: string
          service_id: string
        }[]
      }
      get_public_services: {
        Args: { p_barbershop_id: string }
        Returns: {
          allowed_business_types: string[]
          duration: number
          id: string
          name: string
          price: number
        }[]
      }
      get_service_cover_image: {
        Args: { p_service_id: string }
        Returns: string
      }
      get_service_professional_mappings: {
        Args: { p_barbershop_id: string }
        Returns: {
          professional_id: string
          service_id: string
        }[]
      }
      get_services_cover_images: {
        Args: { p_barbershop_id: string }
        Returns: {
          cover_image_url: string
          service_id: string
        }[]
      }
      get_user_barbershop_id: { Args: { _user_id: string }; Returns: string }
      get_user_business_id: { Args: { _user_id: string }; Returns: string }
      get_valid_services: {
        Args: { p_barbershop_id: string }
        Returns: {
          allowed_business_types: string[]
          duration: number
          id: string
          name: string
          price: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager_of_barbershop: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_approved_barber: { Args: { _user_id: string }; Returns: boolean }
      is_barbershop_admin: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_barbershop_admin_or_manager: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_barbershop_manager: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_barbershop_staff: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_admin: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      rpc_update_appointment_status: {
        Args: { p_appointment_id: string; p_new_status: string }
        Returns: Json
      }
      validate_and_confirm_payment: {
        Args: {
          p_amount_detected?: number
          p_amount_expected: number
          p_appointment_id: string
          p_barbershop_id: string
          p_confirmation_text: string
          p_max_hours?: number
          p_payment_method: string
          p_phone_detected?: string
          p_phone_expected: string
          p_transaction_code: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "barber" | "superadmin" | "manager"
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
      app_role: ["admin", "barber", "superadmin", "manager"],
    },
  },
} as const
