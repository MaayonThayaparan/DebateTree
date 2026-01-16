import { useState } from "react";
import { 
  ThumbsUp, 
  ThumbsDown, 
  ChevronDown, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Minus,
  Reply,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Node, NodeType } from "@shared/schema";
import type { User } from "@shared/models/auth";

interface DiscussionNodeProps {
  node: Node;
  author?: User | null;
  children?: React.ReactNode;
  depth?: number;
  onReply?: (nodeId: string, authorName: string) => void;
  onLike?: (nodeId: string) => void;
  onDislike?: (nodeId: string) => void;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onPromote?: (nodeId: string) => void;
  userReaction?: "like" | "dislike" | null;
  isAuthenticated?: boolean;
  currentUserId?: string | null;
}

const nodeTypeConfig = {
  agree: {
    icon: CheckCircle,
    label: "Agrees",
    bgClass: "bg-agree-bg",
    textClass: "text-agree",
    indicatorClass: "bg-agree",
  },
  disagree: {
    icon: XCircle,
    label: "Disagrees",
    bgClass: "bg-disagree-bg",
    textClass: "text-disagree",
    indicatorClass: "bg-disagree",
  },
  neutral: {
    icon: Minus,
    label: "Neutral",
    bgClass: "bg-neutral-bg",
    textClass: "text-neutral",
    indicatorClass: "bg-neutral",
  },
};

export function DiscussionNode({
  node,
  author,
  children,
  depth = 0,
  onReply,
  onLike,
  onDislike,
  onEdit,
  onDelete,
  onPromote,
  userReaction,
  isAuthenticated = false,
  currentUserId,
}: DiscussionNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const config = nodeTypeConfig[node.type];
  const TypeIcon = config.icon;
  const timeAgo = formatDistanceToNow(new Date(node.createdAt), { addSuffix: true });
  const hasChildren = node.replyCount > 0;
  const maxDepth = 4;
  const isMaxDepth = depth >= maxDepth;
  const isOwner = currentUserId && node.authorId === currentUserId;
  const isDeleted = node.isDeleted;
  const isEdited = node.editedAt != null;
  
  return (
    <div 
      className={cn(
        "relative",
        depth > 0 && "ml-4 md:ml-6"
      )}
      data-testid={`node-${node.id}`}
    >
      {depth > 0 && (
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-0.5",
            config.bgClass
          )}
          style={{ marginLeft: "-12px" }}
        />
      )}
      
      <div 
        className={cn(
          "rounded-md p-3 md:p-4 transition-colors relative overflow-hidden",
          config.bgClass
        )}
      >
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-md",
            config.indicatorClass
          )}
        />
        <div className="flex gap-2.5">
          <Avatar className="h-8 w-8 flex-shrink-0">
            {isDeleted ? (
              <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                ?
              </AvatarFallback>
            ) : (
              <>
                <AvatarImage src={author?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-card text-xs font-medium">
                  {author?.firstName?.[0] || "A"}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="secondary"
                className={cn("gap-1 text-xs", config.textClass)}
              >
                <TypeIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              {isDeleted ? (
                <span className="font-medium text-sm text-muted-foreground italic">
                  [deleted]
                </span>
              ) : (
                <span className="font-medium text-sm">
                  {author?.firstName || "Anonymous"}
                </span>
              )}
              <span className="text-muted-foreground text-xs">{timeAgo}</span>
              {isEdited && !isDeleted && (
                <span className="text-muted-foreground text-xs italic">(edited)</span>
              )}
              
              {isAuthenticated && !isDeleted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      data-testid={`button-menu-${node.id}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => onPromote?.(node.id)}
                      data-testid={`button-promote-${node.id}`}
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Start New Discussion
                    </DropdownMenuItem>
                    {isOwner && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => onEdit?.(node.id)}
                          data-testid={`button-edit-${node.id}`}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete?.(node.id)}
                          className="text-destructive"
                          data-testid={`button-delete-${node.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
              {node.content}
            </p>
            
            {node.imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden max-w-sm">
                <img 
                  src={node.imageUrl} 
                  alt="" 
                  className="w-full object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1 text-xs",
                  userReaction === "like" && "text-agree"
                )}
                onClick={() => onLike?.(node.id)}
                disabled={!isAuthenticated}
                data-testid={`button-like-${node.id}`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{node.likeCount}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1 text-xs",
                  userReaction === "dislike" && "text-disagree"
                )}
                onClick={() => onDislike?.(node.id)}
                disabled={!isAuthenticated}
                data-testid={`button-dislike-${node.id}`}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                <span>{node.dislikeCount}</span>
              </Button>
              
              {isAuthenticated && !isMaxDepth && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => onReply?.(node.id, author?.firstName || "Anonymous")}
                  data-testid={`button-reply-${node.id}`}
                >
                  <Reply className="h-3.5 w-3.5" />
                  Reply
                </Button>
              )}
              
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs ml-auto"
                  onClick={() => setIsExpanded(!isExpanded)}
                  data-testid={`button-expand-${node.id}`}
                >
                  {isExpanded ? (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Hide replies
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" />
                      {node.replyCount} replies
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && children && (
        <div className="mt-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function NodeSkeleton({ depth = 0 }: { depth?: number }) {
  return (
    <div className={cn("animate-pulse", depth > 0 && "ml-4 md:ml-6")}>
      <div className="rounded-lg p-4 bg-muted/50 border-l-4 border-muted">
        <div className="flex gap-2.5">
          <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-muted rounded-full" />
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="flex gap-2 mt-2">
              <div className="h-7 w-14 bg-muted rounded" />
              <div className="h-7 w-14 bg-muted rounded" />
              <div className="h-7 w-16 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
