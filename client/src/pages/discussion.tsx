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
  ArrowUpDown,
  Pencil,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [editDialog, setEditDialog] = useState<{ isOpen: boolean; nodeId: string | null; content: string }>({
    isOpen: false,
    nodeId: null,
    content: "",
  });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; nodeId: string | null }>({
    isOpen: false,
    nodeId: null,
  });
  const [topicEditDialog, setTopicEditDialog] = useState<{ isOpen: boolean; title: string; content: string }>({
    isOpen: false,
    title: "",
    content: "",
  });
  const [topicDeleteDialog, setTopicDeleteDialog] = useState(false);
  const [promoteDialog, setPromoteDialog] = useState<{ isOpen: boolean; nodeId: string | null; title: string }>({
    isOpen: false,
    nodeId: null,
    title: "",
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

  const editNodeMutation = useMutation({
    mutationFn: async ({ nodeId, content }: { nodeId: string; content: string }) => {
      return apiRequest("PATCH", `/api/nodes/${nodeId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes", topicId] });
      setEditDialog({ isOpen: false, nodeId: null, content: "" });
      toast({ title: "Response updated" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
      } else {
        toast({ title: "Error", description: "Failed to update response", variant: "destructive" });
      }
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      return apiRequest("DELETE", `/api/nodes/${nodeId}`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes", topicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/topics", topicId] });
      setDeleteDialog({ isOpen: false, nodeId: null });
      toast({ 
        title: data.softDeleted ? "Response marked as deleted" : "Response deleted",
        description: data.softDeleted ? "The response is preserved for conversation context" : undefined,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
      } else {
        toast({ title: "Error", description: "Failed to delete response", variant: "destructive" });
      }
    },
  });

  const editTopicMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      return apiRequest("PATCH", `/api/topics/${topicId}`, { title, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics", topicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/topics"], exact: false });
      setTopicEditDialog({ isOpen: false, title: "", content: "" });
      toast({ title: "Topic updated" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
      } else {
        toast({ title: "Error", description: "Failed to update topic", variant: "destructive" });
      }
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/topics/${topicId}`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"], exact: false });
      setTopicDeleteDialog(false);
      if (data.softDeleted) {
        queryClient.invalidateQueries({ queryKey: ["/api/topics", topicId] });
        toast({ 
          title: "Topic marked as deleted",
          description: "The topic is preserved for conversation context",
        });
      } else {
        toast({ title: "Topic deleted" });
        window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
      } else {
        toast({ title: "Error", description: "Failed to delete topic", variant: "destructive" });
      }
    },
  });

  const promoteNodeMutation = useMutation({
    mutationFn: async ({ nodeId, title }: { nodeId: string; title: string }) => {
      const res = await apiRequest("POST", `/api/nodes/${nodeId}/promote`, { title });
      return res.json();
    },
    onSuccess: (data: any) => {
      setPromoteDialog({ isOpen: false, nodeId: null, title: "" });
      toast({ title: "New discussion created!" });
      window.location.href = `/discussion/${data.id}`;
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
      } else {
        toast({ title: "Error", description: "Failed to create discussion", variant: "destructive" });
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

  const handleNodeEdit = (nodeId: string) => {
    const node = nodes?.find(n => n.id === nodeId);
    if (node) {
      setEditDialog({ isOpen: true, nodeId, content: node.content });
    }
  };

  const handleNodeDelete = (nodeId: string) => {
    setDeleteDialog({ isOpen: true, nodeId });
  };

  const confirmEdit = () => {
    if (editDialog.nodeId && editDialog.content.trim()) {
      editNodeMutation.mutate({ nodeId: editDialog.nodeId, content: editDialog.content });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.nodeId) {
      deleteNodeMutation.mutate(deleteDialog.nodeId);
    }
  };

  const handleTopicEdit = () => {
    if (topic) {
      setTopicEditDialog({ isOpen: true, title: topic.title, content: topic.content || "" });
    }
  };

  const handleTopicDelete = () => {
    setTopicDeleteDialog(true);
  };

  const confirmTopicEdit = () => {
    if (topicEditDialog.title.trim()) {
      editTopicMutation.mutate({ title: topicEditDialog.title, content: topicEditDialog.content });
    }
  };

  const confirmTopicDelete = () => {
    deleteTopicMutation.mutate();
  };

  const handleNodePromote = (nodeId: string) => {
    const node = nodes?.find(n => n.id === nodeId);
    setPromoteDialog({ 
      isOpen: true, 
      nodeId, 
      title: node?.content?.slice(0, 100) || "" 
    });
  };

  const confirmPromote = () => {
    if (promoteDialog.nodeId && promoteDialog.title.trim()) {
      promoteNodeMutation.mutate({ nodeId: promoteDialog.nodeId, title: promoteDialog.title });
    }
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
        onEdit={handleNodeEdit}
        onDelete={handleNodeDelete}
        onPromote={handleNodePromote}
        userReaction={getUserReaction(node.id)}
        isAuthenticated={isAuthenticated}
        currentUserId={user?.id}
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
  const isTopicOwner = user?.id && topic.authorId === user.id;
  const isTopicDeleted = topic.isDeleted;
  const isTopicEdited = topic.editedAt != null;

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
              {isTopicDeleted ? (
                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                  ?
                </AvatarFallback>
              ) : (
                <>
                  <AvatarImage src={topic.author?.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {topic.author?.firstName?.[0] || "A"}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isTopicDeleted ? (
                  <span className="font-medium text-muted-foreground italic">[deleted]</span>
                ) : (
                  <span className="font-medium">
                    {topic.author?.firstName || "Anonymous"} {topic.author?.lastName || ""}
                  </span>
                )}
                <span className="text-muted-foreground text-sm">{timeAgo}</span>
                {isTopicEdited && !isTopicDeleted && (
                  <span className="text-muted-foreground text-xs italic">(edited)</span>
                )}
                
                {isTopicOwner && !isTopicDeleted && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" data-testid="button-topic-menu">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleTopicEdit} data-testid="button-topic-edit">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleTopicDelete} className="text-destructive" data-testid="button-topic-delete">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
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

      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && setEditDialog({ isOpen: false, nodeId: null, content: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Response</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editDialog.content}
            onChange={(e) => setEditDialog({ ...editDialog, content: e.target.value })}
            placeholder="Edit your response..."
            className="min-h-[100px]"
            data-testid="input-edit-content"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ isOpen: false, nodeId: null, content: "" })}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEdit}
              disabled={!editDialog.content.trim() || editNodeMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {editNodeMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, nodeId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Response?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const node = nodes?.find(n => n.id === deleteDialog.nodeId);
                if (node && (node.replyCount > 0 || node.likeCount > 0 || node.dislikeCount > 0)) {
                  return "This response has replies or reactions. It will be marked as deleted but preserved for conversation context.";
                }
                return "This action cannot be undone. The response will be permanently deleted.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteNodeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={topicEditDialog.isOpen} onOpenChange={(open) => !open && setTopicEditDialog({ isOpen: false, title: "", content: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={topicEditDialog.title}
                onChange={(e) => setTopicEditDialog({ ...topicEditDialog, title: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                data-testid="input-edit-topic-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={topicEditDialog.content}
                onChange={(e) => setTopicEditDialog({ ...topicEditDialog, content: e.target.value })}
                placeholder="Edit your topic content..."
                className="min-h-[100px] mt-1"
                data-testid="input-edit-topic-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTopicEditDialog({ isOpen: false, title: "", content: "" })}
              data-testid="button-cancel-edit-topic"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmTopicEdit}
              disabled={!topicEditDialog.title.trim() || editTopicMutation.isPending}
              data-testid="button-confirm-edit-topic"
            >
              {editTopicMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={topicDeleteDialog} onOpenChange={setTopicDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic?</AlertDialogTitle>
            <AlertDialogDescription>
              This topic will be marked as deleted but preserved for conversation context.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-topic">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTopicDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-topic"
            >
              {deleteTopicMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={promoteDialog.isOpen} onOpenChange={(open) => !open && setPromoteDialog({ isOpen: false, nodeId: null, title: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a new discussion topic from this response. The original comment will be used as the content.
            </p>
            <div>
              <label className="text-sm font-medium">Discussion Title</label>
              <input
                type="text"
                value={promoteDialog.title}
                onChange={(e) => setPromoteDialog({ ...promoteDialog, title: e.target.value })}
                placeholder="Enter a title for the new discussion..."
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                data-testid="input-promote-title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPromoteDialog({ isOpen: false, nodeId: null, title: "" })}
              data-testid="button-cancel-promote"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPromote}
              disabled={!promoteDialog.title.trim() || promoteNodeMutation.isPending}
              data-testid="button-confirm-promote"
            >
              {promoteNodeMutation.isPending ? "Creating..." : "Create Discussion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
