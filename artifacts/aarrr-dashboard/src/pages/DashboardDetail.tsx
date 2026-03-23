import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetDashboard, useGetProject, useDeleteDashboard, getListDashboardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Printer, Edit3, Trash2,
  TrendingDown, TrendingUp, Minus,
  AlertTriangle, CheckCircle, Info,
  Lightbulb, StickyNote, BarChart3,
  Target, Zap
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Stage } from "@workspace/api-client-react";

export function DashboardDetail() {
  const [, params] = useRoute("/projects/:projectSlug/:dashboardSlug");
  const pSlug = params?.projectSlug || "";
  const dSlug = params?.dashboardSlug || "";
  const { ownerToken, isAdmin } = useAuth();

  const { data: dashboard, isLoading } = useGetDashboard(pSlug, dSlug);
  const { data: project } = useGetProject(pSlug);
  const deleteDashboard = useDeleteDashboard();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
          <div className="h-8 bg-muted rounded-lg w-1/3" />
          <div className="h-48 bg-muted rounded-2xl w-full" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
          </div>
        </div>
      </MainLayout>
    );
  }
  if (!dashboard) return <MainLayout><p className="text-muted-foreground">대시보드를 찾을 수 없습니다.</p></MainLayout>;

  const isOwner = dashboard.createdByToken === ownerToken || isAdmin;
  const stages: Stage[] = dashboard.stages || [];

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

  // Compute derived values per stage
  const enrichedStages = stages.map((stage, idx) => {
    const prev = stages[idx - 1];
    const val = stage.metricValue ?? 0;
    const prevVal = prev?.metricValue ?? 0;
    let convRate = stage.conversionRate ?? null;
    let dropRate = stage.dropOffRate ?? null;
    if (convRate == null && idx > 0 && prevVal > 0) convRate = Number(((val / prevVal) * 100).toFixed(1));
    if (dropRate == null && convRate != null) dropRate = Number((100 - convRate).toFixed(1));
    return { ...stage, _conv: convRate, _drop: dropRate, _val: val };
  });

  const firstStage = enrichedStages[0];
  const lastStage = enrichedStages[enrichedStages.length - 1];
  const totalConvRate = firstStage._val > 0 ? Number(((lastStage._val / firstStage._val) * 100).toFixed(1)) : null;

  // Find worst stage (highest drop-off)
  const worstStage = enrichedStages.slice(1).reduce<typeof enrichedStages[number] | null>((worst, s) => {
    if (s._drop == null) return worst;
    if (worst == null || (s._drop ?? 0) > (worst._drop ?? 0)) return s;
    return worst;
  }, null);

  // Find best converting stage (lowest drop-off, not first)
  const bestStage = enrichedStages.slice(1).reduce<typeof enrichedStages[number] | null>((best, s) => {
    if (s._drop == null) return best;
    if (best == null || (s._drop ?? 100) < (best._drop ?? 100)) return s;
    return best;
  }, null);

  const getStageColor = (drop: number | null) => {
    if (drop == null) return { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" };
    if (drop >= 50) return { bg: "bg-red-50", border: "border-red-200", text: "text-red-600", badge: "bg-red-100 text-red-700" };
    if (drop >= 30) return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", badge: "bg-orange-100 text-orange-700" };
    return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" };
  };

  const getInterpretationText = (drop: number | null) => {
    if (drop == null) return { text: "수치가 없어 분석할 수 없습니다.", icon: <Minus size={14} />, type: "neutral" };
    if (drop >= 50) return { text: "이 단계에서 이탈이 크게 발생하고 있습니다. 최우선 개선 대상입니다.", icon: <AlertTriangle size={14} />, type: "danger" };
    if (drop >= 30) return { text: "이 구간은 상대적으로 이탈이 높은 편입니다. 개선 여지가 있습니다.", icon: <TrendingDown size={14} />, type: "warning" };
    return { text: "전환 흐름이 비교적 안정적입니다. 이 단계의 성공 요인을 다른 단계에 적용해보세요.", icon: <CheckCircle size={14} />, type: "good" };
  };

  const getActionIdeas = () => {
    const ideas: string[] = [];
    enrichedStages.forEach((s, idx) => {
      if (idx === 0) return;
      const drop = s._drop ?? 0;
      if (drop >= 50) {
        if (s.stageKey === "activation") ideas.push(`${s.customLabel} 단계의 온보딩 UX를 점검하고, 사용자 첫 경험을 개선해보세요.`);
        else if (s.stageKey === "revenue") ideas.push(`${s.customLabel} 단계의 결제 흐름에서 장애물(불필요한 단계, 신뢰 신호 부족 등)을 제거해보세요.`);
        else if (s.stageKey === "retention") ideas.push(`${s.customLabel} 단계의 이탈이 높습니다. 이메일/푸시 리텐션 캠페인 또는 핵심 가치 리마인드를 시도해보세요.`);
        else ideas.push(`${s.customLabel} 단계에서 이탈 원인을 파악하기 위해 세션 녹화 또는 사용자 인터뷰를 진행해보세요.`);
      }
    });
    if (ideas.length === 0) ideas.push("전반적인 전환 흐름이 안정적입니다. A/B 테스트로 각 단계의 전환율을 추가로 개선해보세요.");
    if (totalConvRate !== null && totalConvRate < 5) ideas.push("전체 전환율이 낮습니다. 상위 유입 채널의 질을 점검하거나 퍼널 입구 단계의 타겟팅을 재검토해보세요.");
    return ideas;
  };

  const maxVal = Math.max(...enrichedStages.map(s => s._val));

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Back + Actions */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href={`/projects/${pSlug}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {project?.name ?? "프로젝트"}으로 돌아가기
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl gap-1.5">
              <Printer className="w-4 h-4" /> 인쇄하기
            </Button>
            {isOwner && (
              <Link href={`/projects/${pSlug}/${dSlug}/edit`}>
                <Button size="sm" variant="secondary" className="rounded-xl gap-1.5">
                  <Edit3 className="w-4 h-4" /> 수정
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Button size="sm" variant="destructive" onClick={handleDelete} className="rounded-xl gap-1.5">
                <Trash2 className="w-4 h-4" /> 삭제
              </Button>
            )}
          </div>
        </div>

        {/* Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/5 border border-primary/15 p-6 sm:p-8 print-break-inside-avoid">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
          <div className="relative">
            <div className="flex flex-wrap gap-2 mb-3">
              {isOwner && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary uppercase tracking-wider">
                  <Zap size={10} /> My Board
                </span>
              )}
              {dashboard.serviceName && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/60 text-muted-foreground border border-white/50">
                  {dashboard.serviceName}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{dashboard.title}</h1>
            <p className="text-sm text-muted-foreground">
              생성일: {format(new Date(dashboard.createdAt), 'yyyy년 MM월 dd일')}
              {dashboard.updatedAt !== dashboard.createdAt && ` · 수정일: ${format(new Date(dashboard.updatedAt), 'MM월 dd일')}`}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        {stages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print-break-inside-avoid">
            <div className="bg-white rounded-2xl border border-border/60 p-4 shadow-sm text-center">
              <p className="text-xs text-muted-foreground font-medium mb-1">분석 단계 수</p>
              <p className="text-2xl font-bold text-primary">{stages.length}단계</p>
            </div>
            <div className="bg-white rounded-2xl border border-border/60 p-4 shadow-sm text-center">
              <p className="text-xs text-muted-foreground font-medium mb-1">총 유입</p>
              <p className="text-2xl font-bold text-foreground">{(firstStage._val).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl border border-border/60 p-4 shadow-sm text-center">
              <p className="text-xs text-muted-foreground font-medium mb-1">최종 전환</p>
              <p className="text-2xl font-bold text-foreground">{(lastStage._val).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl border border-border/60 p-4 shadow-sm text-center">
              <p className="text-xs text-muted-foreground font-medium mb-1">전체 전환율</p>
              <p className={`text-2xl font-bold ${totalConvRate !== null && totalConvRate >= 10 ? "text-emerald-600" : "text-orange-500"}`}>
                {totalConvRate !== null ? `${totalConvRate}%` : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Funnel Visualization */}
        <div className="bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden print-break-inside-avoid">
          <div className="px-6 pt-6 pb-2 border-b border-border/40 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">AARRR 퍼널 시각화</h2>
          </div>
          <div className="p-6 sm:p-8">
            <div className="space-y-2">
              {enrichedStages.map((stage, idx) => {
                const barWidth = maxVal > 0 ? Math.max((stage._val / maxVal) * 100, 5) : 0;
                const colors = getStageColor(stage._drop);
                return (
                  <div key={idx} className="print-break-inside-avoid">
                    {idx > 0 && (
                      <div className="flex items-center gap-3 my-2 px-2">
                        <div className="w-px h-6 bg-gradient-to-b from-border to-transparent mx-6" />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {stage._conv != null ? (
                            <>
                              <span className={`font-semibold ${colors.text}`}>
                                전환율 {stage._conv}%
                              </span>
                              {stage._drop != null && (
                                <span className="text-muted-foreground/60">· 이탈 {stage._drop}%</span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground/50">수치 없음</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="relative rounded-xl overflow-hidden" style={{ minHeight: 56 }}>
                      {/* Background bar */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 ${colors.bg} transition-all duration-700`}
                        style={{ width: `${barWidth}%` }}
                      />
                      {/* Content */}
                      <div className="relative flex items-center justify-between gap-4 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 ${colors.badge}`}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{stage.customLabel}</p>
                            {stage.note && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs hidden sm:block">{stage.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-foreground">{stage._val.toLocaleString()}</p>
                          {idx > 0 && stage._conv != null && (
                            <p className={`text-xs font-semibold ${colors.text}`}>전환 {stage._conv}%</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        {(worstStage || bestStage) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print-break-inside-avoid">
            {worstStage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-red-500">가장 큰 이탈 구간</p>
                </div>
                <p className="text-base font-bold text-foreground">{worstStage.customLabel}</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{worstStage._drop}% 이탈</p>
                <p className="text-xs text-muted-foreground mt-2">이 단계를 우선적으로 개선하세요.</p>
              </div>
            )}
            {bestStage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">가장 높은 전환 구간</p>
                </div>
                <p className="text-base font-bold text-foreground">{bestStage.customLabel}</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{bestStage._conv}% 전환</p>
                <p className="text-xs text-muted-foreground mt-2">이 단계의 성공 요인을 분석해보세요.</p>
              </div>
            )}
          </div>
        )}

        {/* Per-Stage Analysis */}
        <div className="bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden print-break-inside-avoid">
          <div className="px-6 pt-6 pb-2 border-b border-border/40 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">단계별 상세 분석</h2>
          </div>
          <div className="divide-y divide-border/40">
            {enrichedStages.map((stage, idx) => {
              if (idx === 0) return null;
              const interpretation = getInterpretationText(stage._drop);
              const colors = getStageColor(stage._drop);
              return (
                <div key={idx} className="px-6 py-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="shrink-0 flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm font-bold ${colors.badge}`}>
                      {idx + 1}
                    </span>
                    <div className="sm:hidden">
                      <p className="font-semibold text-sm">{enrichedStages[idx - 1].customLabel} → {stage.customLabel}</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-sm hidden sm:block">
                      <span className="text-muted-foreground">{enrichedStages[idx - 1].customLabel}</span>
                      <span className="mx-2 text-muted-foreground/40">→</span>
                      <span>{stage.customLabel}</span>
                    </p>
                    <div className={`flex items-start gap-1.5 text-sm ${
                      interpretation.type === 'danger' ? 'text-red-600' :
                      interpretation.type === 'warning' ? 'text-orange-500' :
                      interpretation.type === 'good' ? 'text-emerald-600' : 'text-muted-foreground'
                    }`}>
                      <span className="mt-0.5 shrink-0">{interpretation.icon}</span>
                      <span>{interpretation.text}</span>
                    </div>
                    {stage.note && (
                      <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2 mt-2">{stage.note}</p>
                    )}
                  </div>
                  <div className="flex gap-4 shrink-0 text-right">
                    {stage._conv != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">전환율</p>
                        <p className={`text-lg font-bold ${colors.text}`}>{stage._conv}%</p>
                      </div>
                    )}
                    {stage._drop != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">이탈율</p>
                        <p className={`text-lg font-bold ${colors.text}`}>{stage._drop}%</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Ideas + Notes side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-break-inside-avoid">
          {/* Action Ideas */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/15 p-6">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-primary" />
              다음 액션 아이디어
            </h3>
            <ul className="space-y-3">
              {getActionIdeas().map((idea, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                  {idea}
                </li>
              ))}
            </ul>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-sm">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <StickyNote className="w-5 h-5 text-secondary-foreground" />
              분석 메모
            </h3>
            {enrichedStages.some(s => s.note) ? (
              <ul className="space-y-3">
                {enrichedStages.filter(s => s.note).map((stage, idx) => (
                  <li key={idx} className="border-l-2 border-primary/30 pl-3 py-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">{stage.customLabel}</span>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{stage.note}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground/60">
                <Info className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">아직 입력된 메모가 없습니다.</p>
                <p className="text-xs mt-1">대시보드 수정 화면에서 각 단계에 메모를 추가할 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Ownership Notice */}
        <div className="no-print rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>이 브라우저에서 만든 대시보드만 수정할 수 있습니다. 브라우저 데이터를 삭제하면 수정 권한이 사라질 수 있습니다.</p>
        </div>

      </div>
    </MainLayout>
  );
}
