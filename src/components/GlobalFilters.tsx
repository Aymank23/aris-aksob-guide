import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFilters } from '@/contexts/FilterContext';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, X } from 'lucide-react';

const GlobalFilters = () => {
  const { campus, setCampus, campusOptions, department, clearDepartment } = useFilters();
  const { user } = useAuth();
  const isChair = user?.role === 'department_chair';

  return (
    <div className="flex items-center gap-2">
      {department !== 'all' && !isChair && (
        <Badge variant="secondary" className="gap-1 text-xs font-normal">
          {department}
          <button onClick={clearDepartment} aria-label="Clear department filter">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      <Select value={campus} onValueChange={setCampus}>
        <SelectTrigger className="w-40 h-8 text-xs" aria-label="Campus filter">
          <MapPin className="h-3.5 w-3.5 mr-1 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Campus" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Campuses</SelectItem>
          {campusOptions.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default GlobalFilters;
