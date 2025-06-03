import '@/styles/tailwind.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { PlayerDashboard } from '@/components/PlayerDashboard';

export default function StatsPage() {
  return (
    <ThemeProvider defaultTheme="system">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <PlayerDashboard />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}