import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardForm, type DashboardFormValues } from "./DashboardForm";
import { useGetProject, useCreateDashboard, getListDashboardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export function CreateDashboard() {
  const [, params] = useRoute("/projects/:projectSlug/new");
  const slug = params?.projectSlug || "";
  const { ownerToken } = useAuth();
  const { data: project } = useGetProject(slug);
  const createDashboard = useCreateDashboard();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = (data: DashboardFormValues) => {
    const formattedData = {
      ...data,
      createdByToken: ownerToken,
      stages: data.stages.map((s, i) => ({ ...s, order: i }))
    };

    createDashboard.mutate({ projectSlug: slug, data: formattedData }, {
      onSuccess: (res) => {
        toast({ title: "대시보드가 생성되었습니다." });
        queryClient.invalidateQueries({ queryKey: getListDashboardsQueryKey(slug) });
        setLocation(`/projects/${slug}/${res.slug}`);
      },
      onError: (err: any) => {
        console.error("create dashboard error", err);
        console.error("error data", err?.data);
        toast({
          variant: "destructive",
          title: "생성 실패",
          description:
            err?.data?.detail?.message ||
            err?.data?.detail?.error ||
            err?.data?.error ||
            err?.message ||
            "알 수 없는 오류",
        });
      }
    });
    console.log("ownerToken:", ownerToken);
    console.log("formattedData:", formattedData);
  };

  return (
    <MainLayout>
      <div className="mb-8">
        <Link href={`/projects/${slug}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> 프로젝트로 돌아가기
        </Link>
        <h1 className="text-3xl font-display font-bold text-foreground">새 대시보드 만들기</h1>
      </div>
      <DashboardForm 
        onSubmit={handleSubmit} 
        isPending={createDashboard.isPending} 
        projectName={project?.name || "로딩 중..."} 
      />
    </MainLayout>
  );
}
