import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, GripVertical, Plus, AlertCircle } from "lucide-react";
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
  stages: z.array(z.object({
    stageKey: z.string().min(1, "단계를 선택해주세요."),
    customLabel: z.string().min(1, "라벨을 입력해주세요."),
    metricValue: z.coerce.number().optional().nullable(),
    note: z.string().optional().nullable()
  })).min(3, "최소 3개의 단계가 필요합니다.").max(5, "최대 5개까지만 추가 가능합니다.")
});

export type DashboardFormValues = z.infer<typeof schema>;

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
      stages: [
        { stageKey: "acquisition", customLabel: "획득 (Acquisition)", metricValue: null, note: "" },
        { stageKey: "activation", customLabel: "활성화 (Activation)", metricValue: null, note: "" },
        { stageKey: "retention", customLabel: "유지 (Retention)", metricValue: null, note: "" },
      ]
    }
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "stages"
  });

  const handleStageChange = (index: number, val: string) => {
    const stageType = STAGE_TYPES.find(s => s.value === val);
    form.setValue(`stages.${index}.stageKey`, val);
    if (stageType && !form.getValues(`stages.${index}.customLabel`)) {
      form.setValue(`stages.${index}.customLabel`, stageType.label);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pb-20">
      
      <div className="bg-blue-50/50 text-blue-800 p-3 rounded-lg flex items-start gap-2 text-sm border border-blue-100">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p>
          <strong>이 브라우저에서 만든 대시보드만 수정할 수 있습니다.</strong><br/>
          시크릿 모드를 사용하거나 브라우저 데이터를 삭제하면 수정 권한이 사라질 수 있으니 주의하세요. (현재 프로젝트: {projectName})
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm border-border/60">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-semibold">대시보드 제목 <span className="text-destructive">*</span></Label>
            <Input 
              {...form.register("title")} 
              placeholder="예: 우리 서비스 1분기 가입 퍼널" 
              className="h-12 rounded-xl text-lg bg-muted/30" 
            />
            {form.formState.errors.title && <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">서비스명 (선택)</Label>
            <Input 
              {...form.register("serviceName")} 
              placeholder="분석 대상 서비스 이름" 
              className="h-11 rounded-xl bg-muted/30" 
            />
          </div>
        </CardContent>
      </Card>

      <GAGuidance />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold">퍼널 단계 설정</h2>
          <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
            {fields.length} / 5 단계
          </span>
        </div>
        
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="rounded-2xl shadow-sm border-border/50 relative group bg-card">
              <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row gap-5 items-start">
                <div className="flex flex-row sm:flex-col gap-2 h-full justify-center sm:pt-2 sm:pr-2 cursor-move text-muted-foreground hover:text-foreground">
                  <Button type="button" variant="ghost" size="icon" className="w-8 h-8 rounded-lg sm:hidden"><GripVertical size={18}/></Button>
                  <Button type="button" variant="ghost" size="icon" className="w-8 h-8 rounded-lg hidden sm:flex" disabled={index===0} onClick={() => move(index, index-1)}>↑</Button>
                  <Button type="button" variant="ghost" size="icon" className="w-8 h-8 rounded-lg hidden sm:flex" disabled={index===fields.length-1} onClick={() => move(index, index+1)}>↓</Button>
                </div>

                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">AARRR 분류</Label>
                    <Select onValueChange={(val) => handleStageChange(index, val)} defaultValue={field.stageKey}>
                      <SelectTrigger className="h-11 rounded-xl bg-muted/30">
                        <SelectValue placeholder="단계 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">라벨 (표시될 이름)</Label>
                    <Input {...form.register(`stages.${index}.customLabel`)} className="h-11 rounded-xl bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">측정 수치 (선택)</Label>
                    <Input type="number" step="0.01" {...form.register(`stages.${index}.metricValue`)} placeholder="예: 1500" className="h-11 rounded-xl bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">분석 메모 (선택)</Label>
                    <Textarea {...form.register(`stages.${index}.note`)} placeholder="이 단계에 대한 가설이나 코멘트" className="h-11 min-h-[44px] rounded-xl bg-muted/30 resize-y" />
                  </div>
                </div>

                <div className="pt-2 sm:pl-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => remove(index)}
                    disabled={fields.length <= 3}
                    className="w-10 h-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {fields.length < 5 && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => append({ stageKey: "acquisition", customLabel: "", metricValue: null, note: "" })}
            className="w-full mt-4 h-14 rounded-2xl border-dashed border-2 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all font-semibold text-lg"
          >
            <Plus className="mr-2" /> 단계 추가하기
          </Button>
        )}
        {form.formState.errors.stages?.root && <p className="text-destructive mt-2 text-center font-medium">{form.formState.errors.stages.root.message}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-border/50 z-40 sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:mt-10 flex justify-end gap-3">
        <Button 
          type="submit" 
          size="lg" 
          className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5"
          disabled={isPending}
        >
          {isPending ? "저장 중..." : "대시보드 저장 완료"}
        </Button>
      </div>
    </form>
  );
}
