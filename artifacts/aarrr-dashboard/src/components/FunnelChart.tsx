import { ArrowDown } from "lucide-react";
import type { Stage } from "@workspace/api-client-react";
import { motion } from "framer-motion";

interface FunnelChartProps {
  stages: Stage[];
}

export function FunnelChart({ stages }: FunnelChartProps) {
  if (!stages || stages.length === 0) return null;

  const maxVal = Math.max(...stages.map((s) => s.metricValue || 0));

  return (
    <div className="w-full flex flex-col items-center py-8">
      {stages.map((stage, index) => {
        const val = stage.metricValue || 0;
        const prevVal = index > 0 ? stages[index - 1].metricValue || 0 : null;
        
        // Compute dynamically if not provided
        let convRate = stage.conversionRate;
        let dropRate = stage.dropOffRate;

        if (convRate == null && prevVal !== null && prevVal > 0) {
          convRate = Number(((val / prevVal) * 100).toFixed(1));
        }
        if (dropRate == null && convRate != null) {
          dropRate = Number((100 - convRate).toFixed(1));
        }

        const widthPercent = maxVal > 0 ? Math.max((val / maxVal) * 100, 10) : 100;

        return (
          <div key={index} className="w-full flex flex-col items-center">
            {/* Arrow & Conversion Indicator */}
            {index > 0 && (
              <div className="flex flex-col items-center my-2 text-sm text-muted-foreground relative z-0 h-16 print-break-inside-avoid">
                <div className="absolute inset-0 flex items-center justify-center -z-10">
                   <div className="w-px h-full bg-gradient-to-b from-primary/30 to-accent/30" />
                </div>
                <div className="bg-white/80 backdrop-blur border border-border/50 px-3 py-1 rounded-full shadow-sm flex flex-col items-center my-auto">
                  {convRate != null ? (
                    <>
                      <span className="font-semibold text-foreground text-xs">전환율 {convRate}%</span>
                      {dropRate != null && dropRate > 0 && (
                        <span className="text-[10px] text-destructive">이탈 {dropRate}%</span>
                      )}
                    </>
                  ) : (
                    <ArrowDown size={16} className="text-muted-foreground/50" />
                  )}
                </div>
              </div>
            )}

            {/* Stage Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="relative w-full max-w-2xl bg-card border border-border/50 rounded-2xl p-5 shadow-lg shadow-primary/5 flex flex-col sm:flex-row items-center sm:justify-between gap-4 z-10 print-break-inside-avoid"
            >
              {/* Background fill representing size */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl -z-10 transition-all duration-1000 ease-out"
                style={{ width: `${widthPercent}%` }}
              />

              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-secondary/30 text-secondary-foreground text-xs font-bold uppercase tracking-wider mb-2">
                  {stage.customLabel || stage.stageKey}
                </div>
                {stage.note && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1 hidden sm:block">
                    {stage.note}
                  </p>
                )}
              </div>
              <div className="text-3xl font-display font-bold text-primary">
                {val.toLocaleString()}
              </div>
            </motion.div>
            
            {stage.note && (
               <p className="text-sm text-muted-foreground text-center mt-3 sm:hidden max-w-xs print-break-inside-avoid">
                 {stage.note}
               </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
