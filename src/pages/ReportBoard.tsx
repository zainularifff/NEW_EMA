import { useEffect } from "react";
import { installReportDateRangeEnhancer } from "../utils/reportDateRangeEnhancer";
import ReportBuilderRulesLive from "./ReportBuilderRulesLive";

export default function ReportBoard() {
  useEffect(() => {
    installReportDateRangeEnhancer();

    document.documentElement.classList.add("ema-report-builder-active");
    document.body.classList.add("ema-report-builder-active");

    return () => {
      document.documentElement.classList.remove("ema-report-builder-active");
      document.body.classList.remove("ema-report-builder-active");
    };
  }, []);
  return <ReportBuilderRulesLive />;
}
