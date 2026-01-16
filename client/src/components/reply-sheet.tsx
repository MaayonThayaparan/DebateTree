import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle, 
  XCircle, 
  Minus, 
  Send, 
  Loader2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { NodeType } from "@shared/schema";

interface ReplySheetProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  parentId?: string | null;
  parentAuthor?: string;
  initialType?: NodeType;
}

const nodeTypeOptions: { type: NodeType; icon: typeof CheckCircle; label: string; activeClass: string }[] = [
  { type: "agree", icon: CheckCircle, label: "Agree", activeClass: "bg-agree text-white" },
  { type: "disagree", icon: XCircle, label: "Disagree", activeClass: "bg-disagree text-white" },
  { type: "neutral", icon: Minus, label: "Neutral", activeClass: "bg-neutral text-white" },
];

export function ReplySheet({ 
  isOpen,
  onClose,
  topicId, 
  parentId = null,
  parentAuthor,
  initialType = "neutral",
}: ReplySheetProps) {
  const [type, setType] = useState<NodeType>(initialType);
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setContent("");
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialType]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const createNodeMutation = useMutation({
    mutationFn: async (data: { 
      topicId: string; 
      parentId: string | null; 
      type: NodeType; 
      content: string 
    }) => {
      return apiRequest("POST", "/api/nodes", data);
    },
    onSuccess: () => {
      toast({
        title: "Response added",
        description: "Your response has been posted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/topics", topicId] });
      queryClient.invalidateQueries({ queryKey: ["/api/nodes", topicId] });
      setContent("");
      onClose();
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
        return;
      }
      toast({
        title: "Error",
        description: "Failed to post response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    
    createNodeMutation.mutate({
      topicId,
      parentId,
      type,
      content: content.trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        data-testid="reply-sheet-backdrop"
      />
      
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-xl shadow-lg animate-in slide-in-from-bottom duration-200"
        data-testid="reply-sheet"
      >
        <div className="max-w-2xl mx-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {parentAuthor ? `Replying to ${parentAuthor}` : "Add your response"}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-reply"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            {nodeTypeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = type === option.type;
              return (
                <Button
                  key={option.type}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "flex-1 gap-1.5 transition-all",
                    isSelected && option.activeClass
                  )}
                  onClick={() => setType(option.type)}
                  data-testid={`button-type-${option.type}`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>
          
          <Textarea
            ref={textareaRef}
            placeholder={`Share your ${type === "agree" ? "agreement" : type === "disagree" ? "disagreement" : "thoughts"}...`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none text-base"
            data-testid="input-node-content"
          />
          
          <div className="flex justify-end pb-safe">
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || createNodeMutation.isPending}
              className="gap-2"
              data-testid="button-submit-node"
            >
              {createNodeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
