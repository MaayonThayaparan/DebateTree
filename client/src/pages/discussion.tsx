import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Share2,
  MoreHorizontal,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DiscussionNode, NodeSkeleton } from "@/components/discussion-node";
import { ReplySheet } from "@/components/reply-sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Topic, Node, NodeType, Reaction } from "@shared/schema";
import type { User } from "@shared/models/auth";

type SortOption = "likes" | "newest" | "engagement";

interface TopicWithAuthor extends Topic {
  author?: User | null;
}

interface NodeWithAuthor extends Node {
  author?: User | null;
}

interface NodeTree extends NodeWithAuthor {
  children: NodeTree[];
}

export default function DiscussionPage() {
  const params = useParams<{ id: string }>();
  const topicId = params.id;
  const [sortBy, setSortBy] = useState<SortOption>("likes");
  const [replySheet, setReplySheet] = useState<{ isOpen: boolean; parentId: string | null; parentAuthor: string; initialType: NodeType }>({
    isOpen: false,
    parentId: null,
    parentAuthor: "",
    initialType: "neutral",
  });
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: topic, isLoading: topicLoading } = useQuery<TopicWithAuthor>({
    queryKey: ["/api/topics", topicId],
  });

  const { data: nodes, isLoading: nodesLoading } = useQuery<NodeWithAuthor[]>({
    queryKey: ["/api/nodes", topicId],
  });

  const { data: userReactions } = useQuery<Reaction[]>({
    queryKey: ["/api/reactions", topicId],
    enabled: isAuthenticated,
  });

  const reactionMutation = useMutation({
    mutationFn: async (data: { topicId?: string; nodeId?: string; type: "like" | "dislike" }) => {
      return apiRequest("POST", "/api/reactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics", topicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/nodes", topicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/reactions", topicId] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const nodeTree = useMemo(() => {
    if (!nodes) return [];
    
    const nodeMap = new Map<string, NodeTree>();
    const rootNodes: NodeTree[] = [];
    
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });
    
    nodes.forEach(node => {
      const treeNode = nodeMap.get(node.id)!;
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(treeNode);
      } else if (!node.parentId) {
        rootNodes.push(treeNode);
      }
    });
    
    const sortNodes = (nodeList: NodeTree[]): NodeTree[] => {
      const sorted = [...nodeList].sort((a, b) => {
        switch (sortBy) {
          case "likes":
            return b.likeCount - a.likeCount;
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "engagement":
            return (b.likeCount + b.dislikeCount + b.replyCount) - (a.likeCount + a.dislikeCount + a.replyCount);
          default:
            return 0;
        }
      });
      sorted.forEach(node => {
        node.children = sortNodes(node.children);
      });
      return sorted;
    };
    
    return sortNodes(rootNodes);
  }, [nodes, sortBy]);

  const getUserReaction = (nodeId: string) => {
    return userReactions?.find(r => r.nodeId === nodeId)?.type as "like" | "dislike" | null;
  };

  const getTopicReaction = () => {
    return userReactions?.find(r => r.topicId === topicId && !r.nodeId)?.type as "like" | "dislike" | null;
  };

  const openReplySheet = (parentId: string | null, parentAuthor: string, initialType: NodeType) => {
    setReplySheet({ isOpen: true, parentId, parentAuthor, initialType });
  };

  const closeReplySheet = () => {
    setReplySheet({ isOpen: false, parentId: null, parentAuthor: "", initialType: "neutral" });
  };

  const handleNodeReply = (nodeId: string, authorName: string) => {
    openReplySheet(nodeId, authorName, "neutral");
  };

  const handleNodeLike = (nodeId: string) => {
    reactionMutation.mutate({ nodeId, type: "like" });
  };

  const handleNodeDislike = (nodeId: string) => {
    reactionMutation.mutate({ nodeId, type: "dislike" });
  };

  const handleTopicLike = () => {
    reactionMutation.mutate({ topicId, type: "like" });
  };

  const handleTopicDislike = () => {
    reactionMutation.mutate({ topicId, type: "dislike" });
  };

  const renderNodeTree = (nodeList: NodeTree[], depth = 0): React.ReactNode => {
    return nodeList.map(node => (
      <DiscussionNode
        key={node.id}
        node={node}
        author={node.author}
        depth={depth}
        onReply={handleNodeReply}
        onLike={handleNodeLike}
        onDislike={handleNodeDislike}
        userReaction={getUserReaction(node.id)}
        isAuthenticated={isAuthenticated}
      >
        {node.children.length > 0 && renderNodeTree(node.children, depth + 1)}
      </DiscussionNode>
    ));
  };

  if (topicLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-muted animate-pulse" />
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-4">
          <Card className="p-4 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 w-3/4 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
          </Card>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Discussion not found</h2>
          <p className="text-muted-foreground mt-2">This topic may have been deleted.</p>
          <Button asChild className="mt-4">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
        <MobileNav />
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(topic.createdAt), { addSuffix: true });
  const topicReaction = getTopicReaction();

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
            <span className="font-medium truncate">Discussion</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" data-testid="button-share">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <Card className="p-4" data-testid="topic-detail">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={topic.author?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {topic.author?.firstName?.[0] || "A"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {topic.author?.firstName || "Anonymous"} {topic.author?.lastName || ""}
                </span>
                <span className="text-muted-foreground text-sm">{timeAgo}</span>
              </div>
              
              <h1 className="text-xl font-bold mt-2 leading-tight">{topic.title}</h1>
              
              {topic.content && (
                <p className="text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                  {topic.content}
                </p>
              )}
              
              {topic.imageUrl && (
                <div className="mt-4 rounded-lg overflow-hidden">
                  <img 
                    src={topic.imageUrl} 
                    alt="" 
                    className="w-full object-cover max-h-96"
                  />
                </div>
              )}
              
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 text-agree border-agree/30 bg-agree-bg">
                    <CheckCircle className="h-3 w-3" />
                    <span>{topic.agreeCount} agree</span>
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-disagree border-disagree/30 bg-disagree-bg">
                    <XCircle className="h-3 w-3" />
                    <span>{topic.disagreeCount} disagree</span>
                  </Badge>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("gap-1", topicReaction === "like" && "text-agree")}
                  onClick={handleTopicLike}
                  disabled={!isAuthenticated}
                  data-testid="button-topic-like"
                >
                  <ThumbsUp className="h-4 w-4" />
                  {topic.likeCount}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("gap-1", topicReaction === "dislike" && "text-disagree")}
                  onClick={handleTopicDislike}
                  disabled={!isAuthenticated}
                  data-testid="button-topic-dislike"
                >
                  <ThumbsDown className="h-4 w-4" />
                  {topic.dislikeCount}
                </Button>
                <span className="text-muted-foreground text-sm flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {topic.nodeCount} responses
                </span>
              </div>
            </div>
          </div>
        </Card>

        {isAuthenticated && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 text-agree border-agree/30 bg-agree-bg"
              onClick={() => openReplySheet(null, "", "agree")}
              data-testid="button-add-agree"
            >
              <CheckCircle className="h-4 w-4" />
              Agree
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 text-disagree border-disagree/30 bg-disagree-bg"
              onClick={() => openReplySheet(null, "", "disagree")}
              data-testid="button-add-disagree"
            >
              <XCircle className="h-4 w-4" />
              Disagree
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => openReplySheet(null, "", "neutral")}
              data-testid="button-add-neutral"
            >
              <MessageSquare className="h-4 w-4" />
              Comment
            </Button>
          </div>
        )}

        {(nodeTree.length > 0 || nodesLoading) && (
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Responses</h2>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-36 h-8" data-testid="select-sort">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="likes">Most Liked</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="engagement">Most Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {nodesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <NodeSkeleton key={i} depth={0} />
            ))}
          </div>
        ) : nodeTree.length > 0 ? (
          <div className="space-y-3">
            {renderNodeTree(nodeTree)}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium">No responses yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Be the first to share your thoughts!
            </p>
          </div>
        )}
      </main>

      <MobileNav />

      <ReplySheet
        isOpen={replySheet.isOpen}
        onClose={closeReplySheet}
        topicId={topicId!}
        parentId={replySheet.parentId}
        parentAuthor={replySheet.parentAuthor}
        initialType={replySheet.initialType}
      />
    </div>
  );
}
