import { ReactNode } from 'react';
import AppSidebar from '@/components/AppSidebar';
import TopBar from '@/components/TopBar';

const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen flex">
      <AppSidebar />
      <div className="flex-1 ml-60 flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
