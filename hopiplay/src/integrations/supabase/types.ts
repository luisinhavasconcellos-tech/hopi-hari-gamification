export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      alternativa_janela: {
        Row: {
          ativo: boolean;
          classe_alternativa: string;
          classe_fechada: string;
          created_at: string;
          id: number;
          prioridade: number;
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          classe_alternativa: string;
          classe_fechada: string;
          created_at?: string;
          id?: number;
          prioridade?: number;
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          classe_alternativa?: string;
          classe_fechada?: string;
          created_at?: string;
          id?: number;
          prioridade?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alternativa_janela_classe_alternativa_fkey";
            columns: ["classe_alternativa"];
            isOneToOne: false;
            referencedRelation: "classe_recompensa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alternativa_janela_classe_fechada_fkey";
            columns: ["classe_fechada"];
            isOneToOne: false;
            referencedRelation: "classe_recompensa";
            referencedColumns: ["id"];
          },
        ];
      };
      cifra_diaria: {
        Row: {
          classe_id: string;
          data: string;
          digito_dia: string;
          geracao: number;
          id: number;
          letra_chave: string;
        };
        Insert: {
          classe_id: string;
          data: string;
          digito_dia: string;
          geracao?: number;
          id?: number;
          letra_chave: string;
        };
        Update: {
          classe_id?: string;
          data?: string;
          digito_dia?: string;
          geracao?: number;
          id?: number;
          letra_chave?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cifra_diaria_classe_id_fkey";
            columns: ["classe_id"];
            isOneToOne: false;
            referencedRelation: "classe_recompensa";
            referencedColumns: ["id"];
          },
        ];
      };
      classe_recompensa: {
        Row: {
          ativo: boolean;
          categoria: string;
          custo_unitario: number;
          id: string;
          janela_uso_fim: string | null;
          janela_uso_inicio: string | null;
          nivel: number;
          nome_interno: string;
          nome_revelado: string;
          ponto_resgate: string;
          ponto_resgate_label: string;
          quota_horaria_json: Json | null;
          teto_diario: number | null;
          teto_orcamento_dia: number | null;
          ttl_horas: number | null;
          valor_percebido: number;
        };
        Insert: {
          ativo?: boolean;
          categoria: string;
          custo_unitario?: number;
          id: string;
          janela_uso_fim?: string | null;
          janela_uso_inicio?: string | null;
          nivel: number;
          nome_interno: string;
          nome_revelado: string;
          ponto_resgate: string;
          ponto_resgate_label: string;
          quota_horaria_json?: Json | null;
          teto_diario?: number | null;
          teto_orcamento_dia?: number | null;
          ttl_horas?: number | null;
          valor_percebido?: number;
        };
        Update: {
          ativo?: boolean;
          categoria?: string;
          custo_unitario?: number;
          id?: string;
          janela_uso_fim?: string | null;
          janela_uso_inicio?: string | null;
          nivel?: number;
          nome_interno?: string;
          nome_revelado?: string;
          ponto_resgate?: string;
          ponto_resgate_label?: string;
          quota_horaria_json?: Json | null;
          teto_diario?: number | null;
          teto_orcamento_dia?: number | null;
          ttl_horas?: number | null;
          valor_percebido?: number;
        };
        Relationships: [];
      };
      codigo: {
        Row: {
          canal: string;
          classe_id: string;
          codigo: string;
          data: string;
          emitido_em: string;
          estado: string;
          expira_em: string;
          motivo_anulacao: string | null;
          player_id: string;
          ponto_id: string | null;
          regra_origem: string | null;
          resgatado_em: string | null;
          serie: string;
          staff_id: string | null;
        };
        Insert: {
          canal?: string;
          classe_id: string;
          codigo: string;
          data: string;
          emitido_em?: string;
          estado?: string;
          expira_em: string;
          motivo_anulacao?: string | null;
          player_id: string;
          ponto_id?: string | null;
          regra_origem?: string | null;
          resgatado_em?: string | null;
          serie: string;
          staff_id?: string | null;
        };
        Update: {
          canal?: string;
          classe_id?: string;
          codigo?: string;
          data?: string;
          emitido_em?: string;
          estado?: string;
          expira_em?: string;
          motivo_anulacao?: string | null;
          player_id?: string;
          ponto_id?: string | null;
          regra_origem?: string | null;
          resgatado_em?: string | null;
          serie?: string;
          staff_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "codigo_classe_id_fkey";
            columns: ["classe_id"];
            isOneToOne: false;
            referencedRelation: "classe_recompensa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "codigo_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "jogador";
            referencedColumns: ["id"];
          },
        ];
      };
      concessao_manual: {
        Row: {
          autorizado_por: string;
          classe_id: string;
          consumida: boolean;
          criada_em: string;
          id: number;
          motivo: string;
          player_id: string;
        };
        Insert: {
          autorizado_por: string;
          classe_id: string;
          consumida?: boolean;
          criada_em?: string;
          id?: number;
          motivo: string;
          player_id: string;
        };
        Update: {
          autorizado_por?: string;
          classe_id?: string;
          consumida?: boolean;
          criada_em?: string;
          id?: number;
          motivo?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "concessao_manual_classe_id_fkey";
            columns: ["classe_id"];
            isOneToOne: false;
            referencedRelation: "classe_recompensa";
            referencedColumns: ["id"];
          },
        ];
      };
      config: {
        Row: {
          chave: string;
          valor: string;
        };
        Insert: {
          chave: string;
          valor: string;
        };
        Update: {
          chave?: string;
          valor?: string;
        };
        Relationships: [];
      };
      idempotencia: {
        Row: {
          chave: string;
          criada_em: string;
          resposta_json: Json;
        };
        Insert: {
          chave: string;
          criada_em?: string;
          resposta_json: Json;
        };
        Update: {
          chave?: string;
          criada_em?: string;
          resposta_json?: Json;
        };
        Relationships: [];
      };
      jogador: {
        Row: {
          album_completo: boolean;
          cartas: number;
          id: string;
          nome: string;
          passe_anual: boolean;
          pontos: number;
          posicao_ranking_dia: number | null;
          posicao_ranking_global: number | null;
          primeira_visita: boolean;
        };
        Insert: {
          album_completo?: boolean;
          cartas?: number;
          id: string;
          nome: string;
          passe_anual?: boolean;
          pontos?: number;
          posicao_ranking_dia?: number | null;
          posicao_ranking_global?: number | null;
          primeira_visita?: boolean;
        };
        Update: {
          album_completo?: boolean;
          cartas?: number;
          id?: string;
          nome?: string;
          passe_anual?: boolean;
          pontos?: number;
          posicao_ranking_dia?: number | null;
          posicao_ranking_global?: number | null;
          primeira_visita?: boolean;
        };
        Relationships: [];
      };
      log_resgate: {
        Row: {
          acao: string;
          codigo: string | null;
          detalhe: string | null;
          id: number;
          ip: string | null;
          ponto_id: string | null;
          resultado: string;
          staff_id: string | null;
          ts_cliente: string | null;
          ts_servidor: string;
        };
        Insert: {
          acao: string;
          codigo?: string | null;
          detalhe?: string | null;
          id?: number;
          ip?: string | null;
          ponto_id?: string | null;
          resultado: string;
          staff_id?: string | null;
          ts_cliente?: string | null;
          ts_servidor?: string;
        };
        Update: {
          acao?: string;
          codigo?: string | null;
          detalhe?: string | null;
          id?: number;
          ip?: string | null;
          ponto_id?: string | null;
          resultado?: string;
          staff_id?: string | null;
          ts_cliente?: string | null;
          ts_servidor?: string;
        };
        Relationships: [];
      };
      pool_dia: {
        Row: {
          classe_id: string;
          data: string;
          emitidos: number;
          gasto_orcamento: number;
          id: number;
          pausado: boolean;
          resgatados: number;
          teto: number | null;
          teto_orcamento: number | null;
        };
        Insert: {
          classe_id: string;
          data: string;
          emitidos?: number;
          gasto_orcamento?: number;
          id?: number;
          pausado?: boolean;
          resgatados?: number;
          teto?: number | null;
          teto_orcamento?: number | null;
        };
        Update: {
          classe_id?: string;
          data?: string;
          emitidos?: number;
          gasto_orcamento?: number;
          id?: number;
          pausado?: boolean;
          resgatados?: number;
          teto?: number | null;
          teto_orcamento?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "pool_dia_classe_id_fkey";
            columns: ["classe_id"];
            isOneToOne: false;
            referencedRelation: "classe_recompensa";
            referencedColumns: ["id"];
          },
        ];
      };
      regra: {
        Row: {
          ativo: boolean;
          classe_id: string;
          condicao_json: Json;
          criada_por: string | null;
          id: number;
          modo: string;
          nome: string;
          peso: number;
          prioridade: number;
        };
        Insert: {
          ativo?: boolean;
          classe_id: string;
          condicao_json?: Json;
          criada_por?: string | null;
          id?: number;
          modo?: string;
          nome: string;
          peso?: number;
          prioridade: number;
        };
        Update: {
          ativo?: boolean;
          classe_id?: string;
          condicao_json?: Json;
          criada_por?: string | null;
          id?: number;
          modo?: string;
          nome?: string;
          peso?: number;
          prioridade?: number;
        };
        Relationships: [
          {
            foreignKeyName: "regra_classe_id_fkey";
            columns: ["classe_id"];
            isOneToOne: false;
            referencedRelation: "classe_recompensa";
            referencedColumns: ["id"];
          },
        ];
      };
      serie_retirada: {
        Row: {
          retirada_em: string;
          serie: string;
        };
        Insert: {
          retirada_em?: string;
          serie: string;
        };
        Update: {
          retirada_em?: string;
          serie?: string;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          ativo: boolean;
          bloqueado_ate: string | null;
          erros_pin: number;
          id: string;
          nome: string;
          perfil: string;
          pin_hash: string;
          pin_rodado_em: string;
          pin_salt: string;
          pontos_autorizados: Json;
          primeiro_erro_ts: string | null;
        };
        Insert: {
          ativo?: boolean;
          bloqueado_ate?: string | null;
          erros_pin?: number;
          id: string;
          nome: string;
          perfil?: string;
          pin_hash: string;
          pin_rodado_em?: string;
          pin_salt: string;
          pontos_autorizados: Json;
          primeiro_erro_ts?: string | null;
        };
        Update: {
          ativo?: boolean;
          bloqueado_ate?: string | null;
          erros_pin?: number;
          id?: string;
          nome?: string;
          perfil?: string;
          pin_hash?: string;
          pin_rodado_em?: string;
          pin_salt?: string;
          pontos_autorizados?: Json;
          primeiro_erro_ts?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      app_reservar_capacidade: {
        Args: {
          p_classe: string;
          p_custo: number;
          p_data: string;
          p_quota: number;
        };
        Returns: boolean;
      };
      app_transicao_resgate: {
        Args: {
          p_canal: string;
          p_codigo: string;
          p_ponto: string;
          p_staff: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
