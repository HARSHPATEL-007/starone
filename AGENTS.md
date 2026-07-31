## Objective
- Keep enhancing the N0VA Ads & Marketing module for day-to-day execution with fewer user clicks. Rounds 1-7 complete (portfolio quick-views, batch actions, daily dashboard, one-click execution layer, set-and-forget layer). Next: wire the daily dashboard/autopilot/audience flows into frontend UI components, or add more one-click services per the execution spec.

## Important Details
- Pattern per feature: service method → delegation in `AdsMarketingModuleService.ts` → route in `ads-marketing-module.ts` → client method in `client.ts` → vitest file.
- Run tests from `C:\Users\hvipa\Downloads\New NOVA\starone\n0va\packages\backend`: `npx vitest run <file>` (no `--timeout` flag) or `npx vitest run` for full suite (~25-40s).
- Full suite state: 88 files — 87 passed / 1 failed; **1956 passed / 22 failed (1978 total)**. All 22 failures pre-existing in `src/__tests__/DeeperMarketingServices.test.ts` (`CampaignIssueService` and `CampaignOptimizerService` exports undefined in that file — `Cannot read properties of undefined`). Do not modify that file.
- Seed fixtures with `DataStore.mem().insert(...)`. MemoryStore API: `insert`, `find(collection, predicate)`, `findOne`, `update(collection, predicate, patch)`.
- Collection stores used: `audiences`, `audience_actions`, `autopilot_config`, `autopilot_log`, `approval_settings`, `approval_decisions`, `triage_logs`, `launched_templates`, plus existing `campaigns`/`metrics`.
- Deterministic values via local `hashStr` helper (NOT Math.random) so tests never flake. qualityScore range is `hash % 100` — can produce low_quality; to force auto-pause in tests, seed an audience with `qualityScore: < 30` directly.
- Known fixes to preserve: `saturationPortfolioOverview` uses `a.currentMarginalROI` (NOT `marginalROI`), reads `forecast.projectedSpendLevels` (NOT `forecast.forecast`), projected = last level's `marginalROI`, `projectedRisers` when `projected < currentMarginalROI`; `summaryPortfolioQuickView` reads healthScore/momentum from `summaryPerformanceSnapshot` (SummaryResult lacks them); triage budget pacing matches `t.includes("pacing") || t.includes("pace") || t.includes("overspend")` (`"pacing".includes("pace")` is false); route ordering: `/campaign-templates/launch-history` must precede `/campaign-templates/:templateId`.
- `CampaignTemplateService.TEMPLATES`: 6 templates — `black_friday`, `product_launch`, `cart_abandonment`, `brand_awareness`, `lead_generation`, `app_install` (minor: `app_install` config has `billing:` instead of `bidding:` — harmless).
- CommandCenterService and WeeklyMonthlyRoutinesService avoid circular deps — compose leaf services directly (realTimeMonitor, creativeOptimizer, saturationService, scorecardService, autonomousCampaignManager, budgetAutopilot).
- Budget autopilot allocation must always sum to monthlyBudget (cycle shifts cut from underperformers and re-adds to best platforms; percents recomputed).
- `CampaignAudienceExpansionService` uses `mem.find("audiences", ...)` — any audience builder should write to the same `audiences` collection.

## Work State
### Completed
- **Round 1**: `batchUpdateStatus`, `batchUpdateBudget`, `getDailyOpsOverview`, `goalDashboard`, `goalQuickCheck` (GoalTracker); `scorecardDailySnapshot` (Scorecard); `portfolioRealTimeSummary` (RealTimeMonitor); `batchResolveAlerts` (AlertOrchestrator); `diagnosticsPriorityList` (PerformanceDiagnostics); `funnelPortfolioHealth` (ConversionFunnel); `healthPredictorQuickView` (HealthPredictor) — all plumbed + tested.
- **Round 2**: `budgetPortfolioOverview` (PortfolioBudgetOptimizer), `scoringLeadQuickView` (LeadScoring), `recommendationQuickView` (RecommendationEngine), `executeRecommendationBatch` (RecommendationEngine), `campaignSummaryQuickView` (CampaignSummary) — plumbed + tested.
- **Round 3 — 5 portfolio quick-views** (`PortfolioQuickViews.test.ts`, 5 tests): `creativePortfolioHealth`, `saturationPortfolioOverview`, `biddingPortfolioOverview`, `snapshotPortfolioSummary` (async), `summaryPortfolioQuickView`.
- **Round 4 — 5 batch actions** (`BatchActions.test.ts`, 6 tests): `biddingBatchApplyAdjustments(tenantId, priorityOnly=true)`, `snapshotBatchCapture(tenantId, name="Daily Ops Capture")` async, `saturationBatchMitigation`, `diagnosticsBatchFixPlan` (steps from `s.action/s.effort/s.expectedImpact/s.timeframe`), `creativeBatchRefreshPlan`.
- **Round 5 — daily execution** (`DailyExecutionDashboard.test.ts`, 3 tests): `goalBatchStatus` (uses `recommendGoalAdjustments`), `budgetRebalancePlan` (BudgetSimulator), `dailyExecutionDashboard(tenantId)` async aggregating 15 sub-calls into `sections`, `readyActions` (6 counts), `topActions`, `morningReport`, `healthVerdict`.
- **Round 6 — one-click execution layer** (`OneClickExecution.test.ts`, 15 tests): `CampaignAutoApproveService` (approval_settings, DEFAULT_SETTINGS, 7 methods, logs to approval_decisions), `CampaignTriageService` (6 alert types → actions, triage_logs), `CampaignTemplateService` (6 templates, launchTemplate, launched_templates), `CommandCenterService` (commandCenterSummary 4 cards, dailyBriefing, parseVoiceCommand 12 intents, quickActions 6). 19 delegations + 4 imports; ~20 routes; matching client methods.
- **Round 7 — set-and-forget layer** (`SetAndForget.test.ts`, 16 tests, all passing):
  - `CampaignAudienceBuilderService.ts` — buildAudience (visual flow → `audiences` collection, 3 sync rules), syncAudienceToPlatforms, audienceQualityScoring, audienceLtvRanking, applyAudienceAutoActions (logs to `audience_actions`), audienceSyncStatus.
  - `BudgetAutopilotService.ts` — enableAutopilot (4-platform allocation summing to monthlyBudget), autopilotStatus, runAutopilotCycle (cuts maxShiftPercent from platforms below 0.5x target ROAS, redistributes to best, logs to `autopilot_log`), spendAlerts (3 proactive alerts), autopilotDailySummary (today's cycles from log).
  - `WeeklyMonthlyRoutinesService.ts` — weeklyReview (6 sections incl. AI optimization log, audience scorecard, budget forecast, recommendations), monthlyStrategyDeck (5 sections incl. channel deep-dive, winners/losers, next-month forecast, executiveSummary), aiOptimizationLog (merges approval_decisions + triage_logs + autopilot_log + audience_actions, sorted desc).
  - Round 7 plumbing: 16 delegations + 3 imports in AdsMarketingModuleService; 15 routes (audiences/build, audiences/sync, audiences/quality, audiences/ltv-ranking, audiences/auto-actions, audiences/sync-status, autopilot/enable, autopilot/status, autopilot/cycle, autopilot/alerts, autopilot/daily-summary, weekly-review, monthly-strategy-deck, ai-optimization-log); 15 client methods in `client.ts`.
- New test files: `PortfolioQuickViews.test.ts` (5), `BatchActions.test.ts` (6), `DailyExecutionDashboard.test.ts` (3), `OneClickExecution.test.ts` (15), `SetAndForget.test.ts` (16) — all passing.

### Next
1. Frontend UI: dashboard page combining dailyExecutionDashboard + commandCenterSummary + autopilotStatus + audienceSyncStatus (client methods ready).
2. More one-click services from the execution spec (e.g., auto-pause underperformers, creative auto-refresh execution endpoint, campaign launch wizard using templates).
3. Fix the 22 pre-existing failures in DeeperMarketingServices.test.ts (CampaignIssueService/CampaignOptimizerService imports) if that file is ever unblocked.

## Relevant Files
- `packages/backend/src/services/AdsMarketingModuleService.ts` — delegations for all rounds (~3388+ lines, imports for all round services)
- `packages/backend/src/routes/ads-marketing-module.ts` — ~55 routes across all rounds
- `packages/frontend/src/api/client.ts` — matching ads-marketing API methods (~2200+)
- `packages/backend/src/services/CampaignAudienceBuilderService.ts`, `BudgetAutopilotService.ts`, `WeeklyMonthlyRoutinesService.ts` — round 7, all tested
- `packages/backend/src/services/CampaignAutoApproveService.ts`, `CampaignTriageService.ts`, `CampaignTemplateService.ts`, `CommandCenterService.ts` — round 6, all tested
- `packages/backend/src/__tests__/SetAndForget.test.ts` (16), `OneClickExecution.test.ts` (15), `DailyExecutionDashboard.test.ts` (3), `BatchActions.test.ts` (6), `PortfolioQuickViews.test.ts` (5)
- `packages/backend/src/__tests__/DeeperMarketingServices.test.ts` — 22 pre-existing failures, do not modify
