export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      flights: {
        Row: {
          id: string;
          user_id: string;
          flight_number: string;
          airline_iata: string;
          origin_iata: string;
          destination_iata: string;
          scheduled_departure: string;
          scheduled_arrival: string;
          status: string;
          departure_terminal: string | null;
          departure_gate: string | null;
          arrival_terminal: string | null;
          arrival_gate: string | null;
          seat: string | null;
          confirmation_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          flight_number: string;
          airline_iata: string;
          origin_iata: string;
          destination_iata: string;
          scheduled_departure: string;
          scheduled_arrival: string;
          status?: string;
          departure_terminal?: string | null;
          departure_gate?: string | null;
          arrival_terminal?: string | null;
          arrival_gate?: string | null;
          seat?: string | null;
          confirmation_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['flights']['Insert']>;
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
