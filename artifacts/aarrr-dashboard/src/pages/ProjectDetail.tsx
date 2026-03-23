import { Link, useRoute } from "wouter";
import { useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetProject, useListDashboards } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, ArrowLeft, BarChart3, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export function ProjectDetail() {
  const [, params] = useRoute("/projects/:projectSlug");
  const slug = params?.projectSlug || "";
  const { ownerToken, isAdmin } = useAuth();
  
  const { data: project, isLoading: projLoading } = useGetProject(slug);
  const { data: dashboards, isLoading: dashLoading } = useListDashboards(slug);

  if (projLoading) {
    return <MainLayout><div className="animate-pulse h-8 bg-muted w-1/3 rounded-lg mb-8" /></MainLayout>;
  }
  if (!project) {
    return <MainLayout><div>프로젝트를 찾을 수 없습니다.</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> 프로젝트 목록
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">{project.description}</p>
          </div>
          <Link href={`/projects/${slug}/new`}>
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg shadow-accent/20 rounded-xl transition-all duration-300 hover:-translate-y-0.5">
              <Plus className="w-5 h-5 mr-2" /> 대시보드 만들기
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-bold font-display flex items-center gap-2 mb-6">
          <BarChart3 className="text-primary w-5 h-5" /> 제출된 대시보드
        </h2>

        {dashLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-white/50 animate-pulse rounded-2xl" />)}
          </div>
        ) : dashboards?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/40 rounded-3xl border border-dashed border-border/80">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">등록된 대시보드가 없습니다</h3>
            <p className="text-muted-foreground mt-1">상단의 버튼을 눌러 첫 대시보드를 생성하세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {dashboards?.map((dash, idx) => {
              const isOwner = dash.createdByToken === ownerToken || isAdmin;
              return (
                <motion.div
                  key={dash.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link href={`/projects/${slug}/${dash.slug}`}>
                    <Card className={`h-full cursor-pointer transition-all duration-300 rounded-2xl bg-card flex flex-col hover:-translate-y-1 ${isOwner ? 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 border-primary/20' : 'hover:shadow-md hover:border-border'}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-display truncate">
                          {dash.title}
                        </CardTitle>
                        <CardDescription className="text-sm truncate">
                          {dash.serviceName || "서비스명 미입력"}
                        </CardDescription>
                      </CardHeader>
                      <div className="mt-auto px-6 pb-6 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(dash.createdAt), 'yy.MM.dd HH:mm')}</span>
                        {isOwner && (
                          <span className="bg-accent/10 text-accent font-medium px-2 py-0.5 rounded">내 대시보드</span>
                        )}
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
