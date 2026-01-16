import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TreePine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopicCard, TopicCardSkeleton } from "@/components/topic-card";
import { CreateTopicModal } from "@/components/create-topic-modal";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import type { Topic } from "@shared/schema";
import type { User } from "@shared/models/auth";

type SortOption = "latest" | "trending" | "top";

interface TopicWithAuthor extends Topic {
  author?: User | null;
}

export default function HomePage() {
  const [sort, setSort] = useState<SortOption>("latest");
  const { isAuthenticated } = useAuth();

  const { data: topics, isLoading, refetch, isRefetching } = useQuery<TopicWithAuthor[]>({
    queryKey: ["/api/topics", { sort }],
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <TreePine className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold hidden sm:inline">DebateTree</span>
          </div>
          
          <Tabs value={sort} onValueChange={(v) => setSort(v as SortOption)} className="flex-1 max-w-xs">
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="latest" className="text-xs" data-testid="tab-latest">Latest</TabsTrigger>
              <TabsTrigger value="trending" className="text-xs" data-testid="tab-trending">Trending</TabsTrigger>
              <TabsTrigger value="top" className="text-xs" data-testid="tab-top">Top</TabsTrigger>
            </TabsList>
          </Tabs>
          
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
            {topics.map((topic) => (
              <TopicCard 
                key={topic.id} 
                topic={topic} 
                author={topic.author}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <TreePine className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No discussions yet</h3>
            <p className="text-muted-foreground mt-1">
              Be the first to start a conversation!
            </p>
            {isAuthenticated && (
              <CreateTopicModal
                trigger={
                  <Button className="mt-4" data-testid="button-first-topic">
                    Start a Discussion
                  </Button>
                }
              />
            )}
          </div>
        )}
      </main>

      {isAuthenticated && <CreateTopicModal />}
      <MobileNav />
    </div>
  );
}
