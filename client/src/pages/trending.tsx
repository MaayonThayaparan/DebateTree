import { useQuery } from "@tanstack/react-query";
import { TrendingUp, RefreshCw, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopicCard, TopicCardSkeleton } from "@/components/topic-card";
import { CreateTopicModal } from "@/components/create-topic-modal";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import type { Topic } from "@shared/schema";
import type { User } from "@shared/models/auth";

interface TopicWithAuthor extends Topic {
  author?: User | null;
}

export default function TrendingPage() {
  const { isAuthenticated } = useAuth();

  const { data: topics, isLoading, refetch, isRefetching } = useQuery<TopicWithAuthor[]>({
    queryKey: ["/api/topics", { sort: "trending" }],
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <span className="font-semibold">Trending</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <ThemeToggle />
            <UserAvatar />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <TopicCardSkeleton key={i} />
            ))}
          </div>
        ) : topics && topics.length > 0 ? (
          <div className="space-y-4">
            {topics.map((topic, index) => (
              <div key={topic.id} className="relative">
                <div className="absolute -left-6 top-4 text-sm font-bold text-muted-foreground hidden sm:block">
                  #{index + 1}
                </div>
                <TopicCard topic={topic} author={topic.author} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No trending topics</h3>
            <p className="text-muted-foreground mt-1">
              Check back later for popular discussions
            </p>
          </div>
        )}
      </main>

      {isAuthenticated && <CreateTopicModal />}
      <MobileNav />
    </div>
  );
}
