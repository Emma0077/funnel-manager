import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { useListProjects, useCreateProject, useDeleteProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderPlus, Trash2, ArrowRight, LayoutTemplate } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export function Projects() {
  const { isAdmin } = useAuth();
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createProject.mutate({
      data: { name, description }
    }, {
      onSuccess: () => {
        toast({ title: "프로젝트 생성 성공" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setOpen(false);
        setName("");
        setDescription("");
      },
      onError: () => toast({ variant: "destructive", title: "생성 실패" })
    });
  };

  const handleDelete = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("정말 이 프로젝트를 삭제하시겠습니까? 관련된 대시보드도 모두 삭제됩니다.")) return;
    
    deleteProject.mutate({ projectSlug: slug }, {
      onSuccess: () => {
        toast({ title: "프로젝트 삭제됨" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      }
    });
  };

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">워크샵 프로젝트</h1>
          <p className="text-muted-foreground mt-1">AARRR 퍼널 분석을 진행할 프로젝트를 선택하세요.</p>
        </div>

        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-xl transition-all duration-300 hover:-translate-y-0.5">
                <FolderPlus className="w-4 h-4 mr-2" /> 새 프로젝트
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display">새 프로젝트 만들기</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label>프로젝트 이름 <span className="text-destructive">*</span></Label>
                  <Input 
                    placeholder="예: 24년 1분기 퍼널 스터디" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="rounded-xl border-border/60 focus:border-primary/50 bg-background/50 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명 (선택)</Label>
                  <Textarea 
                    placeholder="프로젝트에 대한 간단한 설명을 입력하세요." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    className="rounded-xl border-border/60 focus:border-primary/50 bg-background/50 resize-none h-24"
                  />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={createProject.isPending}>
                  {createProject.isPending ? "생성 중..." : "생성하기"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-white/50 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white/40 rounded-3xl border border-dashed border-border/80">
          <LayoutTemplate className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-semibold text-foreground">프로젝트가 없습니다</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">관리자 계정으로 로그인하여 새 워크샵 프로젝트를 생성해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link href={`/projects/${project.slug}`}>
                <Card className="h-full cursor-pointer hover:shadow-xl hover:border-primary/30 transition-all duration-300 rounded-2xl overflow-hidden group bg-card flex flex-col hover:-translate-y-1">
                  <CardHeader className="pb-4 relative border-b border-border/30 bg-gradient-to-br from-transparent to-muted/30">
                    <CardTitle className="text-xl font-display group-hover:text-primary transition-colors pr-8">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="text-xs font-medium bg-primary/10 text-primary w-fit px-2.5 py-0.5 rounded-full mt-2">
                      대시보드 {project.dashboardCount}개
                    </CardDescription>
                    
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 text-muted-foreground hover:bg-destructive/10 hover:text-destructive z-10 w-8 h-8 rounded-full"
                        onClick={(e) => handleDelete(project.slug, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description || "설명이 없습니다."}
                    </p>
                    <div className="flex items-center justify-between mt-6 text-xs text-muted-foreground/80">
                      <span>{format(new Date(project.createdAt), 'yyyy.MM.dd')}</span>
                      <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
