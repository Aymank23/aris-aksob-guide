import { ReactNode, useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import TopBar from '@/components/TopBar';
import { cn } from '@/lib/utils';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={cn('flex-1 flex flex-col transition-all duration-200', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
