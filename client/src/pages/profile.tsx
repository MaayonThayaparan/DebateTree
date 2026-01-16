import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, MessageSquare, ThumbsUp, LogOut } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopicCard, TopicCardSkeleton } from "@/components/topic-card";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Topic } from "@shared/schema";
import type { User } from "@shared/models/auth";

interface TopicWithAuthor extends Topic {
  author?: User | null;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [authLoading, isAuthenticated, toast]);

  const { data: userTopics, isLoading: topicsLoading } = useQuery<TopicWithAuthor[]>({
    queryKey: ["/api/users/me/topics"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-muted animate-pulse" />
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">
          <Card className="p-6 animate-pulse">
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-muted" />
              <div className="h-6 w-32 bg-muted rounded mt-4" />
              <div className="h-4 w-48 bg-muted rounded mt-2" />
            </div>
          </Card>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <span className="font-medium">Profile</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="text-xl font-bold mt-4">
              {user.firstName} {user.lastName}
            </h1>
            
            <p className="text-muted-foreground text-sm mt-1">
              {user.email}
            </p>
            
            {user.createdAt && (
              <div className="flex items-center gap-1 text-muted-foreground text-sm mt-3">
                <Calendar className="h-4 w-4" />
                <span>Joined {format(new Date(user.createdAt), "MMMM yyyy")}</span>
              </div>
            )}
            
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="topics">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="topics" data-testid="tab-topics">
              <MessageSquare className="h-4 w-4 mr-2" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="topics" className="mt-4">
            {topicsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <TopicCardSkeleton key={i} />
                ))}
              </div>
            ) : userTopics && userTopics.length > 0 ? (
              <div className="space-y-4">
                {userTopics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} author={user} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium">No topics yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Start a discussion to see it here!
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="activity" className="mt-4">
            <div className="text-center py-12">
              <ThumbsUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium">Activity coming soon</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Your reactions and responses will appear here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <MobileNav />
    </div>
  );
}
