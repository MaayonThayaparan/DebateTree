import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  TreePine, 
  MessageSquare, 
  ThumbsUp, 
  Users, 
  TrendingUp,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles
} from "lucide-react";

const features = [
  {
    icon: TreePine,
    title: "Tree-Structured Debates",
    description: "Organize discussions into agree, disagree, and neutral branches. See the full picture of any debate.",
  },
  {
    icon: MessageSquare,
    title: "Meaningful Conversations",
    description: "No more lost comments or repeated arguments. Every response is connected and categorized.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Join thousands of thoughtful people discussing topics that matter, from casual to academic.",
  },
  {
    icon: TrendingUp,
    title: "Measure Consensus",
    description: "See real-time agreement ratios and engagement metrics on every topic and response.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <TreePine className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">DebateTree</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-header-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>A new way to discuss</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Debates that make
              <span className="text-primary"> sense</span>
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Structure your discussions into agree, disagree, and neutral nodes. 
              Make conversations clearer, more thoughtful, and measurable.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2 h-12 px-8" asChild data-testid="button-get-started">
                <a href="/api/login">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 h-12 px-8" asChild>
                <Link href="/">
                  Browse Discussions
                </Link>
              </Button>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-agree" />
                Free forever
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-agree" />
                No credit card
              </span>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-card/50">
          <div className="max-w-5xl mx-auto">
            <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-medium">A</span>
                  </div>
                  <div>
                    <span className="font-medium">Alex</span>
                    <span className="text-muted-foreground text-sm ml-2">2 hours ago</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Should remote work become the default for knowledge workers?</h3>
                <p className="text-muted-foreground">With advances in technology and proven productivity during the pandemic, is it time to make remote work the standard rather than the exception?</p>
                
                <div className="mt-6 space-y-3">
                  <div className="rounded-lg p-4 bg-agree-bg border-l-4 border-l-agree">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-agree" />
                      <span className="text-agree font-medium text-sm">Agrees</span>
                      <span className="text-sm">Jordan</span>
                    </div>
                    <p className="text-sm">Absolutely. Studies show remote workers are 13% more productive. Plus, it opens opportunities for people regardless of location.</p>
                    <div className="flex items-center gap-3 mt-2 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> 47
                      </span>
                      <span>12 replies</span>
                    </div>
                  </div>
                  
                  <div className="rounded-lg p-4 bg-disagree-bg border-l-4 border-l-disagree">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-disagree" />
                      <span className="text-disagree font-medium text-sm">Disagrees</span>
                      <span className="text-sm">Sam</span>
                    </div>
                    <p className="text-sm">Not entirely. Some roles require in-person collaboration. A hybrid approach makes more sense than an all-or-nothing policy.</p>
                    <div className="flex items-center gap-3 mt-2 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> 32
                      </span>
                      <span>8 replies</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Why DebateTree?</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                Traditional forums flatten debates. We structure them for clarity.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-xl border border-border bg-card hover-elevate transition-all duration-200"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-primary text-primary-foreground">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to join the conversation?</h2>
            <p className="mt-4 text-primary-foreground/80 text-lg">
              Start debating thoughtfully with people who value structured discourse.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="mt-8 h-12 px-8 gap-2"
              asChild
              data-testid="button-footer-signup"
            >
              <a href="/api/login">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <TreePine className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">DebateTree</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Making discussions clearer, one node at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
