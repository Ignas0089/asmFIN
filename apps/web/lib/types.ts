export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          type: "income" | "expense";
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: "income" | "expense";
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: "income" | "expense";
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          amount: number;
          category_id: string | null;
          description: string;
          occurred_on: string;
          type: "income" | "expense";
          notes: string | null;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          amount: number;
          category_id?: string | null;
          description: string;
          occurred_on: string;
          type: "income" | "expense";
          notes?: string | null;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          amount?: number;
          category_id?: string | null;
          description?: string;
          occurred_on?: string;
          type?: "income" | "expense";
          notes?: string | null;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      transaction_type: "income" | "expense";
    };
  };
}
