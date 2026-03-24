import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardForm, type DashboardFormValues } from "./DashboardForm";
import { useGetProject, useGetDashboard, useUpdateDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export function EditDashboard() {
  const [, params] = useRoute("/projects/:projectSlug/:dashboardSlug/edit");
  const pSlug = params?.projectSlug || "";
  const dSlug = params?.dashboardSlug || "";
  
  const { ownerToken, isAdmin } = useAuth();
  const { data: project } = useGetProject(pSlug);
  const { data: dashboard, isLoading } = useGetDashboard(pSlug, dSlug);
  const updateDashboard = useUpdateDashboard();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (isLoading) return <MainLayout><div className="animate-pulse h-10 bg-muted w-1/2 rounded-xl mb-8" /></MainLayout>;
  if (!dashboard) return <MainLayout>대시보드를 찾을 수 없습니다.</MainLayout>;

  // Check auth
  if (dashboard.createdByToken !== ownerToken && !isAdmin) {
    return (
      <MainLayout>
        <div className="py-20 text-center text-destructive">이 대시보드를 수정할 권한이 없습니다.</div>
      </MainLayout>
    );
  }

  const defaultValues: Partial<DashboardFormValues> = {
    title: dashboard.title,
    serviceName: dashboard.serviceName || "",
    periodStart: dashboard.periodStart || "",
    periodEnd: dashboard.periodEnd || "",
    stages: dashboard.stages.map(s => ({
      stageKey: s.stageKey,
      customLabel: s.customLabel,
      metricValue: s.metricValue,
      note: s.note
    }))
  };

  const handleSubmit = (data: DashboardFormValues) => {
    const formattedData = {
      title: data.title,
      serviceName: data.serviceName,
      periodStart: data.periodStart || null,
      periodEnd: data.periodEnd || null,
      ownerToken: ownerToken,
      stages: data.stages.map((s, i) => ({ ...s, order: i }))
    };

    updateDashboard.mutate({ projectSlug: pSlug, dashboardSlug: dSlug, data: formattedData }, {
      onSuccess: () => {
        toast({ title: "대시보드가 수정되었습니다." });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey(pSlug, dSlug) });
        setLocation(`/projects/${pSlug}/${dSlug}`);
      },
      onError: () => toast({ variant: "destructive", title: "수정 실패" })
    });
  };

  return (
    <MainLayout>
      <div className="mb-8">
        <Link href={`/projects/${pSlug}/${dSlug}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> 대시보드로 돌아가기
        </Link>
        <h1 className="text-3xl font-display font-bold text-foreground">대시보드 수정하기</h1>
      </div>
      <DashboardForm 
        defaultValues={defaultValues}
        onSubmit={handleSubmit} 
        isPending={updateDashboard.isPending} 
        projectName={project?.name || "로딩 중..."} 
      />
    </MainLayout>
  );
}
