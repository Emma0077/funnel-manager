import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Printer, Edit3, Trash2,
  AlertTriangle, CheckCircle, Info,
  Lightbulb, BarChart2, Zap, Eye, CalendarRange
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Stage } from "@workspace/api-client-react";
import {
  useGetDashboard,
  useGetProject,
  getListDashboardsQueryKey,
  useDeleteDashboard,
} from "@workspace/api-client-react";

export function DashboardDetail() {
  const [, params] = useRoute("/projects/:projectSlug/:dashboardSlug");
  const pSlug = params?.projectSlug || "";
  const dSlug = params?.dashboardSlug || "";
  const { ownerToken, isAdmin } = useAuth();

  const { data: dashboard, isLoading } = useGetDashboard(pSlug, dSlug);
  const { data: project } = useGetProject(pSlug);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const deleteDashboard = useDeleteDashboard({
    request: {
      headers: {
        ...(ownerToken ? { "x-owner-token": ownerToken } : {}),
        ...(localStorage.getItem("aarrr_admin_email")
          ? { authorization: `Bearer ${localStorage.getItem("aarrr_admin_email")}` }
          : {}),
      },
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-pulse max-w-5xl mx-auto">
          <div className="h-8 bg-muted rounded-lg w-1/3" />
          <div className="h-12 bg-muted rounded-xl w-full" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-80 bg-muted rounded-2xl" />
            <div className="h-80 bg-muted rounded-2xl" />
          </div>
        </div>
      </MainLayout>
    );
  }
  if (!dashboard) return <MainLayout><p className="text-muted-foreground">대시보드를 찾을 수 없습니다.</p></MainLayout>;

  const isOwner = dashboard.createdByToken === ownerToken || isAdmin;
  const stages: Stage[] = dashboard.stages || [];

  const handleDelete = async () => {
    if (!confirm("정말 이 대시보드를 삭제하시겠습니까?")) return;
  
    try {
      await deleteDashboard.mutateAsync({
        projectSlug: pSlug,
        dashboardSlug: dSlug,
      });
  
      toast({ title: "대시보드가 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: getListDashboardsQueryKey(pSlug) });
      setLocation(`/projects/${pSlug}`);
    } catch (err: any) {
      toast({
        title: err?.data?.error ?? err?.message ?? "삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

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
  const totalConvRate = firstStage?._val > 0 ? Number(((lastStage._val / firstStage._val) * 100).toFixed(1)) : null;

  const worstStage = enrichedStages.slice(1).reduce<typeof enrichedStages[number] | null>((w, s) => {
    if (s._drop == null) return w;
    return (w == null || (s._drop ?? 0) > (w._drop ?? 0)) ? s : w;
  }, null);
  const worstIdx = worstStage ? enrichedStages.indexOf(worstStage) : -1;

  const bestStage = enrichedStages.slice(1).reduce<typeof enrichedStages[number] | null>((b, s) => {
    if (s._drop == null) return b;
    return (b == null || (s._drop ?? 100) < (b._drop ?? 100)) ? s : b;
  }, null);
  const bestIdx = bestStage ? enrichedStages.indexOf(bestStage) : -1;

  // Funnel trapezoid colors — purple → pink → rose → orange → amber
  const funnelColors = [
    { bg: "#7C3AED", text: "#fff" },
    { bg: "#9333EA", text: "#fff" },
    { bg: "#C026D3", text: "#fff" },
    { bg: "#DB2777", text: "#fff" },
    { bg: "#E11D48", text: "#fff" },
    { bg: "#F43F5E", text: "#fff" },
    { bg: "#F97316", text: "#fff" },
    { bg: "#EAB308", text: "#fff" },
    { bg: "#84CC16", text: "#fff" },
    { bg: "#10B981", text: "#fff" },
  ];
  // Log scale so even tiny stages (e.g. 8 vs 320) have visually distinct widths
  const logVals = enrichedStages.map(s => Math.log(Math.max(s._val, 1)));
  const logMin = Math.min(...logVals);
  const logMax = Math.max(...logVals);
  const logRange = logMax - logMin;
  // Maps maxVal → 100%, minVal → 8%
  const pctWidths = logVals.map(lv =>
    logRange === 0 ? 100 : Math.max(8 + ((lv - logMin) / logRange) * 92, 8)
  );
  // topWidth: 100% for stage 0 (always full); pctWidths[i] for stage i > 0
  // bottomWidth: pctWidths[i+1] for non-last; pctWidths[i] for last (flat bottom)
  const stageWidths = enrichedStages.map((_, i) => ({
    top: i === 0 ? 100 : pctWidths[i],
    bottom: i < enrichedStages.length - 1 ? pctWidths[i + 1] : pctWidths[i],
  }));

  // Conversion rate color
  const convColor = (conv: number | null) => {
    if (conv == null) return { text: "text-muted-foreground", bg: "bg-muted/50" };
    if (conv >= 50) return { text: "text-emerald-600", bg: "bg-emerald-50 border border-emerald-200" };
    if (conv >= 25) return { text: "text-orange-500", bg: "bg-orange-50 border border-orange-200" };
    return { text: "text-red-500", bg: "bg-red-50 border border-red-200" };
  };

  // Summary text
  const summaryText = () => {
    const service = dashboard.serviceName ? `${dashboard.serviceName}의` : "";
    const n = enrichedStages.length;
    const first = firstStage?._val?.toLocaleString() ?? "—";
    const last = lastStage?._val?.toLocaleString() ?? "—";
    const conv = totalConvRate != null ? `${totalConvRate}%` : "—";
    return `${service} 퍼널 데이터를 분석했습니다. 총 ${n}개 단계에서, 최초 유입 ${first}명 중 ${last}명이 최종 단계까지 도달해 전체 전환율은 ${conv}를 기록했습니다.`;
  };

  // Action tip for worst stage
  const worstActionTip = () => {
    if (!worstStage) return null;
    const prev = worstIdx > 0 ? enrichedStages[worstIdx - 1].customLabel : "";
    return `가장 이탈이 많은 "${prev} → ${worstStage.customLabel}" 구간을 우선적으로 개선해보세요. 해당 단계의 사용자 행동 데이터를 GA 이벤트 보고서에서 확인하는 것을 권장합니다.`;
  };

function safeFormat(date: any, fmt: string) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return format(d, fmt);
}
  
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-5">

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
            {isOwner && (
              <Button size="sm" variant="destructive" onClick={handleDelete} className="rounded-xl gap-1.5">
                <Trash2 className="w-4 h-4" /> 삭제
              </Button>
            )}
          </div>
        </div>

        {/* Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/5 border border-primary/15 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2 mb-2">
            {isOwner && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wider">
                <Zap size={9} /> My Board
              </span>
            )}
            {dashboard.serviceName && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/60 text-muted-foreground border border-white/50">
                {dashboard.serviceName}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">{dashboard.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>생성일: {safeFormat(dashboard.createdAt ?? dashboard.created_at, 'yyyy년 MM월 dd일')}</span>
            {(dashboard.periodStart || dashboard.periodEnd) && (
              <span className="flex items-center gap-1 bg-white/60 border border-white/50 rounded-full px-2.5 py-0.5 font-medium">
                <CalendarRange className="w-3 h-3" />
                {dashboard.periodStart && safeFormat(dashboard.periodStart ?? dashboard.period_start, 'yyyy.MM.dd')}
                {dashboard.periodStart && dashboard.periodEnd && " – "}
                {dashboard.periodEnd && format(new Date(dashboard.periodEnd), 'yyyy.MM.dd')}
              </span>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {stages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-border/60 p-4 shadow-sm text-center">
              <p className="text-xs text-muted-foreground font-medium mb-1">분석 단계 수</p>
              <p className="text-2xl font-bold text-primary">{stages.length}단계</p>
            </div>
            <div className="bg-white rounded-xl border border-border/60 p-4 shadow-sm text-center">
              <p className="text-xs text-muted-foreground font-medium mb-1">총 유입</p>
              <p className="text-2xl font-bold text-foreground">{firstStage._val.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-border/60 p-4 shadow-sm text-center">
              <p className="text-xs text-muted-foreground font-medium mb-1">최종 전환</p>
              <p className="text-2xl font-bold text-foreground">{lastStage._val.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-border/60 p-4 shadow-sm text-center">
              <p className="text-xs text-muted-foreground font-medium mb-1">전체 전환율</p>
              <p className={`text-2xl font-bold ${totalConvRate != null && totalConvRate >= 10 ? "text-emerald-600" : "text-orange-500"}`}>
                {totalConvRate != null ? `${totalConvRate}%` : "—"}
              </p>
            </div>
          </div>
        )}

        {/* ── Top Alert Banner: Worst Stage ── */}
        {worstStage && worstIdx > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">
                가장 많은 이탈이 발생하는 구간을 발견했어요
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                <span className="font-semibold">"{enrichedStages[worstIdx - 1].customLabel} – {worstStage.customLabel}"</span> 단계의 전환율이{" "}
                <span className="font-semibold">{worstStage._conv}%</span>로 가장 낮습니다. 이 구간에서 사용자들이 왜 이탈하는지 GA 이벤트 보고서를 통해 확인해보세요.
              </p>
            </div>
          </div>
        )}

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left: Funnel Visualization */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">퍼널 흐름 시각화</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6">단계를 거치면서 사용자 수가 어떻게 줄어드는지 한눈에 확인할 수 있어요.</p>

            {/* Proper narrowing funnel — each stage is a trapezoid via clip-path */}
            <div className="flex flex-col items-center gap-0">
              {enrichedStages.map((stage, idx) => {
                const color = funnelColors[Math.min(idx, funnelColors.length - 1)];
                const cc = convColor(stage._conv);
                const sw = stageWidths[idx];
                const leftTop = (100 - sw.top) / 2;
                const rightTop = (100 + sw.top) / 2;
                const leftBottom = (100 - sw.bottom) / 2;
                const rightBottom = (100 + sw.bottom) / 2;
                const clipPath = `polygon(${leftTop}% 0%, ${rightTop}% 0%, ${rightBottom}% 100%, ${leftBottom}% 100%)`;

                return (
                  <div key={idx} className="w-full flex flex-col items-center">
                    {/* Trapezoid segment */}
                    <div
                      className="w-full flex items-center justify-center relative"
                      style={{ height: 62, clipPath, background: color.bg }}
                    >
                      <div className="text-center px-2" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>
                        <p className="text-[10px] font-semibold leading-tight truncate max-w-[140px]" style={{ color: color.text, opacity: 0.9 }}>
                          {stage.customLabel}
                        </p>
                        <p className="text-base font-bold leading-snug" style={{ color: color.text }}>
                          {stage._val.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Conversion rate row between stages */}
                    {idx < enrichedStages.length - 1 && (
                      <div className="flex w-full items-center justify-end gap-3 py-1 px-2">
                        {enrichedStages[idx + 1]._conv != null && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${convColor(enrichedStages[idx + 1]._conv).bg} ${convColor(enrichedStages[idx + 1]._conv).text}`}>
                            전환율 {enrichedStages[idx + 1]._conv}%
                          </span>
                        )}
                        {enrichedStages[idx + 1]._drop != null && (
                          <span className="text-[10px] text-muted-foreground">
                            이탈 {enrichedStages[idx + 1]._drop}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-5">
              {enrichedStages.map((stage, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: funnelColors[Math.min(idx, funnelColors.length - 1)].bg }} />
                  <span className="text-[10px] text-muted-foreground">{stage.customLabel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Insights Panel */}
          <div className="lg:col-span-2 space-y-4">

            {/* 분석 인사이트 */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                분석 인사이트
              </h2>

              {/* 이번 분석 요약 */}
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary">이번 분석 요약</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{summaryText()}</p>
              </div>

              {/* 가장 큰 이탈 구간 */}
              {worstStage && worstIdx > 0 && (
                <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-100 p-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">가장 큰 이탈 구간</p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {enrichedStages[worstIdx - 1].customLabel} → {worstStage.customLabel}
                      <span className="text-red-500 ml-1">({worstStage._conv}% 전환)</span>
                    </p>
                  </div>
                </div>
              )}

              {/* 가장 안정적인 구간 */}
              {bestStage && bestIdx > 0 && (
                <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">가장 안정적인 구간</p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {enrichedStages[bestIdx - 1].customLabel} → {bestStage.customLabel}
                      <span className="text-emerald-600 ml-1">({bestStage._conv}% 전환)</span>
                    </p>
                  </div>
                </div>
              )}

              {/* 추가로 살펴볼 포인트 */}
              {worstActionTip() && (
                <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-100 p-3">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">추가로 살펴볼 포인트</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{worstActionTip()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 눈여겨볼 구간 */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-5">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-primary" />
                눈여겨볼 구간
              </h2>
              <div className="space-y-2">
                {enrichedStages.slice(1).map((stage, i) => {
                  const idx = i + 1;
                  const cc = convColor(stage._conv);
                  const isWorst = stage === worstStage;
                  const isBest = stage === bestStage;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                        isWorst ? "bg-red-50 border border-red-200" :
                        isBest ? "bg-emerald-50 border border-emerald-200" :
                        "bg-muted/30 border border-border/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isWorst && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                        {isBest && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />}
                        <span className="text-xs text-foreground/80 truncate">
                          {enrichedStages[idx - 1].customLabel} → {stage.customLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`text-sm font-bold ${cc.text}`}>
                          {stage._conv != null ? `${stage._conv}%` : "—"}
                        </span>
                        {isWorst && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Notes (only if any) */}
        {enrichedStages.some(s => s.note) && (
          <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-4 text-foreground">
              <Info className="w-4 h-4 text-muted-foreground" />
              분석 메모
            </h3>
            <div className="space-y-3">
              {enrichedStages.filter(s => s.note).map((stage, idx) => (
                <div key={idx} className="border-l-2 border-primary/30 pl-3 py-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">{stage.customLabel}</span>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{stage.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ownership Notice */}
        <div className="no-print rounded-xl border border-amber-100 bg-amber-50/70 p-3.5 text-xs text-amber-700 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>이 브라우저에서 만든 대시보드만 수정할 수 있습니다. 시크릿 모드나 브라우저 데이터 삭제 시 수정 권한이 사라질 수 있습니다.</p>
        </div>

      </div>
    </MainLayout>
  );
}
