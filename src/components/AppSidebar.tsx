import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import aksobLogo from '@/assets/aksob-logo.png';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  TrendingUp,
  ShieldCheck,
  UserCog,
  BookOpen,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';


const navItems = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'department_chair'] },
  { title: 'Cases', path: '/cases', icon: FileText, roles: ['admin', 'department_chair', 'advisor'] },
  { title: 'Advisor Workload', path: '/advisor-workload', icon: Users, roles: ['admin', 'department_chair'] },
  { title: 'Department Monitoring', path: '/department-monitoring', icon: Building2, roles: ['admin', 'department_chair'] },
  { title: 'Outcomes Analytics', path: '/outcomes', icon: TrendingUp, roles: ['admin', 'department_chair'] },
  { title: 'Compliance Tracking', path: '/compliance', icon: ShieldCheck, roles: ['admin', 'department_chair'] },
  { title: 'User Management', path: '/user-management', icon: UserCog, roles: ['admin'] },
  { title: 'Guide', path: '/guide', icon: BookOpen, roles: ['admin'] },
];

const AppSidebar = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(user?.role || '')
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-200 z-50',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        {!collapsed && (
          <img src={aksobLogo} alt="AKSOB" className="h-12 object-contain brightness-0 invert" />
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-xs font-medium text-sidebar-foreground">{user?.full_name}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
