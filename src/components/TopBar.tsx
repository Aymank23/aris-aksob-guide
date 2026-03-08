import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

const TopBar = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Derive term from current date: Jan-May = Spring, Jun-Aug = Summer, Sep-Dec = Fall
  const term = month <= 4 ? `Spring ${year}` : month <= 7 ? `Summer ${year}` : `Fall ${year}`;

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-bold text-foreground font-serif">
          AKSOB Academic Risk Intervention Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Academic monitoring, intervention management, and student success oversight
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant="outline" className="text-xs font-normal">
          {term}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          {' '}
          {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>AACSB Governed</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
