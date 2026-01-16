import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { TreePine, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <TreePine className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-muted-foreground mt-2 text-center">
        This page doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-6 gap-2" data-testid="button-go-home">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </Button>
    </div>
  );
}
