import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import dashboardsRouter from "./dashboards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(dashboardsRouter);

export default router;
