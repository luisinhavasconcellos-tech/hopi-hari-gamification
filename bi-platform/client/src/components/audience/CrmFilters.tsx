import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

export type CrmFilterState = {
  uf: string;
  city: string;
  ddd: string;
  domain: string;
};

export const EMPTY_CRM_FILTERS: CrmFilterState = { uf: "all", city: "", ddd: "all", domain: "all" };

type Option = { value: string; label: string };

export default function CrmFilters({
  value,
  onChange,
  ufOptions,
  dddOptions,
  domainOptions,
}: {
  value: CrmFilterState;
  onChange: (v: CrmFilterState) => void;
  ufOptions: Option[];
  dddOptions: Option[];
  domainOptions: Option[];
}) {
  const set = (patch: Partial<CrmFilterState>) => onChange({ ...value, ...patch });
  const active =
    (value.uf !== "all" ? 1 : 0) +
    (value.city.trim() ? 1 : 0) +
    (value.ddd !== "all" ? 1 : 0) +
    (value.domain !== "all" ? 1 : 0);

  return (
    <div className="glass rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filtros avançados</span>
          {active > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {active} ativo{active > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {active > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(EMPTY_CRM_FILTERS)}
          >
            <X className="size-3 mr-1" /> Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Select value={value.uf} onValueChange={(v) => set({ uf: v })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todos os estados</SelectItem>
            {ufOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.city}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="Buscar cidade…"
            className="h-9 pl-8 text-xs"
          />
        </div>

        <Select value={value.ddd} onValueChange={(v) => set({ ddd: v })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="DDD" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todos os DDDs</SelectItem>
            {dddOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.domain} onValueChange={(v) => set({ domain: v })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Domínio de e-mail" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todos os domínios</SelectItem>
            {domainOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
