import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-[55vh]">
      <PageLoadingSkeleton variant="dashboard" title="Loading your workspace" />
    </div>
  );
}
