import { ArrowLeft, Moon, Sun, Monitor, Bell, Shield, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MobileNav } from "@/components/mobile-nav";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild data-testid="button-back">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <span className="font-medium">Settings</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Appearance</h2>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <Button
                  key={option.value}
                  variant="outline"
                  className={cn(
                    "flex flex-col gap-2 h-auto py-4",
                    isActive && "border-primary bg-primary/5"
                  )}
                  onClick={() => setTheme(option.value)}
                  data-testid={`button-theme-${option.value}`}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  <span className={cn("text-sm", isActive && "text-primary font-medium")}>
                    {option.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </Card>

        <Card className="divide-y divide-border">
          <button className="w-full flex items-center gap-3 p-4 text-left hover-elevate">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <span className="font-medium">Notifications</span>
              <p className="text-sm text-muted-foreground">Manage notification preferences</p>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-3 p-4 text-left hover-elevate">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <span className="font-medium">Privacy & Security</span>
              <p className="text-sm text-muted-foreground">Control your data and privacy</p>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-3 p-4 text-left hover-elevate">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <span className="font-medium">Help & Support</span>
              <p className="text-sm text-muted-foreground">Get help and contact support</p>
            </div>
          </button>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>DebateTree v1.0.0</p>
          <p className="mt-1">Making discussions clearer, one node at a time.</p>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
