import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  useListProjects, useCreateProject, useUpdateProject,
  useDeleteProject, getListProjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderPlus, Trash2, ArrowRight, LayoutTemplate, Pencil, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@workspace/api-client-react";

export function Projects() {
  const { isAdmin } = useAuth();
  //const { data: allProjects, isLoading } = useListProjects();
  const { data, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filter hidden projects for non-admins
  const allProjects: Project[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];
  const projects: Project[] = isAdmin
    ? allProjects
    : allProjects.filter((p) => !p.isHidden);
  
  console.log("projects page data:", {
    rawData: data,
    allProjects,
    projects,
    isAdmin,
  });
  
  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createHidden, setCreateHidden] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHidden, setEditHidden] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    createProject.mutate({ data: { name: createName, description: createDescription, isHidden: createHidden } }, {
      onSuccess: () => {
        toast({ title: "프로젝트 생성 완료" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setCreateOpen(false);
        setCreateName("");
        setCreateDescription("");
        setCreateHidden(false);
      },
      onError: () => toast({ variant: "destructive", title: "생성 실패" })
    });
  };

  const openEdit = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTarget(project);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditHidden(project.isHidden);
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editName.trim()) return;
    updateProject.mutate({
      projectSlug: editTarget.slug,
      data: { name: editName, description: editDescription, isHidden: editHidden }
    }, {
      onSuccess: () => {
        toast({ title: "프로젝트 수정 완료" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setEditOpen(false);
        setEditTarget(null);
      },
      onError: () => toast({ variant: "destructive", title: "수정 실패" })
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
          <h1 className="text-3xl font-bold text-foreground">프로젝트 목록</h1>
          <p className="text-muted-foreground mt-1">프로젝트를 선택하세요.</p>
        </div>

        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-xl gap-2">
                <FolderPlus className="w-4 h-4" /> 새 프로젝트
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">새 프로젝트 만들기</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label>프로젝트 이름 <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="예: 24년 1분기 퍼널 스터디"
                    value={createName}
                    onChange={e => setCreateName(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명 <span className="text-muted-foreground font-normal">(선택)</span></Label>
                  <Textarea
                    placeholder="프로젝트에 대한 간단한 설명을 입력하세요."
                    value={createDescription}
                    onChange={e => setCreateDescription(e.target.value)}
                    className="rounded-xl resize-none h-24"
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">관리자 전용 비공개</p>
                    <p className="text-xs text-muted-foreground mt-0.5">켜면 관리자만 이 프로젝트를 볼 수 있습니다.</p>
                  </div>
                  <Switch checked={createHidden} onCheckedChange={setCreateHidden} />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={createProject.isPending}>
                  {createProject.isPending ? "생성 중..." : "생성하기"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">프로젝트 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>프로젝트 이름 <span className="text-destructive">*</span></Label>
              <Input
                placeholder="프로젝트 이름"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>설명 <span className="text-muted-foreground font-normal">(선택)</span></Label>
              <Textarea
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요."
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="rounded-xl resize-none h-24"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                  관리자 전용 비공개
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">켜면 관리자만 이 프로젝트를 볼 수 있습니다.</p>
              </div>
              <Switch checked={editHidden} onCheckedChange={setEditHidden} />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setEditOpen(false)}>
                취소
              </Button>
              <Button type="submit" className="flex-1 rounded-xl font-semibold" disabled={updateProject.isPending}>
                {updateProject.isPending ? "저장 중..." : "저장하기"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
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
          <p className="text-muted-foreground mt-2 max-w-sm">
            {isAdmin ? "새 프로젝트 버튼을 눌러 워크샵 프로젝트를 생성해보세요." : "관리자가 아직 프로젝트를 생성하지 않았습니다."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => (
            <Link key={project.id} href={`/projects/${project.slug}`}>
              <Card className={`h-full cursor-pointer hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group bg-card flex flex-col hover:-translate-y-1 ${project.isHidden ? 'border-orange-200 bg-orange-50/30' : 'hover:border-primary/30'}`}>
                <CardHeader className="pb-4 relative border-b border-border/30 bg-gradient-to-br from-transparent to-muted/30">
                  <div className="flex items-start justify-between gap-2 pr-1">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors truncate">
                        {project.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <CardDescription className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                          대시보드 {project.dashboardCount}개
                        </CardDescription>
                        {project.isHidden && isAdmin && (
                          <span className="text-xs font-medium bg-orange-100 text-orange-600 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> 비공개
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary z-10"
                          onClick={(e) => openEdit(project, e)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive z-10"
                          onClick={(e) => handleDelete(project.slug, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || "설명이 없습니다."}
                  </p>
                  <div className="flex items-center justify-between mt-6 text-xs text-muted-foreground/80">
                    <span>
                      {project.createdAt && !Number.isNaN(new Date(project.createdAt).getTime())
                        ? format(new Date(project.createdAt), "yyyy.MM.dd")
                        : "-"}
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
