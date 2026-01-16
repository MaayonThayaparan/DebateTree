import { useState } from "react";
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
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import type { NodeType } from "@shared/schema";

interface CreateNodeFormProps {
  topicId: string;
  parentId?: string | null;
  initialType?: NodeType;
  onClose?: () => void;
  onSuccess?: () => void;
}

const nodeTypeOptions: { type: NodeType; icon: typeof CheckCircle; label: string; colorClass: string }[] = [
  { type: "agree", icon: CheckCircle, label: "Agree", colorClass: "text-agree border-agree bg-agree-bg" },
  { type: "disagree", icon: XCircle, label: "Disagree", colorClass: "text-disagree border-disagree bg-disagree-bg" },
  { type: "neutral", icon: Minus, label: "Neutral", colorClass: "text-neutral border-neutral bg-neutral-bg" },
];

export function CreateNodeForm({ 
  topicId, 
  parentId = null, 
  initialType = "neutral",
  onClose,
  onSuccess
}: CreateNodeFormProps) {
  const [type, setType] = useState<NodeType>(initialType);
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      onSuccess?.();
      onClose?.();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    createNodeMutation.mutate({
      topicId,
      parentId,
      type,
      content: content.trim(),
    });
  };

  const selectedOption = nodeTypeOptions.find(o => o.type === type)!;

  const typeIndicatorClass = type === "agree" ? "bg-agree" : type === "disagree" ? "bg-disagree" : "bg-neutral";
  
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", typeIndicatorClass)} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {nodeTypeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = type === option.type;
              return (
                <Button
                  key={option.type}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-1.5 transition-all",
                    isSelected && option.colorClass
                  )}
                  onClick={() => setType(option.type)}
                  data-testid={`button-type-${option.type}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{option.label}</span>
                </Button>
              );
            })}
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-form"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Textarea
          placeholder={`Share your ${type === "agree" ? "agreement" : type === "disagree" ? "disagreement" : "thoughts"}...`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="resize-none"
          data-testid="input-node-content"
        />
        
        <div className="flex justify-end">
          <Button
            type="submit"
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
                Post Response
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
