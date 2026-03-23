import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetDashboard, useDeleteDashboard, getListDashboardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FunnelChart } from "@/components/FunnelChart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Edit3, Trash2, BrainCircuit, NotebookPen } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function DashboardDetail() {
  const [, params] = useRoute("/projects/:projectSlug/:dashboardSlug");
  const pSlug = params?.projectSlug || "";
  const dSlug = params?.dashboardSlug || "";
  const { ownerToken, isAdmin } = useAuth();
  
  const { data: dashboard, isLoading } = useGetDashboard(pSlug, dSlug);
  const deleteDashboard = useDeleteDashboard();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-8 animate-pulse">
          <div className="h-12 bg-muted rounded-xl w-2/3" />
          <div className="h-64 bg-muted rounded-2xl w-full" />
        </div>
      </MainLayout>
    );
  }
  if (!dashboard) return <MainLayout>대시보드를 찾을 수 없습니다.</MainLayout>;

  const isOwner = dashboard.createdByToken === ownerToken || isAdmin;

  const handleDelete = () => {
    if (!confirm("정말 이 대시보드를 삭제하시겠습니까?")) return;
    deleteDashboard.mutate({ projectSlug: pSlug, dashboardSlug: dSlug }, {
      onSuccess: () => {
        toast({ title: "대시보드가 삭제되었습니다." });
        queryClient.invalidateQueries({ queryKey: getListDashboardsQueryKey(pSlug) });
        setLocation(`/projects/${pSlug}`);
      }
    });
  };

  // Interpretation Logic
  const getInterpretation = () => {
    const stages = dashboard.stages;
    const interpretations = [];
    
    for (let i = 1; i < stages.length; i++) {
      const stage = stages[i];
      const prev = stages[i-1];
      const val = stage.metricValue || 0;
      const prevVal = prev.metricValue || 0;
      
      let convRate = stage.conversionRate;
      let dropRate = stage.dropOffRate;

      if (convRate == null && prevVal > 0) convRate = (val / prevVal) * 100;
      if (dropRate == null && convRate != null) dropRate = 100 - convRate;

      if (dropRate != null) {
        if (dropRate >= 50) interpretations.push({ stage: stage.customLabel, text: "이탈이 크게 발생하고 있습니다.", type: "danger" });
        else if (dropRate >= 30) interpretations.push({ stage: stage.customLabel, text: "상대적으로 이탈이 높은 편입니다.", type: "warning" });
        else interpretations.push({ stage: stage.customLabel, text: "전환 흐름이 비교적 안정적입니다.", type: "good" });
      }
    }
    return interpretations;
  };

  const interpretations = getInterpretation();
  const hasNotes = dashboard.stages.some(s => s.note);

  return (
    <MainLayout>
      <div className="no-print mb-8">
        <Link href={`/projects/${pSlug}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> 프로젝트로 돌아가기
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">{dashboard.title}</h1>
              {isOwner && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary uppercase">My Board</span>}
            </div>
            {dashboard.serviceName && <p className="text-lg text-muted-foreground mt-1">{dashboard.serviceName}</p>}
            <p className="text-xs text-muted-foreground/60 mt-3">
              생성일: {format(new Date(dashboard.createdAt), 'yyyy년 MM월 dd일')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl border-border/80 text-foreground bg-white hover:bg-muted/50">
              <Printer className="w-4 h-4 mr-2" /> 인쇄하기
            </Button>
            {isOwner && (
              <Link href={`/projects/${pSlug}/${dSlug}/edit`}>
                <Button variant="secondary" className="rounded-xl bg-secondary/40 text-secondary-foreground hover:bg-secondary/60">
                  <Edit3 className="w-4 h-4 mr-2" /> 수정
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Button variant="destructive" onClick={handleDelete} className="rounded-xl">
                <Trash2 className="w-4 h-4 mr-2" /> 삭제
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold">{dashboard.title}</h1>
        {dashboard.serviceName && <h2 className="text-xl text-gray-600">{dashboard.serviceName}</h2>}
      </div>

      <div className="bg-white/40 backdrop-blur-sm rounded-3xl border border-border/50 p-4 sm:p-8 mb-8 shadow-sm">
        <FunnelChart stages={dashboard.stages} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside-avoid">
        {/* Interpretations */}
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-2xl p-6 sm:p-8">
          <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-6 text-foreground">
            <BrainCircuit className="text-primary w-5 h-5" /> 자동 분석 해설
          </h3>
          <ul className="space-y-4">
            {interpretations.length > 0 ? interpretations.map((item, idx) => (
              <li key={idx} className="flex flex-col gap-1 text-sm bg-white/60 p-4 rounded-xl shadow-sm border border-white/50">
                <span className="font-bold text-foreground">{item.stage} 전환 구간</span>
                <span className={`
                  ${item.type === 'danger' ? 'text-destructive font-semibold' : ''}
                  ${item.type === 'warning' ? 'text-orange-500 font-semibold' : ''}
                  ${item.type === 'good' ? 'text-emerald-600 font-medium' : ''}
                `}>
                  {item.text}
                </span>
              </li>
            )) : (
              <li className="text-muted-foreground text-sm">입력된 수치가 부족하여 분석할 수 없습니다.</li>
            )}
          </ul>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-border/50 shadow-sm">
          <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-6 text-foreground">
            <NotebookPen className="text-secondary-foreground w-5 h-5" /> 분석 메모
          </h3>
          {hasNotes ? (
            <ul className="space-y-4">
              {dashboard.stages.filter(s => s.note).map((stage, idx) => (
                <li key={idx} className="border-l-2 border-secondary pl-4 py-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">{stage.customLabel}</span>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{stage.note}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center text-muted-foreground py-10 text-sm bg-muted/20 rounded-xl">
              아직 입력된 메모가 없습니다.
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
