import { useEffect } from "react";
import "../styles/report-builder-canvas-center.css";
import { installReportDateRangeEnhancer } from "../utils/reportDateRangeEnhancer";
import ReportBuilderRulesLive from "./ReportBuilderRulesLive";

export default function ReportBoard() {
  useEffect(() => installReportDateRangeEnhancer(), []);
  return <ReportBuilderRulesLive />;
}
