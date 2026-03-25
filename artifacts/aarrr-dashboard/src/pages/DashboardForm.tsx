import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, AlertCircle, ShoppingCart, Newspaper, Cpu, RotateCcw, CalendarRange } from "lucide-react";
import { GAGuidance } from "@/components/GAGuidance";

const STAGE_TYPES = [
  { value: "acquisition", label: "획득 (Acquisition)" },
  { value: "activation", label: "활성화 (Activation)" },
  { value: "retention", label: "유지 (Retention)" },
  { value: "revenue", label: "매출 (Revenue)" },
  { value: "referral", label: "추천 (Referral)" },
];

const schema = z.object({
  title: z.string().min(1, "대시보드 제목을 입력해주세요."),
  serviceName: z.string().optional(),
  periodStart: z.string().optional().nullable(),
  periodEnd: z.string().optional().nullable(),
  stages: z.array(z.object({
    stageKey: z.string().min(1, "단계를 선택해주세요."),
    customLabel: z.string().min(1, "라벨을 입력해주세요."),
    metricValue: z.coerce.number().optional().nullable(),
    note: z.string().optional().nullable()
  })).min(3, "최소 3개의 단계가 필요합니다.").max(5, "최대 5개까지만 추가 가능합니다.")
});

export type DashboardFormValues = z.infer<typeof schema>;

type StageTemplate = {
  stageKey: string;
  customLabel: string;
  metricValue: number | null;
  note: string;
};

type Template = {
  label: string;
  icon: React.ReactNode;
  title: string;
  serviceName: string;
  stages: StageTemplate[];
};

const ECOMMERCE_STAGES: StageTemplate[] = [
  { stageKey: "acquisition", customLabel: "획득 (Acquisition)", metricValue: 10000, note: "검색 광고 및 SNS 유입" },
  { stageKey: "activation", customLabel: "상품조회 (Activation)", metricValue: 4000, note: "상품 상세 페이지 조회" },
  { stageKey: "activation", customLabel: "장바구니 (Activation)", metricValue: 1500, note: "장바구니 담기 완료" },
  { stageKey: "revenue", customLabel: "구매 (Revenue)", metricValue: 300, note: "실제 결제 완료" },
];

const CONTENT_STAGES: StageTemplate[] = [
  { stageKey: "acquisition", customLabel: "획득 (Acquisition)", metricValue: 20000, note: "검색 및 외부 링크 유입" },
  { stageKey: "activation", customLabel: "콘텐츠 조회 (Activation)", metricValue: 8000, note: "글/영상 조회 완료" },
  { stageKey: "retention", customLabel: "재방문 (Retention)", metricValue: 2000, note: "30일 내 재방문 사용자" },
  { stageKey: "revenue", customLabel: "광고 클릭 (Revenue)", metricValue: 500, note: "광고 클릭 또는 제휴 링크 전환" },
];

const SAAS_STAGES: StageTemplate[] = [
  { stageKey: "acquisition", customLabel: "획득 (Acquisition)", metricValue: 5000, note: "마케팅 채널 유입" },
  { stageKey: "activation", customLabel: "회원가입 (Activation)", metricValue: 1200, note: "가입 완료" },
  { stageKey: "activation", customLabel: "핵심 기능 사용 (Activation)", metricValue: 600, note: "핵심 기능 최초 사용" },
  { stageKey: "retention", customLabel: "재방문 (Retention)", metricValue: 300, note: "7일 내 재방문" },
  { stageKey: "revenue", customLabel: "결제 (Revenue)", metricValue: 100, note: "유료 전환" },
];

const TEMPLATES: Template[] = [
  { label: "이커머스 예시", icon: <ShoppingCart size={15} />, title: "이커머스 AARRR 퍼널", serviceName: "온라인 쇼핑몰", stages: ECOMMERCE_STAGES },
  { label: "콘텐츠/미디어 예시", icon: <Newspaper size={15} />, title: "콘텐츠/미디어 AARRR 퍼널", serviceName: "콘텐츠 플랫폼", stages: CONTENT_STAGES },
  { label: "SaaS 예시", icon: <Cpu size={15} />, title: "SaaS AARRR 퍼널", serviceName: "SaaS 서비스", stages: SAAS_STAGES },
];

interface Props {
  defaultValues?: Partial<DashboardFormValues>;
  onSubmit: (data: DashboardFormValues) => void;
  isPending: boolean;
  projectName: string;
}

export function DashboardForm({ defaultValues, onSubmit, isPending, projectName }: Props) {
  const form = useForm<DashboardFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {
      title: "",
      serviceName: "",
      stages: ECOMMERCE_STAGES,
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "stages"
  });

  const applyTemplate = (tpl: Template) => {
    form.setValue("title", tpl.title);
    form.setValue("serviceName", tpl.serviceName);
    replace(tpl.stages);
  };

  const handleReset = () => {
    applyTemplate(TEMPLATES[0]);
  };

  const handleStageChange = (index: number, val: string) => {
    const stageType = STAGE_TYPES.find(s => s.value === val);
    form.setValue(`stages.${index}.stageKey`, val);
    if (stageType && !form.getValues(`stages.${index}.customLabel`)) {
      form.setValue(`stages.${index}.customLabel`, stageType.label);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20">

      {/* Template Buttons */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">예시 템플릿으로 시작하기</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tpl) => (
            <Button
              key={tpl.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate(tpl)}
              className="rounded-full border-primary/30 text-primary hover:bg-primary hover:text-white hover:border-primary transition-all gap-1.5 font-semibold text-sm h-9 px-4"
            >
              {tpl.icon}
              {tpl.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 font-medium text-sm h-9 px-4 ml-auto"
          >
            <RotateCcw size={14} />
            샘플 데이터로 초기화
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/70">클릭하면 제목, 서비스명, 단계가 자동으로 채워집니다. 이후 자유롭게 수정하세요.</p>
      </div>

      {/* Ownership Notice */}
      <div className="bg-amber-50 text-amber-800 p-3 rounded-xl flex items-start gap-2 text-sm border border-amber-100">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>이 브라우저에서 만든 대시보드만 수정할 수 있습니다.</strong><br />
          시크릿 모드나 브라우저 데이터 삭제 시 수정 권한이 사라질 수 있습니다. (현재 프로젝트: <strong>{projectName}</strong>)
        </p>
      </div>

      {/* Basic Info */}
      <Card className="rounded-2xl shadow-sm border-border/60">
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">대시보드 제목 <span className="text-destructive">*</span></Label>
            <Input
              {...form.register("title")}
              placeholder="예: 우리 서비스 1분기 가입 퍼널"
              className="h-12 rounded-xl text-base bg-muted/30"
            />
            {form.formState.errors.title && <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">서비스명 <span className="text-muted-foreground font-normal">(선택)</span></Label>
            <Input
              {...form.register("serviceName")}
              placeholder="분석 대상 서비스 이름"
              className="h-11 rounded-xl bg-muted/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-muted-foreground" />
              데이터 조회 기간 <span className="text-muted-foreground font-normal">(선택)</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">시작일</span>
                <Input
                  type="date"
                  {...form.register("periodStart")}
                  className="h-11 rounded-xl bg-muted/30"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">종료일</span>
                <Input
                  type="date"
                  {...form.register("periodEnd")}
                  className="h-11 rounded-xl bg-muted/30"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground/70">GA에서 데이터를 추출한 기간을 입력하면 대시보드에 표시됩니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* GA Guidance */}
      <GAGuidance />

      {/* Stages */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">퍼널 단계 설정</h2>
          {/*
          <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
            {fields.length} / 5 단계
          </span>
          */}
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id} className="rounded-2xl shadow-sm border-border/50 bg-card">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-1">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/*
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">AARRR 분류</Label>
                      <Select onValueChange={(val) => handleStageChange(index, val)} defaultValue={field.stageKey}>
                        <SelectTrigger className="h-10 rounded-xl bg-muted/30">
                          <SelectValue placeholder="단계 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">라벨 (표시될 이름)</Label>
                      <Input {...form.register(`stages.${index}.customLabel`)} className="h-10 rounded-xl bg-muted/30" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">측정 수치</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register(`stages.${index}.metricValue`)}
                        placeholder="예: 1500"
                        className="h-10 rounded-xl bg-muted/30"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">분석 메모</Label>
                      <Textarea
                        {...form.register(`stages.${index}.note`)}
                        placeholder="이 단계에 대한 가설이나 코멘트"
                        className="h-10 min-h-[40px] rounded-xl bg-muted/30 resize-none"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 3}
                    className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30 shrink-0 mt-1"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {fields.length < 10 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ stageKey: "acquisition", customLabel: "", metricValue: null, note: "" })}
            className="w-full mt-3 h-12 rounded-2xl border-dashed border-2 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all font-semibold"
          >
            <Plus className="mr-2" size={16} /> 단계 추가하기
          </Button>
        )}
        {form.formState.errors.stages?.root && (
          <p className="text-destructive mt-2 text-center font-medium text-sm">{form.formState.errors.stages.root.message}</p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-border/50 z-40 sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-6 flex justify-end gap-3">
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5"
          disabled={isPending}
        >
          {isPending ? "저장 중..." : "대시보드 저장 완료"}
        </Button>
      </div>
    </form>
  );
}
