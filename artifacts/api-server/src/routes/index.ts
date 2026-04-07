import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wafRouter from "./waf";
import reconRouter from "./recon";
import headersRouter from "./headers";
import speedRouter from "./speed";
import seoRouter from "./seo";
import reportRouter from "./report";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wafRouter);
router.use(reconRouter);
router.use(headersRouter);
router.use(speedRouter);
router.use(seoRouter);
router.use(reportRouter);

export default router;
