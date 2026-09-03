// AUTO-GENERATED from database/baseline/phase1_2_schema.sql by database/scripts/generate_types_from_baseline.py.
// Phase 1.4 freezes this full 45-table snapshot; do not hand-edit.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          owner_user_id: string
          name: string
          address: string | null
          timezone: string
          locale: string
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          name: string
          address?: string | null
          timezone?: string
          locale?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          name?: string
          address?: string | null
          timezone?: string
          locale?: string
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_memberships: {
        Row: {
          workspace_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          workspace_id: string
          display_name: string
          contact_type: string
          phone: string | null
          email: string | null
          notes: string | null
          status: string
          merged_into_id: string | null
          legacy_id: string | null
          legacy_source: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          display_name: string
          contact_type: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          status?: string
          merged_into_id?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          display_name?: string
          contact_type?: string
          phone?: string | null
          email?: string | null
          notes?: string | null
          status?: string
          merged_into_id?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          workspace_id: string
          legal_name: string
          display_name: string | null
          capital: number | null
          address: string | null
          activities: string | null
          registration_number: string | null
          legal_status: string | null
          primary_contact_id: string | null
          status: string
          merged_into_id: string | null
          legacy_id: string | null
          legacy_source: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          legal_name: string
          display_name?: string | null
          capital?: number | null
          address?: string | null
          activities?: string | null
          registration_number?: string | null
          legal_status?: string | null
          primary_contact_id?: string | null
          status?: string
          merged_into_id?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          legal_name?: string
          display_name?: string | null
          capital?: number | null
          address?: string | null
          activities?: string | null
          registration_number?: string | null
          legal_status?: string | null
          primary_contact_id?: string | null
          status?: string
          merged_into_id?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      company_contacts: {
        Row: {
          id: string
          workspace_id: string
          company_id: string
          contact_id: string
          relation_type: string
          valid_from: string | null
          valid_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          company_id: string
          contact_id: string
          relation_type: string
          valid_from?: string | null
          valid_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          company_id?: string
          contact_id?: string
          relation_type?: string
          valid_from?: string | null
          valid_to?: string | null
          created_at?: string
        }
        Relationships: []
      }
      entity_lifecycle_events: {
        Row: {
          id: string
          workspace_id: string
          entity_type: string
          entity_id: string
          event_type: string
          title: string
          effective_at: string
          recorded_at: string
          note: string | null
          state_snapshot: Json | null
          source: string
          actor_user_id: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          entity_type: string
          entity_id: string
          event_type: string
          title: string
          effective_at: string
          recorded_at?: string
          note?: string | null
          state_snapshot?: Json | null
          source?: string
          actor_user_id?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          entity_type?: string
          entity_id?: string
          event_type?: string
          title?: string
          effective_at?: string
          recorded_at?: string
          note?: string | null
          state_snapshot?: Json | null
          source?: string
          actor_user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          workspace_id: string
          company_id: string
          primary_contact_id: string | null
          type: string
          department: string | null
          status: string
          priority: string
          current_fee: number
          created_at: string
          updated_at: string
          last_activity_at: string
          completed_at: string | null
          archived_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          legacy_id: string | null
          legacy_source: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          company_id: string
          primary_contact_id?: string | null
          type: string
          department?: string | null
          status?: string
          priority?: string
          current_fee: number
          created_at?: string
          updated_at?: string
          last_activity_at?: string
          completed_at?: string | null
          archived_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          company_id?: string
          primary_contact_id?: string | null
          type?: string
          department?: string | null
          status?: string
          priority?: string
          current_fee?: number
          created_at?: string
          updated_at?: string
          last_activity_at?: string
          completed_at?: string | null
          archived_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Relationships: []
      }
      transaction_routes: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string
          station_name: string
          assigned_to_text: string | null
          occurred_at: string
          created_by: string | null
          legacy_id: string | null
          legacy_source: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id: string
          station_name: string
          assigned_to_text?: string | null
          occurred_at?: string
          created_by?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string
          station_name?: string
          assigned_to_text?: string | null
          occurred_at?: string
          created_by?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Relationships: []
      }
      transaction_notes: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string
          body: string
          created_at: string
          created_by: string | null
          legacy_id: string | null
          legacy_source: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id: string
          body: string
          created_at?: string
          created_by?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string
          body?: string
          created_at?: string
          created_by?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Relationships: []
      }
      transaction_followups: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string
          title: string
          due_at: string
          status: string
          created_at: string
          completed_at: string | null
          completed_by: string | null
          snoozed_until: string | null
          legacy_id: string | null
          legacy_source: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id: string
          title: string
          due_at: string
          status?: string
          created_at?: string
          completed_at?: string | null
          completed_by?: string | null
          snoozed_until?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string
          title?: string
          due_at?: string
          status?: string
          created_at?: string
          completed_at?: string | null
          completed_by?: string | null
          snoozed_until?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Relationships: []
      }
      transaction_activity: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string
          event_type: string
          summary: string
          occurred_at: string
          source_entity_type: string | null
          source_entity_id: string | null
          metadata: Json
          actor_user_id: string | null
          legacy_id: string | null
          legacy_source: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id: string
          event_type: string
          summary: string
          occurred_at?: string
          source_entity_type?: string | null
          source_entity_id?: string | null
          metadata?: Json
          actor_user_id?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string
          event_type?: string
          summary?: string
          occurred_at?: string
          source_entity_type?: string | null
          source_entity_id?: string | null
          metadata?: Json
          actor_user_id?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Relationships: []
      }
      transaction_blockers: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string
          title: string
          severity: string
          note: string | null
          status: string
          opened_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id: string
          title: string
          severity: string
          note?: string | null
          status?: string
          opened_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string
          title?: string
          severity?: string
          note?: string | null
          status?: string
          opened_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
      transaction_dependencies: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string
          depends_on_transaction_id: string
          dependency_type: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id: string
          depends_on_transaction_id: string
          dependency_type?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string
          depends_on_transaction_id?: string
          dependency_type?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string
          company_id: string
          amount: number
          method: string
          paid_at: string
          status: string
          receipt_ref: string
          note: string | null
          legacy_id: string | null
          legacy_source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id: string
          company_id: string
          amount: number
          method: string
          paid_at: string
          status?: string
          receipt_ref: string
          note?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string
          company_id?: string
          amount?: number
          method?: string
          paid_at?: string
          status?: string
          receipt_ref?: string
          note?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payment_reversals: {
        Row: {
          id: string
          workspace_id: string
          payment_id: string
          reversed_at: string
          reason: string
          actor_user_id: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          payment_id: string
          reversed_at?: string
          reason: string
          actor_user_id?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          payment_id?: string
          reversed_at?: string
          reason?: string
          actor_user_id?: string | null
        }
        Relationships: []
      }
      fee_changes: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string
          previous_fee: number
          new_fee: number
          reason: string
          effective_at: string
          actor_user_id: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id: string
          previous_fee: number
          new_fee: number
          reason: string
          effective_at?: string
          actor_user_id?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string
          previous_fee?: number
          new_fee?: number
          reason?: string
          effective_at?: string
          actor_user_id?: string | null
        }
        Relationships: []
      }
      financial_ledger_entries: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string | null
          company_id: string | null
          entry_type: string
          direction: string
          amount: number
          method: string | null
          category: string | null
          source: string | null
          occurred_at: string
          status: string
          note: string | null
          reversal_reason: string | null
          reversed_at: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id?: string | null
          company_id?: string | null
          entry_type: string
          direction: string
          amount: number
          method?: string | null
          category?: string | null
          source?: string | null
          occurred_at: string
          status?: string
          note?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string | null
          company_id?: string | null
          entry_type?: string
          direction?: string
          amount?: number
          method?: string | null
          category?: string | null
          source?: string | null
          occurred_at?: string
          status?: string
          note?: string | null
          reversal_reason?: string | null
          reversed_at?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      cashbox_accounts: {
        Row: {
          id: string
          workspace_id: string
          name: string
          opening_balance: number
          opened_at: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          opening_balance?: number
          opened_at?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          opening_balance?: number
          opened_at?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          workspace_id: string
          company_id: string | null
          transaction_id: string | null
          title: string
          document_type: string | null
          mime_type: string
          storage_path: string
          size_bytes: number
          original_size_bytes: number | null
          checksum: string | null
          status: string
          captured_at: string | null
          created_at: string
          updated_at: string
          legacy_id: string | null
          legacy_source: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          company_id?: string | null
          transaction_id?: string | null
          title: string
          document_type?: string | null
          mime_type: string
          storage_path: string
          size_bytes: number
          original_size_bytes?: number | null
          checksum?: string | null
          status?: string
          captured_at?: string | null
          created_at?: string
          updated_at?: string
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          company_id?: string | null
          transaction_id?: string | null
          title?: string
          document_type?: string | null
          mime_type?: string
          storage_path?: string
          size_bytes?: number
          original_size_bytes?: number | null
          checksum?: string | null
          status?: string
          captured_at?: string | null
          created_at?: string
          updated_at?: string
          legacy_id?: string | null
          legacy_source?: string | null
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          id: string
          workspace_id: string
          document_id: string
          version_number: number
          storage_path: string
          mime_type: string
          size_bytes: number
          checksum: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          document_id: string
          version_number: number
          storage_path: string
          mime_type: string
          size_bytes: number
          checksum?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          document_id?: string
          version_number?: number
          storage_path?: string
          mime_type?: string
          size_bytes?: number
          checksum?: string | null
          created_at?: string
        }
        Relationships: []
      }
      document_analysis: {
        Row: {
          id: string
          workspace_id: string
          document_id: string
          analysis_version: number
          ocr_text: string | null
          extracted_fields: Json
          classification: string | null
          confidence: number | null
          duplicate_of_document_id: string | null
          review_status: string
          analyzed_at: string
          provider: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          document_id: string
          analysis_version?: number
          ocr_text?: string | null
          extracted_fields?: Json
          classification?: string | null
          confidence?: number | null
          duplicate_of_document_id?: string | null
          review_status?: string
          analyzed_at?: string
          provider?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          document_id?: string
          analysis_version?: number
          ocr_text?: string | null
          extracted_fields?: Json
          classification?: string | null
          confidence?: number | null
          duplicate_of_document_id?: string | null
          review_status?: string
          analyzed_at?: string
          provider?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          id: string
          workspace_id: string
          name: string
          kind: string
          body_source: string
          token_schema: Json
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          kind: string
          body_source: string
          token_schema?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          kind?: string
          body_source?: string
          token_schema?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      correspondence_registry: {
        Row: {
          id: string
          workspace_id: string
          direction: string
          kind: string
          correspondence_number: string
          correspondence_date: string
          company_id: string | null
          transaction_id: string | null
          subject: string
          sender: string | null
          recipient: string | null
          document_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          direction: string
          kind: string
          correspondence_number: string
          correspondence_date: string
          company_id?: string | null
          transaction_id?: string | null
          subject: string
          sender?: string | null
          recipient?: string | null
          document_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          direction?: string
          kind?: string
          correspondence_number?: string
          correspondence_date?: string
          company_id?: string | null
          transaction_id?: string | null
          subject?: string
          sender?: string | null
          recipient?: string | null
          document_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      document_drafts: {
        Row: {
          id: string
          workspace_id: string
          template_id: string | null
          transaction_id: string | null
          company_id: string | null
          title: string
          compiled_content: string
          variables: Json
          status: string
          correspondence_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          template_id?: string | null
          transaction_id?: string | null
          company_id?: string | null
          title: string
          compiled_content?: string
          variables?: Json
          status?: string
          correspondence_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          template_id?: string | null
          transaction_id?: string | null
          company_id?: string | null
          title?: string
          compiled_content?: string
          variables?: Json
          status?: string
          correspondence_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pdf_jobs: {
        Row: {
          id: string
          workspace_id: string
          source_document_id: string | null
          job_type: string
          plan: Json
          status: string
          output_document_id: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          source_document_id?: string | null
          job_type: string
          plan: Json
          status?: string
          output_document_id?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          source_document_id?: string | null
          job_type?: string
          plan?: Json
          status?: string
          output_document_id?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          workspace_id: string
          report_name: string | null
          report_address: string | null
          signature_document_id: string | null
          theme_preferences: Json
          notification_defaults: Json
          updated_at: string
        }
        Insert: {
          workspace_id: string
          report_name?: string | null
          report_address?: string | null
          signature_document_id?: string | null
          theme_preferences?: Json
          notification_defaults?: Json
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          report_name?: string | null
          report_address?: string | null
          signature_document_id?: string | null
          theme_preferences?: Json
          notification_defaults?: Json
          updated_at?: string
        }
        Relationships: []
      }
      workflow_templates: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          version: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          version?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          version?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_template_stages: {
        Row: {
          id: string
          workspace_id: string
          workflow_template_id: string
          position: number
          name: string
          description: string | null
          due_offset_days: number | null
        }
        Insert: {
          id?: string
          workspace_id: string
          workflow_template_id: string
          position: number
          name: string
          description?: string | null
          due_offset_days?: number | null
        }
        Update: {
          id?: string
          workspace_id?: string
          workflow_template_id?: string
          position?: number
          name?: string
          description?: string | null
          due_offset_days?: number | null
        }
        Relationships: []
      }
      workflow_template_items: {
        Row: {
          id: string
          workspace_id: string
          stage_id: string
          position: number
          item_type: string
          title: string
          required: boolean
          config: Json
        }
        Insert: {
          id?: string
          workspace_id: string
          stage_id: string
          position: number
          item_type: string
          title: string
          required?: boolean
          config?: Json
        }
        Update: {
          id?: string
          workspace_id?: string
          stage_id?: string
          position?: number
          item_type?: string
          title?: string
          required?: boolean
          config?: Json
        }
        Relationships: []
      }
      workflow_instances: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string
          workflow_template_id: string | null
          template_snapshot: Json
          current_stage_position: number
          status: string
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id: string
          workflow_template_id?: string | null
          template_snapshot: Json
          current_stage_position?: number
          status?: string
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string
          workflow_template_id?: string | null
          template_snapshot?: Json
          current_stage_position?: number
          status?: string
          started_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      workflow_stage_states: {
        Row: {
          id: string
          workspace_id: string
          workflow_instance_id: string
          stage_position: number
          status: string
          started_at: string | null
          completed_at: string | null
          override_used: boolean
          override_reason: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          workflow_instance_id: string
          stage_position: number
          status?: string
          started_at?: string | null
          completed_at?: string | null
          override_used?: boolean
          override_reason?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          workflow_instance_id?: string
          stage_position?: number
          status?: string
          started_at?: string | null
          completed_at?: string | null
          override_used?: boolean
          override_reason?: string | null
        }
        Relationships: []
      }
      workflow_item_states: {
        Row: {
          id: string
          workspace_id: string
          workflow_instance_id: string
          template_item_key: string
          status: string
          completed_at: string | null
          note: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          workflow_instance_id: string
          template_item_key: string
          status?: string
          completed_at?: string | null
          note?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          workflow_instance_id?: string
          template_item_key?: string
          status?: string
          completed_at?: string | null
          note?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          id: string
          workspace_id: string
          transaction_id: string | null
          company_id: string | null
          contact_id: string | null
          title: string
          event_type: string
          starts_at: string
          ends_at: string | null
          status: string
          reminder_offsets: number | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          transaction_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          title: string
          event_type: string
          starts_at: string
          ends_at?: string | null
          status?: string
          reminder_offsets?: number | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          transaction_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          title?: string
          event_type?: string
          starts_at?: string
          ends_at?: string | null
          status?: string
          reminder_offsets?: number | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      renewals: {
        Row: {
          id: string
          workspace_id: string
          company_id: string | null
          transaction_id: string | null
          title: string
          due_date: string
          recurrence_rule: string | null
          status: string
          last_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          company_id?: string | null
          transaction_id?: string | null
          title: string
          due_date: string
          recurrence_rule?: string | null
          status?: string
          last_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          company_id?: string | null
          transaction_id?: string | null
          title?: string
          due_date?: string
          recurrence_rule?: string | null
          status?: string
          last_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          id: string
          workspace_id: string
          company_id: string | null
          contact_id: string | null
          transaction_id: string | null
          channel: string
          direction: string
          summary: string
          occurred_at: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          company_id?: string | null
          contact_id?: string | null
          transaction_id?: string | null
          channel: string
          direction: string
          summary: string
          occurred_at: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          company_id?: string | null
          contact_id?: string | null
          transaction_id?: string | null
          channel?: string
          direction?: string
          summary?: string
          occurred_at?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      saved_views: {
        Row: {
          id: string
          workspace_id: string
          name: string
          surface: string
          filters: Json
          sort: Json
          pinned: boolean
          position: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          surface: string
          filters?: Json
          sort?: Json
          pinned?: boolean
          position?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          surface?: string
          filters?: Json
          sort?: Json
          pinned?: boolean
          position?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          id: string
          workspace_id: string
          name: string
          enabled: boolean
          trigger_config: Json
          conditions: Json
          actions: Json
          throttle_policy: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          enabled?: boolean
          trigger_config: Json
          conditions?: Json
          actions: Json
          throttle_policy?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          enabled?: boolean
          trigger_config?: Json
          conditions?: Json
          actions?: Json
          throttle_policy?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          id: string
          workspace_id: string
          rule_id: string
          trigger_event_id: string | null
          status: string
          receipt_key: string | null
          result: Json
          started_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          rule_id: string
          trigger_event_id?: string | null
          status?: string
          receipt_key?: string | null
          result?: Json
          started_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          rule_id?: string
          trigger_event_id?: string | null
          status?: string
          receipt_key?: string | null
          result?: Json
          started_at?: string
          finished_at?: string | null
        }
        Relationships: []
      }
      intelligence_snapshots: {
        Row: {
          id: string
          workspace_id: string
          scope_type: string
          scope_id: string | null
          snapshot_type: string
          model_version: string
          data: Json
          generated_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          scope_type: string
          scope_id?: string | null
          snapshot_type: string
          model_version: string
          data: Json
          generated_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          scope_type?: string
          scope_id?: string | null
          snapshot_type?: string
          model_version?: string
          data?: Json
          generated_at?: string
          expires_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          workspace_id: string
          user_id: string
          reminders_enabled: boolean
          remind_overdue: boolean
          remind_due_soon: boolean
          remind_stalled: boolean
          remind_stale: boolean
          daily_brief_enabled: boolean
          daily_brief_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          reminders_enabled?: boolean
          remind_overdue?: boolean
          remind_due_soon?: boolean
          remind_stalled?: boolean
          remind_stale?: boolean
          daily_brief_enabled?: boolean
          daily_brief_time?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          user_id?: string
          reminders_enabled?: boolean
          remind_overdue?: boolean
          remind_due_soon?: boolean
          remind_stalled?: boolean
          remind_stale?: boolean
          daily_brief_enabled?: boolean
          daily_brief_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          type: string
          dedupe_key: string | null
          channel: string
          status: string
          scheduled_for: string
          sent_at: string | null
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          type: string
          dedupe_key?: string | null
          channel: string
          status?: string
          scheduled_for: string
          sent_at?: string | null
          payload?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          type?: string
          dedupe_key?: string | null
          channel?: string
          status?: string
          scheduled_for?: string
          sent_at?: string | null
          payload?: Json
          created_at?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          id: string
          workspace_id: string
          actor_user_id: string | null
          actor_device_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          summary: string
          details: Json
          occurred_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          actor_user_id?: string | null
          actor_device_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          summary: string
          details?: Json
          occurred_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          actor_user_id?: string | null
          actor_device_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          summary?: string
          details?: Json
          occurred_at?: string
        }
        Relationships: []
      }
      sync_devices: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          device_label: string | null
          last_seen_at: string
          last_sync_at: string | null
          app_version: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          device_label?: string | null
          last_seen_at?: string
          last_sync_at?: string | null
          app_version?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          device_label?: string | null
          last_seen_at?: string
          last_sync_at?: string | null
          app_version?: string | null
          created_at?: string
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          id: string
          workspace_id: string
          source: string
          status: string
          counts: Json
          reconciliation: Json
          started_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          source: string
          status?: string
          counts?: Json
          reconciliation?: Json
          started_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          source?: string
          status?: string
          counts?: Json
          reconciliation?: Json
          started_at?: string
          finished_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      bootstrap_personal_workspace: {
        Args: { p_display_name: string; p_workspace_name?: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type PublicTables = Database['public']['Tables']
export type PublicTableName = keyof PublicTables
export type TableRow<T extends PublicTableName> = PublicTables[T]['Row']
export type TableInsert<T extends PublicTableName> = PublicTables[T]['Insert']
export type TableUpdate<T extends PublicTableName> = PublicTables[T]['Update']
