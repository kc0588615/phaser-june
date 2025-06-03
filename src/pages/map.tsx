import '@/styles/tailwind.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import CesiumMap from '@/components/CesiumMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe } from 'lucide-react';

export default function MapPage() {
  return (
    <ThemeProvider defaultTheme="system">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="h-screen p-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Global Habitat Explorer
                </CardTitle>
                <p className="text-muted-foreground">
                  Explore different habitats around the world and discover where species live
                </p>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-5rem)]">
                <div className="h-full w-full">
                  <CesiumMap />
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}