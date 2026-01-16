import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { Topic } from "@shared/schema";
import type { User } from "@shared/models/auth";

interface TopicCardProps {
  topic: Topic;
  author?: User | null;
}

export function TopicCard({ topic, author }: TopicCardProps) {
  const timeAgo = formatDistanceToNow(new Date(topic.createdAt), { addSuffix: true });
  
  return (
    <Link href={`/discussion/${topic.id}`}>
      <Card 
        className="p-4 hover-elevate cursor-pointer transition-all duration-200 border border-border"
        data-testid={`topic-card-${topic.id}`}
      >
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={author?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {author?.firstName?.[0] || "A"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">
                {author?.firstName || "Anonymous"} {author?.lastName || ""}
              </span>
              <span className="text-muted-foreground text-xs">{timeAgo}</span>
            </div>
            
            <h3 className="font-semibold text-base mt-1 line-clamp-2 leading-snug">
              {topic.title}
            </h3>
            
            {topic.content && (
              <p className="text-muted-foreground text-sm mt-1.5 line-clamp-2">
                {topic.content}
              </p>
            )}
            
            {topic.imageUrl && (
              <div className="mt-3 rounded-lg overflow-hidden">
                <img 
                  src={topic.imageUrl} 
                  alt="" 
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="gap-1 text-agree border-agree/30 bg-agree-bg">
                  <CheckCircle className="h-3 w-3" />
                  <span>{topic.agreeCount}</span>
                </Badge>
                <Badge variant="outline" className="gap-1 text-disagree border-disagree/30 bg-disagree-bg">
                  <XCircle className="h-3 w-3" />
                  <span>{topic.disagreeCount}</span>
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {topic.nodeCount}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {topic.likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsDown className="h-3.5 w-3.5" />
                  {topic.dislikeCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function TopicCardSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
          <div className="h-5 w-3/4 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="flex gap-3 mt-3">
            <div className="h-6 w-16 bg-muted rounded-full" />
            <div className="h-6 w-16 bg-muted rounded-full" />
            <div className="h-6 w-12 bg-muted rounded-full" />
          </div>
        </div>
      </div>
    </Card>
  );
}
