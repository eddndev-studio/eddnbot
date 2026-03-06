import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWhatsAppAccounts } from "@/hooks/use-whatsapp-accounts";

export interface ConversationFiltersState {
  accountId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

interface ConversationFiltersProps {
  filters: ConversationFiltersState;
  onFiltersChange: (filters: ConversationFiltersState) => void;
}

export function ConversationFilters({ filters, onFiltersChange }: ConversationFiltersProps) {
  const { data: accounts } = useWhatsAppAccounts();
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search ?? "")) {
        onFiltersChange({ ...filters, search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
        <Input
          placeholder="Search by name or phone..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 bg-neutral-900/60 border-neutral-800 text-neutral-200 placeholder:text-neutral-600"
        />
      </div>

      <Select
        value={filters.accountId ?? "all"}
        onValueChange={(v) => onFiltersChange({ ...filters, accountId: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-[180px] bg-neutral-900/60 border-neutral-800 text-neutral-200">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts?.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.displayPhoneNumber || a.phoneNumberId}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) => onFiltersChange({ ...filters, status: v === "all" ? undefined : v })}
      >
        <SelectTrigger className="w-[140px] bg-neutral-900/60 border-neutral-800 text-neutral-200">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={filters.from ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, from: e.target.value || undefined })}
        className="w-[150px] bg-neutral-900/60 border-neutral-800 text-neutral-200"
        placeholder="From"
      />
      <Input
        type="date"
        value={filters.to ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, to: e.target.value || undefined })}
        className="w-[150px] bg-neutral-900/60 border-neutral-800 text-neutral-200"
        placeholder="To"
      />
    </div>
  );
}
