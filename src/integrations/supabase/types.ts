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
      admin_agenda_access: {
        Row: {
          created_at: string
          id: string
          owner_user_id: string
          updated_at: string
          viewer_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id: string
          updated_at?: string
          viewer_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string
          updated_at?: string
          viewer_user_id?: string
        }
        Relationships: []
      }
      agenda_shares: {
        Row: {
          admin_id: string
          artist_ids: string[]
          created_at: string
          expires_at: string | null
          id: string
          month: number
          revoked_at: string | null
          token: string
          year: number
        }
        Insert: {
          admin_id: string
          artist_ids?: string[]
          created_at?: string
          expires_at?: string | null
          id?: string
          month: number
          revoked_at?: string | null
          token: string
          year: number
        }
        Update: {
          admin_id?: string
          artist_ids?: string[]
          created_at?: string
          expires_at?: string | null
          id?: string
          month?: number
          revoked_at?: string | null
          token?: string
          year?: number
        }
        Relationships: []
      }
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_consents: {
        Row: {
          action: string
          consented_at: string
          id: string
          policy_version: string
          purpose: string
          user_id: string
        }
        Insert: {
          action: string
          consented_at?: string
          id?: string
          policy_version: string
          purpose: string
          user_id: string
        }
        Update: {
          action?: string
          consented_at?: string
          id?: string
          policy_version?: string
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      managed_artist_events: {
        Row: {
          address: string | null
          artist_id: string
          banner_path: string | null
          city: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          google_event_id: string | null
          id: string
          is_published: boolean
          maps_url: string | null
          owner_admin_id: string
          slug: string
          starts_at: string
          state: string | null
          status: string
          ticket_url: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          address?: string | null
          artist_id: string
          banner_path?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          google_event_id?: string | null
          id?: string
          is_published?: boolean
          maps_url?: string | null
          owner_admin_id: string
          slug: string
          starts_at: string
          state?: string | null
          status?: string
          ticket_url?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          address?: string | null
          artist_id?: string
          banner_path?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          google_event_id?: string | null
          id?: string
          is_published?: boolean
          maps_url?: string | null
          owner_admin_id?: string
          slug?: string
          starts_at?: string
          state?: string | null
          status?: string
          ticket_url?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managed_artist_events_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "managed_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_artist_media: {
        Row: {
          artist_id: string
          caption: string | null
          created_at: string
          external_url: string | null
          id: string
          is_published: boolean
          kind: string
          owner_admin_id: string
          position: number
          storage_path: string | null
        }
        Insert: {
          artist_id: string
          caption?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          is_published?: boolean
          kind?: string
          owner_admin_id: string
          position?: number
          storage_path?: string | null
        }
        Update: {
          artist_id?: string
          caption?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          is_published?: boolean
          kind?: string
          owner_admin_id?: string
          position?: number
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managed_artist_media_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "managed_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_artists: {
        Row: {
          artist_name: string
          avatar_path: string | null
          bio: string | null
          city: string | null
          contact_email: string | null
          cover_path: string | null
          created_at: string
          genre: string | null
          id: string
          instagram: string | null
          legacy_auth_user_id: string | null
          other_links: Json
          owner_admin_id: string
          phone: string | null
          show_booking_contact: boolean
          slug: string
          soundcloud: string | null
          spotify: string | null
          state: string | null
          status: string
          sua_musica: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          artist_name: string
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          contact_email?: string | null
          cover_path?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          instagram?: string | null
          legacy_auth_user_id?: string | null
          other_links?: Json
          owner_admin_id: string
          phone?: string | null
          show_booking_contact?: boolean
          slug: string
          soundcloud?: string | null
          spotify?: string | null
          state?: string | null
          status?: string
          sua_musica?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          artist_name?: string
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          contact_email?: string | null
          cover_path?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          instagram?: string | null
          legacy_auth_user_id?: string | null
          other_links?: Json
          owner_admin_id?: string
          phone?: string | null
          show_booking_contact?: boolean
          slug?: string
          soundcloud?: string | null
          spotify?: string | null
          state?: string | null
          status?: string
          sua_musica?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          artist_name: string
          avatar_url: string | null
          bio: string | null
          city: string | null
          contact_email: string | null
          cover_fit: string
          cover_url: string | null
          cover_zoom: number
          created_at: string
          genre: string | null
          handle: string | null
          id: string
          instagram: string | null
          phone: string | null
          show_whatsapp: boolean
          soundcloud: string | null
          spotify: string | null
          tiktok: string | null
          twitter: string | null
          updated_at: string
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          artist_name?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          contact_email?: string | null
          cover_fit?: string
          cover_url?: string | null
          cover_zoom?: number
          created_at?: string
          genre?: string | null
          handle?: string | null
          id: string
          instagram?: string | null
          phone?: string | null
          show_whatsapp?: boolean
          soundcloud?: string | null
          spotify?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          artist_name?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          contact_email?: string | null
          cover_fit?: string
          cover_url?: string | null
          cover_zoom?: number
          created_at?: string
          genre?: string | null
          handle?: string | null
          id?: string
          instagram?: string | null
          phone?: string | null
          show_whatsapp?: boolean
          soundcloud?: string | null
          spotify?: string | null
          tiktok?: string | null
          twitter?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "artist" | "admin_master"
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
    Enums: {
      app_role: ["admin", "artist", "admin_master"],
    },
  },
} as const
