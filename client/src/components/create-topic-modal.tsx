import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, ImageIcon, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "India",
  "Brazil",
  "Mexico",
  "Global",
];

interface CreateTopicModalProps {
  trigger?: React.ReactNode;
}

export function CreateTopicModal({ trigger }: CreateTopicModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [country, setCountry] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTopicMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; imageUrl?: string; country?: string }) => {
      return apiRequest("POST", "/api/topics", data);
    },
    onSuccess: () => {
      toast({
        title: "Topic created",
        description: "Your discussion topic has been posted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/topics"], exact: false });
      setOpen(false);
      setTitle("");
      setContent("");
      setImageUrl("");
      setCountry("");
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
        description: "Failed to create topic. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    createTopicMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
      country: country || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="icon"
            className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
            data-testid="button-create-topic"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a Discussion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="What's the topic?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium"
              data-testid="input-topic-title"
            />
          </div>
          <div>
            <Textarea
              placeholder="Share your thoughts... (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
              data-testid="input-topic-content"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Image URL (optional)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1"
                data-testid="input-topic-image"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="flex-1" data-testid="select-topic-country">
                  <SelectValue placeholder="Location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-topic"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || createTopicMutation.isPending}
              data-testid="button-submit-topic"
            >
              {createTopicMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post Discussion"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
