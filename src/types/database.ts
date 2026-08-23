export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      flights: {
        Row: {
          id: string;
          user_id: string;
          flight_number: string;
          airline_iata: string | null;
          airline_name: string | null;
          origin_iata: string;
          destination_iata: string;
          scheduled_departure: string;
          scheduled_arrival: string;
          actual_departure: string | null;
          actual_arrival: string | null;
          status: string;
          departure_terminal: string | null;
          departure_gate: string | null;
          arrival_terminal: string | null;
          arrival_gate: string | null;
          origin_time_zone: string | null;
          destination_time_zone: string | null;
          origin_latitude: number | null;
          origin_longitude: number | null;
          origin_country_code: string | null;
          origin_country_name: string | null;
          destination_latitude: number | null;
          destination_longitude: number | null;
          destination_country_code: string | null;
          destination_country_name: string | null;
          aircraft_model: string | null;
          aircraft_registration: string | null;
          distance_km: number | null;
          operating_airline_iata: string | null;
          operating_flight_number: string | null;
          provider: string | null;
          provider_record_id: string | null;
          provider_retrieved_at: string | null;
          seat: string | null;
          notes: string | null;
          is_manual: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          flight_number: string;
          airline_iata?: string | null;
          airline_name?: string | null;
          origin_iata: string;
          destination_iata: string;
          scheduled_departure: string;
          scheduled_arrival: string;
          actual_departure?: string | null;
          actual_arrival?: string | null;
          status?: string;
          departure_terminal?: string | null;
          departure_gate?: string | null;
          arrival_terminal?: string | null;
          arrival_gate?: string | null;
          origin_time_zone?: string | null;
          destination_time_zone?: string | null;
          origin_latitude?: number | null;
          origin_longitude?: number | null;
          origin_country_code?: string | null;
          origin_country_name?: string | null;
          destination_latitude?: number | null;
          destination_longitude?: number | null;
          destination_country_code?: string | null;
          destination_country_name?: string | null;
          aircraft_model?: string | null;
          aircraft_registration?: string | null;
          distance_km?: number | null;
          operating_airline_iata?: string | null;
          operating_flight_number?: string | null;
          provider?: string | null;
          provider_record_id?: string | null;
          provider_retrieved_at?: string | null;
          seat?: string | null;
          notes?: string | null;
          is_manual?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['flights']['Insert']>;
        Relationships: [];
      };
      airports: {
        Row: {
          iata: string;
          name: string;
          municipality: string | null;
          iso_country: string;
          country_name: string;
          latitude: number;
          longitude: number;
          time_zone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          iata: string;
          name: string;
          municipality?: string | null;
          iso_country: string;
          country_name: string;
          latitude: number;
          longitude: number;
          time_zone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['airports']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: { id: string; full_name: string | null; created_at: string; updated_at: string };
        Insert: { id: string; full_name?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_own_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
