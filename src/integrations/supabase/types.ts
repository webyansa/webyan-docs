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
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      campaign_audit_log: {
        Row: {
          action: string
          campaign_id: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          campaign_id: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          campaign_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_audit_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_links: {
        Row: {
          campaign_id: string
          click_count: number
          created_at: string
          id: string
          original_url: string
          tracking_code: string
        }
        Insert: {
          campaign_id: string
          click_count?: number
          created_at?: string
          id?: string
          original_url: string
          tracking_code: string
        }
        Update: {
          campaign_id?: string
          click_count?: number
          created_at?: string
          id?: string
          original_url?: string
          tracking_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          click_count: number
          created_at: string
          email_status: Database["public"]["Enums"]["email_send_status"]
          error_message: string | null
          id: string
          last_clicked_at: string | null
          last_opened_at: string | null
          open_count: number
          organization_id: string
          sent_at: string | null
        }
        Insert: {
          campaign_id: string
          click_count?: number
          created_at?: string
          email_status?: Database["public"]["Enums"]["email_send_status"]
          error_message?: string | null
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          open_count?: number
          organization_id: string
          sent_at?: string | null
        }
        Update: {
          campaign_id?: string
          click_count?: number
          created_at?: string
          email_status?: Database["public"]["Enums"]["email_send_status"]
          error_message?: string | null
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          open_count?: number
          organization_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          auto_assign_mode:
            | Database["public"]["Enums"]["auto_assign_mode"]
            | null
          business_hours: Json | null
          business_hours_enabled: boolean | null
          created_at: string
          id: string
          offline_message: string | null
          sound_enabled: boolean | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          auto_assign_mode?:
            | Database["public"]["Enums"]["auto_assign_mode"]
            | null
          business_hours?: Json | null
          business_hours_enabled?: boolean | null
          created_at?: string
          id?: string
          offline_message?: string | null
          sound_enabled?: boolean | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          auto_assign_mode?:
            | Database["public"]["Enums"]["auto_assign_mode"]
            | null
          business_hours?: Json | null
          business_hours_enabled?: boolean | null
          created_at?: string
          id?: string
          offline_message?: string | null
          sound_enabled?: boolean | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      client_accounts: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_primary_contact: boolean
          job_title: string | null
          last_login_at: string | null
          organization_id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          is_primary_contact?: boolean
          job_title?: string | null
          last_login_at?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_primary_contact?: boolean
          job_title?: string | null
          last_login_at?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_api_keys: {
        Row: {
          allowed_domains: string[] | null
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          organization_id: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          allowed_domains?: string[] | null
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          organization_id: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          allowed_domains?: string[] | null
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoices: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          items: Json | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date: string
          id?: string
          invoice_number?: string
          issue_date?: string
          items?: Json | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          items?: Json | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "crm_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_organizations: {
        Row: {
          address: string | null
          assigned_account_manager: string | null
          auto_renewal: boolean | null
          building_number: string | null
          city: string | null
          contact_email: string
          contact_phone: string | null
          converted_from_lead_id: string | null
          created_at: string
          csm_id: string | null
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          customer_value: number | null
          district: string | null
          domain_expiration_date: string | null
          first_contract_date: string | null
          health_score: number | null
          health_status: string | null
          id: string
          internal_notes: string | null
          is_active: boolean
          last_interaction_at: string | null
          lifecycle_stage:
            | Database["public"]["Enums"]["customer_lifecycle_stage"]
            | null
          logo_url: string | null
          monthly_recurring_revenue: number | null
          name: string
          notes: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          postal_code: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          region: string | null
          registration_number: string | null
          renewal_date: string | null
          sales_owner_id: string | null
          secondary_number: string | null
          street_name: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_value: number | null
          success_stage: string | null
          tags: string[] | null
          tax_number: string | null
          total_contract_value: number | null
          updated_at: string
          use_org_contact_info: boolean | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          assigned_account_manager?: string | null
          auto_renewal?: boolean | null
          building_number?: string | null
          city?: string | null
          contact_email: string
          contact_phone?: string | null
          converted_from_lead_id?: string | null
          created_at?: string
          csm_id?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          customer_value?: number | null
          district?: string | null
          domain_expiration_date?: string | null
          first_contract_date?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          last_interaction_at?: string | null
          lifecycle_stage?:
            | Database["public"]["Enums"]["customer_lifecycle_stage"]
            | null
          logo_url?: string | null
          monthly_recurring_revenue?: number | null
          name: string
          notes?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          postal_code?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          region?: string | null
          registration_number?: string | null
          renewal_date?: string | null
          sales_owner_id?: string | null
          secondary_number?: string | null
          street_name?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_value?: number | null
          success_stage?: string | null
          tags?: string[] | null
          tax_number?: string | null
          total_contract_value?: number | null
          updated_at?: string
          use_org_contact_info?: boolean | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          assigned_account_manager?: string | null
          auto_renewal?: boolean | null
          building_number?: string | null
          city?: string | null
          contact_email?: string
          contact_phone?: string | null
          converted_from_lead_id?: string | null
          created_at?: string
          csm_id?: string | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          customer_value?: number | null
          district?: string | null
          domain_expiration_date?: string | null
          first_contract_date?: string | null
          health_score?: number | null
          health_status?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          last_interaction_at?: string | null
          lifecycle_stage?:
            | Database["public"]["Enums"]["customer_lifecycle_stage"]
            | null
          logo_url?: string | null
          monthly_recurring_revenue?: number | null
          name?: string
          notes?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          postal_code?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          region?: string | null
          registration_number?: string | null
          renewal_date?: string | null
          sales_owner_id?: string | null
          secondary_number?: string | null
          street_name?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_value?: number | null
          success_stage?: string | null
          tags?: string[] | null
          tax_number?: string | null
          total_contract_value?: number | null
          updated_at?: string
          use_org_contact_info?: boolean | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_organizations_assigned_account_manager_fkey"
            columns: ["assigned_account_manager"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_organizations_csm_id_fkey"
            columns: ["csm_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_organizations_sales_owner_id_fkey"
            columns: ["sales_owner_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id: string
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_recurring_charges: {
        Row: {
          account_id: string
          annual_amount: number
          created_at: string | null
          first_due_date: string | null
          first_year_free: boolean | null
          id: string
          item_name: string
          project_id: string | null
          quote_id: string | null
          reminder_sent_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          annual_amount?: number
          created_at?: string | null
          first_due_date?: string | null
          first_year_free?: boolean | null
          id?: string
          item_name: string
          project_id?: string | null
          quote_id?: string | null
          reminder_sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          annual_amount?: number
          created_at?: string | null
          first_due_date?: string | null
          first_year_free?: boolean | null
          id?: string
          item_name?: string
          project_id?: string | null
          quote_id?: string | null
          reminder_sent_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_recurring_charges_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_recurring_charges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_recurring_charges_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "crm_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_timeline: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string
          performed_by: string | null
          performed_by_name: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          performed_by?: string | null
          performed_by_name?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          performed_by?: string | null
          performed_by_name?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_timeline_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documentation: {
        Row: {
          account_id: string
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          quote_id: string | null
          signed_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          quote_id?: string | null
          signed_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          quote_id?: string | null
          signed_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documentation_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documentation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documentation_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documentation_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "crm_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_events: {
        Row: {
          conversation_id: string
          created_at: string
          data: Json | null
          event_type: string
          id: string
          performed_by: string | null
          performer_name: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          data?: Json | null
          event_type: string
          id?: string
          performed_by?: string | null
          performer_name?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: string
          performed_by?: string | null
          performer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          attachments: string[] | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          read_at: string | null
          sender_id: string | null
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          attachments?: string[] | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type: string
        }
        Update: {
          attachments?: string[] | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_at: string | null
          assigned_agent_id: string | null
          client_account_id: string | null
          closed_at: string | null
          created_at: string
          embed_token_id: string | null
          id: string
          is_starred: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json | null
          organization_id: string | null
          source: string | null
          source_domain: string | null
          status: Database["public"]["Enums"]["conversation_status"] | null
          subject: string | null
          unread_count: number | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_agent_id?: string | null
          client_account_id?: string | null
          closed_at?: string | null
          created_at?: string
          embed_token_id?: string | null
          id?: string
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          source_domain?: string | null
          status?: Database["public"]["Enums"]["conversation_status"] | null
          subject?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_agent_id?: string | null
          client_account_id?: string | null
          closed_at?: string | null
          created_at?: string
          embed_token_id?: string | null
          id?: string
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          organization_id?: string | null
          source?: string | null
          source_domain?: string | null
          status?: Database["public"]["Enums"]["conversation_status"] | null
          subject?: string | null
          unread_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_embed_token_id_fkey"
            columns: ["embed_token_id"]
            isOneToOne: false
            referencedRelation: "embed_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contracts: {
        Row: {
          account_id: string
          auto_renewal: boolean | null
          billing_frequency: string | null
          contract_document_url: string | null
          contract_number: string
          contract_type: string | null
          contract_value: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string
          id: string
          opportunity_id: string | null
          quote_id: string | null
          renewal_notice_days: number | null
          sent_at: string | null
          signed_at: string | null
          signed_by: string | null
          signed_document_url: string | null
          special_terms: string | null
          start_date: string
          status: string | null
          terms_and_conditions: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          auto_renewal?: boolean | null
          billing_frequency?: string | null
          contract_document_url?: string | null
          contract_number?: string
          contract_type?: string | null
          contract_value: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date: string
          id?: string
          opportunity_id?: string | null
          quote_id?: string | null
          renewal_notice_days?: number | null
          sent_at?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signed_document_url?: string | null
          special_terms?: string | null
          start_date: string
          status?: string | null
          terms_and_conditions?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          auto_renewal?: boolean | null
          billing_frequency?: string | null
          contract_document_url?: string | null
          contract_number?: string
          contract_type?: string | null
          contract_value?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string
          id?: string
          opportunity_id?: string | null
          quote_id?: string | null
          renewal_notice_days?: number | null
          sent_at?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signed_document_url?: string | null
          special_terms?: string | null
          start_date?: string
          status?: string | null
          terms_and_conditions?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contracts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "crm_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_implementations: {
        Row: {
          account_id: string
          actual_end_date: string | null
          actual_start_date: string | null
          admin_password_encrypted: string | null
          admin_url: string | null
          admin_username: string | null
          budget: number | null
          client_contact_id: string | null
          contract_doc_id: string | null
          contract_id: string | null
          created_at: string | null
          csm_id: string | null
          current_phase_id: string | null
          delivery_completed_at: string | null
          delivery_completed_by: string | null
          delivery_notes: string | null
          description: string | null
          expected_delivery_date: string | null
          go_live_date: string | null
          handover_date: string | null
          handover_notes: string | null
          hold_reason: string | null
          hold_started_at: string | null
          hosting_notes: string | null
          hosting_provider: string | null
          id: string
          implementer_id: string | null
          internal_notes: string | null
          milestones: Json | null
          notes: string | null
          opportunity_id: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          priority: string | null
          progress_percentage: number | null
          project_manager_id: string | null
          project_name: string
          project_type: string | null
          quote_id: string | null
          received_date: string | null
          server_ip: string | null
          server_password_encrypted: string | null
          server_url: string | null
          server_username: string | null
          service_completed_at: string | null
          service_completed_by: string | null
          service_started_at: string | null
          service_started_by: string | null
          service_status: string | null
          site_url: string | null
          stage: string | null
          stage_change_reason: string | null
          stage_changed_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          actual_end_date?: string | null
          actual_start_date?: string | null
          admin_password_encrypted?: string | null
          admin_url?: string | null
          admin_username?: string | null
          budget?: number | null
          client_contact_id?: string | null
          contract_doc_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          csm_id?: string | null
          current_phase_id?: string | null
          delivery_completed_at?: string | null
          delivery_completed_by?: string | null
          delivery_notes?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          go_live_date?: string | null
          handover_date?: string | null
          handover_notes?: string | null
          hold_reason?: string | null
          hold_started_at?: string | null
          hosting_notes?: string | null
          hosting_provider?: string | null
          id?: string
          implementer_id?: string | null
          internal_notes?: string | null
          milestones?: Json | null
          notes?: string | null
          opportunity_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          priority?: string | null
          progress_percentage?: number | null
          project_manager_id?: string | null
          project_name: string
          project_type?: string | null
          quote_id?: string | null
          received_date?: string | null
          server_ip?: string | null
          server_password_encrypted?: string | null
          server_url?: string | null
          server_username?: string | null
          service_completed_at?: string | null
          service_completed_by?: string | null
          service_started_at?: string | null
          service_started_by?: string | null
          service_status?: string | null
          site_url?: string | null
          stage?: string | null
          stage_change_reason?: string | null
          stage_changed_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          actual_end_date?: string | null
          actual_start_date?: string | null
          admin_password_encrypted?: string | null
          admin_url?: string | null
          admin_username?: string | null
          budget?: number | null
          client_contact_id?: string | null
          contract_doc_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          csm_id?: string | null
          current_phase_id?: string | null
          delivery_completed_at?: string | null
          delivery_completed_by?: string | null
          delivery_notes?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          go_live_date?: string | null
          handover_date?: string | null
          handover_notes?: string | null
          hold_reason?: string | null
          hold_started_at?: string | null
          hosting_notes?: string | null
          hosting_provider?: string | null
          id?: string
          implementer_id?: string | null
          internal_notes?: string | null
          milestones?: Json | null
          notes?: string | null
          opportunity_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          priority?: string | null
          progress_percentage?: number | null
          project_manager_id?: string | null
          project_name?: string
          project_type?: string | null
          quote_id?: string | null
          received_date?: string | null
          server_ip?: string | null
          server_password_encrypted?: string | null
          server_url?: string | null
          server_username?: string | null
          service_completed_at?: string | null
          service_completed_by?: string | null
          service_started_at?: string | null
          service_started_by?: string | null
          service_status?: string | null
          site_url?: string | null
          stage?: string | null
          stage_change_reason?: string | null
          stage_changed_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_implementations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_client_contact_id_fkey"
            columns: ["client_contact_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_contract_doc_id_fkey"
            columns: ["contract_doc_id"]
            isOneToOne: false
            referencedRelation: "contract_documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "crm_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_csm_id_fkey"
            columns: ["csm_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_delivery_completed_by_fkey"
            columns: ["delivery_completed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_implementer_id_fkey"
            columns: ["implementer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_project_manager_id_fkey"
            columns: ["project_manager_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "crm_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_service_completed_by_fkey"
            columns: ["service_completed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_service_started_by_fkey"
            columns: ["service_started_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_implementations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          converted_at: string | null
          converted_to_account_id: string | null
          created_at: string | null
          estimated_value: number | null
          id: string
          is_converted: boolean | null
          last_activity_at: string | null
          lead_source: string
          lead_type: string | null
          lost_reason: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          owner_id: string | null
          source_details: string | null
          stage: string | null
          stage_change_reason: string | null
          stage_changed_at: string | null
          tags: string[] | null
          updated_at: string | null
          utm_campaign: string | null
          utm_source: string | null
          website_url: string | null
        }
        Insert: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          converted_at?: string | null
          converted_to_account_id?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          is_converted?: boolean | null
          last_activity_at?: string | null
          lead_source?: string
          lead_type?: string | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          owner_id?: string | null
          source_details?: string | null
          stage?: string | null
          stage_change_reason?: string | null
          stage_changed_at?: string | null
          tags?: string[] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
          website_url?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          converted_at?: string | null
          converted_to_account_id?: string | null
          created_at?: string | null
          estimated_value?: number | null
          id?: string
          is_converted?: boolean | null
          last_activity_at?: string | null
          lead_source?: string
          lead_type?: string | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          owner_id?: string | null
          source_details?: string | null
          stage?: string | null
          stage_change_reason?: string | null
          stage_changed_at?: string | null
          tags?: string[] | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_converted_to_account_id_fkey"
            columns: ["converted_to_account_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          account_id: string
          actual_close_date: string | null
          competitor: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          expected_close_date: string | null
          expected_value: number
          id: string
          lost_reason: string | null
          name: string
          next_step: string | null
          notes: string | null
          opportunity_type: string | null
          owner_id: string | null
          probability: number | null
          stage: string | null
          stage_change_reason: string | null
          stage_changed_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          actual_close_date?: string | null
          competitor?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_value: number
          id?: string
          lost_reason?: string | null
          name: string
          next_step?: string | null
          notes?: string | null
          opportunity_type?: string | null
          owner_id?: string | null
          probability?: number | null
          stage?: string | null
          stage_change_reason?: string | null
          stage_changed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          actual_close_date?: string | null
          competitor?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_value?: number
          id?: string
          lost_reason?: string | null
          name?: string
          next_step?: string | null
          notes?: string | null
          opportunity_type?: string | null
          owner_id?: string | null
          probability?: number | null
          stage?: string | null
          stage_change_reason?: string | null
          stage_changed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunity_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          opportunity_id: string
          performed_by: string | null
          performed_by_name: string | null
          title: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          opportunity_id: string
          performed_by?: string | null
          performed_by_name?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          opportunity_id?: string
          performed_by?: string | null
          performed_by_name?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunity_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunity_activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quotes: {
        Row: {
          accepted_at: string | null
          account_id: string
          approved_by: string | null
          billing_cycle: string | null
          client_approved: boolean | null
          client_approved_at: string | null
          client_rejection_reason: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          discount_type: string | null
          discount_value: number | null
          document_url: string | null
          id: string
          invoice_sent_to_client: boolean | null
          invoice_sent_to_client_at: string | null
          invoice_status: string | null
          items: Json | null
          notes: string | null
          opportunity_id: string | null
          payment_amount: number | null
          payment_bank_name: string | null
          payment_confirmed: boolean | null
          payment_confirmed_at: string | null
          payment_date: string | null
          payment_notes: string | null
          payment_status: string | null
          payment_transfer_number: string | null
          plan_id: string | null
          project_id: string | null
          project_name: string | null
          quote_number: string
          quote_type: string | null
          recurring_items: Json | null
          rejected_at: string | null
          rejection_reason: string | null
          sent_at: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          tax_inclusive: boolean | null
          tax_rate: number | null
          terms_and_conditions: string | null
          title: string
          total_amount: number
          updated_at: string | null
          valid_until: string | null
          validity_days: number | null
          version: number | null
        }
        Insert: {
          accepted_at?: string | null
          account_id: string
          approved_by?: string | null
          billing_cycle?: string | null
          client_approved?: boolean | null
          client_approved_at?: string | null
          client_rejection_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_type?: string | null
          discount_value?: number | null
          document_url?: string | null
          id?: string
          invoice_sent_to_client?: boolean | null
          invoice_sent_to_client_at?: string | null
          invoice_status?: string | null
          items?: Json | null
          notes?: string | null
          opportunity_id?: string | null
          payment_amount?: number | null
          payment_bank_name?: string | null
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          payment_date?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          payment_transfer_number?: string | null
          plan_id?: string | null
          project_id?: string | null
          project_name?: string | null
          quote_number?: string
          quote_type?: string | null
          recurring_items?: Json | null
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          terms_and_conditions?: string | null
          title: string
          total_amount: number
          updated_at?: string | null
          valid_until?: string | null
          validity_days?: number | null
          version?: number | null
        }
        Update: {
          accepted_at?: string | null
          account_id?: string
          approved_by?: string | null
          billing_cycle?: string | null
          client_approved?: boolean | null
          client_approved_at?: string | null
          client_rejection_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_type?: string | null
          discount_value?: number | null
          document_url?: string | null
          id?: string
          invoice_sent_to_client?: boolean | null
          invoice_sent_to_client_at?: string | null
          invoice_status?: string | null
          items?: Json | null
          notes?: string | null
          opportunity_id?: string | null
          payment_amount?: number | null
          payment_bank_name?: string | null
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          payment_date?: string | null
          payment_notes?: string | null
          payment_status?: string | null
          payment_transfer_number?: string | null
          plan_id?: string | null
          project_id?: string | null
          project_name?: string | null
          quote_number?: string
          quote_type?: string | null
          recurring_items?: Json | null
          rejected_at?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_inclusive?: boolean | null
          tax_rate?: number | null
          terms_and_conditions?: string | null
          title?: string
          total_amount?: number
          updated_at?: string | null
          valid_until?: string | null
          validity_days?: number | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stage_transitions: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          from_stage: string
          id: string
          notes: string | null
          performed_by: string | null
          performed_by_name: string | null
          pipeline_type: string
          reason: string | null
          to_stage: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          from_stage: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          pipeline_type: string
          reason?: string | null
          to_stage: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          from_stage?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          pipeline_type?: string
          reason?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stage_transitions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_systems: {
        Row: {
          access_log: Json | null
          access_status: string | null
          account_id: string
          admin_url: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          password_encrypted: string | null
          system_type: string
          updated_at: string | null
          url: string | null
          username: string | null
        }
        Insert: {
          access_log?: Json | null
          access_status?: string | null
          account_id: string
          admin_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          password_encrypted?: string | null
          system_type: string
          updated_at?: string | null
          url?: string | null
          username?: string | null
        }
        Update: {
          access_log?: Json | null
          access_status?: string | null
          account_id?: string
          admin_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          password_encrypted?: string | null
          system_type?: string
          updated_at?: string | null
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_systems_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          note_type: string | null
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          note_type?: string | null
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          note_type?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docs_article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "docs_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_article_versions: {
        Row: {
          article_id: string
          change_summary: string | null
          changed_by: string | null
          content: string | null
          created_at: string
          id: string
          steps: Json | null
          title: string
          version: number
        }
        Insert: {
          article_id: string
          change_summary?: string | null
          changed_by?: string | null
          content?: string | null
          created_at?: string
          id?: string
          steps?: Json | null
          title: string
          version: number
        }
        Update: {
          article_id?: string
          change_summary?: string | null
          changed_by?: string | null
          content?: string | null
          created_at?: string
          id?: string
          steps?: Json | null
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "docs_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_articles: {
        Row: {
          author_id: string | null
          common_errors: Json | null
          content: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          faqs: Json | null
          id: string
          notes: string[] | null
          objective: string | null
          prerequisites: string[] | null
          published_at: string | null
          related_articles: string[] | null
          reviewer_id: string | null
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["article_status"] | null
          steps: Json | null
          submodule_id: string
          target_roles: string[] | null
          title: string
          updated_at: string
          version: number | null
          views_count: number | null
          warnings: string[] | null
        }
        Insert: {
          author_id?: string | null
          common_errors?: Json | null
          content?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          faqs?: Json | null
          id?: string
          notes?: string[] | null
          objective?: string | null
          prerequisites?: string[] | null
          published_at?: string | null
          related_articles?: string[] | null
          reviewer_id?: string | null
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["article_status"] | null
          steps?: Json | null
          submodule_id: string
          target_roles?: string[] | null
          title: string
          updated_at?: string
          version?: number | null
          views_count?: number | null
          warnings?: string[] | null
        }
        Update: {
          author_id?: string | null
          common_errors?: Json | null
          content?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          faqs?: Json | null
          id?: string
          notes?: string[] | null
          objective?: string | null
          prerequisites?: string[] | null
          published_at?: string | null
          related_articles?: string[] | null
          reviewer_id?: string | null
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["article_status"] | null
          steps?: Json | null
          submodule_id?: string
          target_roles?: string[] | null
          title?: string
          updated_at?: string
          version?: number | null
          views_count?: number | null
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_articles_submodule_id_fkey"
            columns: ["submodule_id"]
            isOneToOne: false
            referencedRelation: "docs_submodules"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_changelog: {
        Row: {
          author_id: string | null
          changes: Json | null
          created_at: string
          description: string | null
          id: string
          impact: string | null
          published_at: string | null
          title: string
          version: string
        }
        Insert: {
          author_id?: string | null
          changes?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          published_at?: string | null
          title: string
          version: string
        }
        Update: {
          author_id?: string | null
          changes?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          impact?: string | null
          published_at?: string | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      docs_feedback: {
        Row: {
          article_id: string
          comment: string | null
          created_at: string
          id: string
          is_helpful: boolean
          reason: string | null
          user_id: string | null
        }
        Insert: {
          article_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful: boolean
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful?: boolean
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_issue_reports: {
        Row: {
          article_id: string | null
          created_at: string
          description: string
          id: string
          issue_type: string
          reporter_email: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          description: string
          id?: string
          issue_type: string
          reporter_email?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string | null
          created_at?: string
          description?: string
          id?: string
          issue_type?: string
          reporter_email?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_issue_reports_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_media: {
        Row: {
          alt_text: string | null
          article_id: string | null
          created_at: string
          filename: string
          id: string
          mime_type: string
          original_name: string
          size_bytes: number | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          article_id?: string | null
          created_at?: string
          filename: string
          id?: string
          mime_type: string
          original_name: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          article_id?: string | null
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          original_name?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_media_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_modules: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      docs_search_logs: {
        Row: {
          created_at: string
          id: string
          query: string
          results_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          results_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          results_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      docs_submodules: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean | null
          module_id: string
          slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          module_id: string
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          module_id?: string
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_submodules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "docs_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      email_engagement_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["engagement_event_type"]
          id: string
          ip_address: string | null
          link_url: string | null
          organization_id: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["engagement_event_type"]
          id?: string
          ip_address?: string | null
          link_url?: string | null
          organization_id: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["engagement_event_type"]
          id?: string
          ip_address?: string | null
          link_url?: string | null
          organization_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_engagement_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_engagement_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          method: string
          recipient_email: string
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_type?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          method: string
          recipient_email: string
          sent_by?: string | null
          status: string
          subject: string
        }
        Update: {
          created_at?: string
          email_type?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          method?: string
          recipient_email?: string
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      embed_tokens: {
        Row: {
          allowed_domains: string[] | null
          created_at: string
          created_by: string | null
          default_message: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          token: string
          token_type: string | null
          updated_at: string
          usage_count: number | null
          welcome_message: string | null
        }
        Insert: {
          allowed_domains?: string[] | null
          created_at?: string
          created_by?: string | null
          default_message?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          token: string
          token_type?: string | null
          updated_at?: string
          usage_count?: number | null
          welcome_message?: string | null
        }
        Update: {
          allowed_domains?: string[] | null
          created_at?: string
          created_by?: string | null
          default_message?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          token?: string
          token_type?: string | null
          updated_at?: string
          usage_count?: number | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embed_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_settings: {
        Row: {
          created_at: string
          escalation_hours: number
          id: string
          is_active: boolean | null
          notify_admin: boolean | null
          notify_staff: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalation_hours?: number
          id?: string
          is_active?: boolean | null
          notify_admin?: boolean | null
          notify_staff?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalation_hours?: number
          id?: string
          is_active?: boolean | null
          notify_admin?: boolean | null
          notify_staff?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      invoice_requests: {
        Row: {
          confirmed_at: string | null
          confirmed_by_name: string | null
          created_at: string
          expected_payment_method: string | null
          external_invoice_no: string | null
          id: string
          invoice_file_url: string | null
          issued_at: string | null
          notes_for_accounts: string | null
          organization_id: string
          quote_id: string
          request_number: string
          resend_reason: string | null
          sent_at: string
          sent_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          expected_payment_method?: string | null
          external_invoice_no?: string | null
          id?: string
          invoice_file_url?: string | null
          issued_at?: string | null
          notes_for_accounts?: string | null
          organization_id: string
          quote_id: string
          request_number: string
          resend_reason?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by_name?: string | null
          created_at?: string
          expected_payment_method?: string | null
          external_invoice_no?: string | null
          id?: string
          invoice_file_url?: string | null
          issued_at?: string | null
          notes_for_accounts?: string | null
          organization_id?: string
          quote_id?: string
          request_number?: string
          resend_reason?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "crm_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_requests_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          audience_filters: Json | null
          audience_type: Database["public"]["Enums"]["campaign_audience_type"]
          batch_delay_ms: number
          batch_size: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_count: number
          goal: Database["public"]["Enums"]["campaign_goal"]
          id: string
          name: string
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          success_count: number
          template_id: string | null
          total_recipients: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience_filters?: Json | null
          audience_type?: Database["public"]["Enums"]["campaign_audience_type"]
          batch_delay_ms?: number
          batch_size?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          goal?: Database["public"]["Enums"]["campaign_goal"]
          id?: string
          name: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          success_count?: number
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience_filters?: Json | null
          audience_type?: Database["public"]["Enums"]["campaign_audience_type"]
          batch_delay_ms?: number
          batch_size?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          goal?: Database["public"]["Enums"]["campaign_goal"]
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          success_count?: number
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_email_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          html_body: string
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables_used: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          html_body?: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables_used?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          html_body?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables_used?: Json | null
        }
        Relationships: []
      }
      marketing_unsubscribes: {
        Row: {
          id: string
          organization_id: string
          reason: string | null
          unsubscribed_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          reason?: string | null
          unsubscribed_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          reason?: string | null
          unsubscribed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_unsubscribes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_activity_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_staff_action: boolean | null
          meeting_id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          performed_by: string | null
          performed_by_name: string | null
          recommendation: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_staff_action?: boolean | null
          meeting_id: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          recommendation?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_staff_action?: boolean | null
          meeting_id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          recommendation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_activity_log_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          meeting_id: string
          organization_id: string
          rated_by: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          meeting_id: string
          organization_id: string
          rated_by?: string | null
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          meeting_id?: string
          organization_id?: string
          rated_by?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_ratings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meeting_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_ratings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_requests: {
        Row: {
          admin_notes: string | null
          alternative_date: string | null
          assigned_staff: string | null
          closure_report: string | null
          confirmed_date: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          meeting_link: string | null
          meeting_outcome: string | null
          meeting_type: string
          organization_id: string
          preferred_date: string
          report_submitted_at: string | null
          requested_by: string | null
          staff_notes: string | null
          staff_recommendation: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          alternative_date?: string | null
          assigned_staff?: string | null
          closure_report?: string | null
          confirmed_date?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          meeting_outcome?: string | null
          meeting_type?: string
          organization_id: string
          preferred_date: string
          report_submitted_at?: string | null
          requested_by?: string | null
          staff_notes?: string | null
          staff_recommendation?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          alternative_date?: string | null
          assigned_staff?: string | null
          closure_report?: string | null
          confirmed_date?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          meeting_outcome?: string | null
          meeting_type?: string
          organization_id?: string
          preferred_date?: string
          report_submitted_at?: string | null
          requested_by?: string | null
          staff_notes?: string | null
          staff_recommendation?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_requests_assigned_staff_fkey"
            columns: ["assigned_staff"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_custom_solutions: {
        Row: {
          base_price: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price_note: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_note?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_note?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_price: number
          name: string
          name_en: string | null
          plan_type: string | null
          sort_order: number | null
          updated_at: string | null
          yearly_discount: number | null
          yearly_price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name: string
          name_en?: string | null
          plan_type?: string | null
          sort_order?: number | null
          updated_at?: string | null
          yearly_discount?: number | null
          yearly_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          name?: string
          name_en?: string | null
          plan_type?: string | null
          sort_order?: number | null
          updated_at?: string | null
          yearly_discount?: number | null
          yearly_price?: number
        }
        Relationships: []
      }
      pricing_services: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          service_type: string | null
          sort_order: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          service_type?: string | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          service_type?: string | null
          sort_order?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          performed_by: string | null
          performed_by_name: string | null
          project_id: string
          title: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          performed_by_name?: string | null
          project_id: string
          title: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          performed_by_name?: string | null
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          completed_by_name: string | null
          completion_notes: string | null
          created_at: string | null
          id: string
          instructions: string | null
          notes: string | null
          phase_description: string | null
          phase_name: string | null
          phase_order: number
          phase_type: string
          project_id: string
          stage_definition_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          completion_notes?: string | null
          created_at?: string | null
          id?: string
          instructions?: string | null
          notes?: string | null
          phase_description?: string | null
          phase_name?: string | null
          phase_order: number
          phase_type: string
          project_id: string
          stage_definition_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          completion_notes?: string | null
          created_at?: string | null
          id?: string
          instructions?: string | null
          notes?: string | null
          phase_description?: string | null
          phase_name?: string | null
          phase_order?: number
          phase_type?: string
          project_id?: string
          stage_definition_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_stage_definition_id_fkey"
            columns: ["stage_definition_id"]
            isOneToOne: false
            referencedRelation: "stage_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_service_notes: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          note: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          note: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          note?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_service_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_service_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sprints: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          goals: string | null
          id: string
          name: string
          project_id: string
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          goals?: string | null
          id?: string
          name: string
          project_id: string
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          goals?: string | null
          id?: string
          name?: string
          project_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sprints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_active: boolean | null
          project_id: string
          role: string
          staff_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          project_id: string
          role: string
          staff_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string
          role?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          name_en: string | null
          phases: Json
          project_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          name_en?: string | null
          phases?: Json
          project_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          name_en?: string | null
          phases?: Json
          project_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          is_global: boolean | null
          shortcut: string | null
          staff_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          staff_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          staff_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          sprint_id: string
          status: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          sprint_id: string
          status?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          sprint_id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "project_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active_conversations_count: number | null
          agent_status: Database["public"]["Enums"]["agent_status"] | null
          assigned_tickets_count: number | null
          can_attend_meetings: boolean
          can_manage_content: boolean
          can_reply_tickets: boolean
          completed_meetings_count: number | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          last_activity_at: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active_conversations_count?: number | null
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          assigned_tickets_count?: number | null
          can_attend_meetings?: boolean
          can_manage_content?: boolean
          can_reply_tickets?: boolean
          completed_meetings_count?: number | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_activity_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active_conversations_count?: number | null
          agent_status?: Database["public"]["Enums"]["agent_status"] | null
          assigned_tickets_count?: number | null
          can_attend_meetings?: boolean
          can_manage_content?: boolean
          can_reply_tickets?: boolean
          completed_meetings_count?: number | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_activity_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      staff_project_history: {
        Row: {
          completed_at: string | null
          id: string
          joined_at: string | null
          performance_notes: string | null
          project_id: string
          role: string
          staff_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          performance_notes?: string | null
          project_id: string
          role: string
          staff_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          performance_notes?: string | null
          project_id?: string
          role?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_project_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_project_history_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_definitions: {
        Row: {
          color: string | null
          created_at: string
          default_order: number
          description: string | null
          estimated_days: number | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          stage_category: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_order?: number
          description?: string | null
          estimated_days?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          stage_category?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          default_order?: number
          description?: string | null
          estimated_days?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          stage_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          current_plan: string | null
          id: string
          notes: string | null
          organization_id: string
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requested_by: string | null
          requested_plan: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          current_plan?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          requested_by?: string | null
          requested_plan: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          current_plan?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          requested_by?: string | null
          requested_plan?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_note: string | null
          assigned_to: string | null
          assigned_to_staff: string | null
          category: string
          closure_report: string | null
          created_at: string
          description: string
          escalated_at: string | null
          escalation_reason: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          implementation_id: string | null
          is_escalated: boolean | null
          organization_id: string | null
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          screenshot_url: string | null
          source: string | null
          source_domain: string | null
          staff_status: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          admin_note?: string | null
          assigned_to?: string | null
          assigned_to_staff?: string | null
          category?: string
          closure_report?: string | null
          created_at?: string
          description: string
          escalated_at?: string | null
          escalation_reason?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          implementation_id?: string | null
          is_escalated?: boolean | null
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          source?: string | null
          source_domain?: string | null
          staff_status?: string | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          admin_note?: string | null
          assigned_to?: string | null
          assigned_to_staff?: string | null
          category?: string
          closure_report?: string | null
          created_at?: string
          description?: string
          escalated_at?: string | null
          escalation_reason?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          implementation_id?: string | null
          is_escalated?: boolean | null
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          source?: string | null
          source_domain?: string | null
          staff_status?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_staff_fkey"
            columns: ["assigned_to_staff"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_implementation_id_fkey"
            columns: ["implementation_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "client_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      template_stages: {
        Row: {
          created_at: string
          estimated_days: number | null
          id: string
          stage_definition_id: string
          stage_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          estimated_days?: number | null
          id?: string
          stage_definition_id: string
          stage_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          estimated_days?: number | null
          id?: string
          stage_definition_id?: string
          stage_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_stages_stage_definition_id_fkey"
            columns: ["stage_definition_id"]
            isOneToOne: false
            referencedRelation: "stage_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_activity_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_staff_action: boolean | null
          new_value: string | null
          note: string | null
          old_value: string | null
          performed_by: string | null
          performed_by_name: string | null
          ticket_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_staff_action?: boolean | null
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          ticket_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_staff_action?: boolean | null
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activity_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_replies: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_staff_reply: boolean
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean
          updated_at: string
          user_id: string
          user_name: string | null
          user_type: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
          user_name?: string | null
          user_type: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
          user_name?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          action_details: string | null
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_details?: string | null
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_details?: string | null
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          article_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "docs_articles"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      website_api_tokens: {
        Row: {
          created_at: string | null
          domain: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          token_hash: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          token_hash: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          token_hash?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      website_form_submissions: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          city: string | null
          contact_name: string
          contacted_at: string | null
          converted_at: string | null
          created_at: string | null
          email: string
          form_type: string
          id: string
          interest_type: string | null
          ip_address: string | null
          lead_id: string | null
          notes: string | null
          opportunity_id: string | null
          organization_name: string
          organization_size: string | null
          phone: string | null
          source: string | null
          source_page: string | null
          status: string
          submission_number: string
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          city?: string | null
          contact_name: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          email: string
          form_type?: string
          id?: string
          interest_type?: string | null
          ip_address?: string | null
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          organization_name: string
          organization_size?: string | null
          phone?: string | null
          source?: string | null
          source_page?: string | null
          status?: string
          submission_number: string
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          city?: string | null
          contact_name?: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          email?: string
          form_type?: string
          id?: string
          interest_type?: string | null
          ip_address?: string | null
          lead_id?: string | null
          notes?: string | null
          opportunity_id?: string | null
          organization_name?: string
          organization_size?: string | null
          phone?: string | null
          source?: string | null
          source_page?: string | null
          status?: string
          submission_number?: string
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_form_submissions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_form_submissions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_phases: {
        Row: {
          created_at: string | null
          id: string
          instructions: string | null
          phase_key: string
          phase_name: string
          phase_order: number
          suggested_role: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          phase_key: string
          phase_name: string
          phase_order: number
          suggested_role?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          phase_key?: string
          phase_name?: string
          phase_order?: number
          suggested_role?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_phases_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          project_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          project_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          project_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      phase_performance_stats: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          hours_to_complete: number | null
          phase_type: string | null
          project_id: string | null
          staff_name: string | null
          started_at: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "crm_implementations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_available_agent: {
        Args: { p_mode: Database["public"]["Enums"]["auto_assign_mode"] }
        Returns: string
      }
      get_client_organization: { Args: { _user_id: string }; Returns: string }
      get_staff_permissions: {
        Args: { _user_id: string }
        Returns: {
          can_attend_meetings: boolean
          can_manage_content: boolean
          can_reply_tickets: boolean
          staff_id: string
        }[]
      }
      get_user_type: {
        Args: { _user_id: string }
        Returns: {
          can_attend_meetings: boolean
          can_manage_content: boolean
          can_reply_tickets: boolean
          client_id: string
          display_name: string
          organization_id: string
          role_name: string
          staff_id: string
          user_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_editor: { Args: { _user_id: string }; Returns: boolean }
      is_client: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_support_agent: { Args: { _user_id: string }; Returns: boolean }
      log_client_timeline_event: {
        Args: {
          p_description?: string
          p_event_type: string
          p_metadata?: Json
          p_organization_id: string
          p_performed_by?: string
          p_performed_by_name?: string
          p_reference_id?: string
          p_reference_type?: string
          p_title: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          p_action_details?: string
          p_action_type: string
          p_metadata?: Json
          p_user_email: string
          p_user_id: string
          p_user_name: string
        }
        Returns: string
      }
    }
    Enums: {
      agent_status: "available" | "busy" | "offline"
      app_role: "admin" | "editor" | "support_agent" | "client"
      article_status: "draft" | "published" | "archived"
      auto_assign_mode: "disabled" | "round_robin" | "least_active" | "by_team"
      campaign_audience_type: "segment" | "manual"
      campaign_goal: "renewal" | "incentive" | "education" | "upgrade" | "alert"
      campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "completed"
        | "paused"
        | "cancelled"
      conversation_status: "unassigned" | "assigned" | "closed"
      customer_lifecycle_stage:
        | "prospect"
        | "negotiating"
        | "onboarding"
        | "active"
        | "suspended"
        | "churned"
      customer_type: "subscription" | "custom_platform" | "services"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      email_send_status: "pending" | "sent" | "delivered" | "failed" | "bounced"
      engagement_event_type: "open" | "click" | "bounce" | "unsubscribe"
      meeting_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rescheduled"
      organization_type:
        | "charity"
        | "nonprofit"
        | "foundation"
        | "cooperative"
        | "other"
      subscription_status:
        | "trial"
        | "active"
        | "pending_renewal"
        | "expired"
        | "cancelled"
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
      agent_status: ["available", "busy", "offline"],
      app_role: ["admin", "editor", "support_agent", "client"],
      article_status: ["draft", "published", "archived"],
      auto_assign_mode: ["disabled", "round_robin", "least_active", "by_team"],
      campaign_audience_type: ["segment", "manual"],
      campaign_goal: ["renewal", "incentive", "education", "upgrade", "alert"],
      campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "completed",
        "paused",
        "cancelled",
      ],
      conversation_status: ["unassigned", "assigned", "closed"],
      customer_lifecycle_stage: [
        "prospect",
        "negotiating",
        "onboarding",
        "active",
        "suspended",
        "churned",
      ],
      customer_type: ["subscription", "custom_platform", "services"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      email_send_status: ["pending", "sent", "delivered", "failed", "bounced"],
      engagement_event_type: ["open", "click", "bounce", "unsubscribe"],
      meeting_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "rescheduled",
      ],
      organization_type: [
        "charity",
        "nonprofit",
        "foundation",
        "cooperative",
        "other",
      ],
      subscription_status: [
        "trial",
        "active",
        "pending_renewal",
        "expired",
        "cancelled",
      ],
    },
  },
} as const
