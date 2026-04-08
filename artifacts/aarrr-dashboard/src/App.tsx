console.log("Hello World")
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { CreateDashboard } from "./pages/CreateDashboard";
import { EditDashboard } from "./pages/EditDashboard";
import { DashboardDetail } from "./pages/DashboardDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/projects" />
      </Route>
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:projectSlug/new" component={CreateDashboard} />
      <Route path="/projects/:projectSlug/:dashboardSlug/edit" component={EditDashboard} />
      <Route path="/projects/:projectSlug/:dashboardSlug" component={DashboardDetail} />
      <Route path="/projects/:projectSlug" component={ProjectDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
