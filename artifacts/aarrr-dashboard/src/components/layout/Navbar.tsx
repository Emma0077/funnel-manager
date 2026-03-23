import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Shield, Sparkles, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Navbar() {
  const { isAdmin, loginAdmin, logoutAdmin } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(email)) {
      toast({ title: "관리자 로그인 성공", description: "관리자 권한이 활성화되었습니다." });
      setEmail("");
    } else {
      toast({ variant: "destructive", title: "로그인 실패", description: "이메일이 일치하지 않습니다." });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/60 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/projects" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300">
            <LayoutDashboard size={22} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent font-display hidden sm:block">
            AARRR Builder
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {isAdmin ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                <Sparkles size={14} /> 관리자 모드
              </span>
              <Button variant="ghost" size="sm" onClick={logoutAdmin} className="text-muted-foreground hover:text-destructive">
                <LogOut size={16} className="mr-2" /> 로그아웃
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="flex items-center gap-2">
              <Input 
                type="email" 
                placeholder="관리자 이메일..." 
                className="w-40 sm:w-56 h-9 text-sm bg-white/50 border-white/40 focus:border-primary/50 transition-all rounded-full px-4"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" size="sm" variant="secondary" className="rounded-full h-9 px-4 font-semibold text-primary-foreground bg-primary hover:bg-primary/90">
                <Shield size={14} className="mr-1.5" /> 인증
              </Button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
