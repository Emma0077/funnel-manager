import { Lightbulb, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function GAGuidance() {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20 shadow-sm overflow-hidden no-print">
      <div className="bg-primary/10 px-4 py-3 flex items-center gap-2 border-b border-primary/10">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-primary font-display">GA4 지표 참고 가이드</h3>
      </div>
      <CardContent className="p-4 sm:p-5 text-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" /> 획득 (Acquisition)
            </div>
            <p className="text-muted-foreground pl-3.5 leading-relaxed">
              <span className="font-medium text-foreground/80">어디서:</span> 트래픽 획득 / 사용자 획득<br/>
              <span className="font-medium text-foreground/80">지표:</span> 사용자 수, 세션 수<br/>
              <span className="font-medium text-foreground/80">차원:</span> source/medium, campaign
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary" /> 활성화 (Activation)
            </div>
            <p className="text-muted-foreground pl-3.5 leading-relaxed">
              <span className="font-medium text-foreground/80">어디서:</span> 이벤트 / 퍼널 탐색 분석<br/>
              <span className="font-medium text-foreground/80">지표:</span> 회원가입, 장바구니 담기, 주요 이벤트
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent" /> 유지 (Retention)
            </div>
            <p className="text-muted-foreground pl-3.5 leading-relaxed">
              <span className="font-medium text-foreground/80">어디서:</span> 리텐션 보고서 / 코호트 탐색<br/>
              <span className="font-medium text-foreground/80">지표:</span> 재방문 사용자 수, 유지율
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" /> 매출 (Revenue)
            </div>
            <p className="text-muted-foreground pl-3.5 leading-relaxed">
              <span className="font-medium text-foreground/80">어디서:</span> 수익 창출 보고서<br/>
              <span className="font-medium text-foreground/80">지표:</span> 구매 수, 총 수익, ARPPU
            </p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" /> 추천 (Referral)
            </div>
            <p className="text-muted-foreground pl-3.5 leading-relaxed">
              <span className="font-medium text-foreground/80">어디서:</span> 획득 보고서의 referral 유입<br/>
              <span className="font-medium text-foreground/80">지표:</span> 공유하기 버튼 클릭 수, 추천인 코드 입력 수
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
