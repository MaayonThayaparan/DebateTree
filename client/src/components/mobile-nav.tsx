import { Home, Search, Settings, TrendingUp, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "For You" },
  { href: "/trending", icon: TrendingUp, label: "Trending" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
