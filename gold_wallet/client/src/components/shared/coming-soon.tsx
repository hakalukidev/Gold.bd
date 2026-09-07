import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/** Placeholder for sidebar destinations that don't have a real feature (or
 * backend — see CLAUDE.md) behind them yet, so the nav link goes somewhere
 * honest instead of 404ing or silently pretending to work. */
export function ComingSoon({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} action={<Badge variant="secondary">Coming soon</Badge>} />
      <Card>
        <CardContent>
          <EmptyState icon={icon} title="Not available yet" description="We're still building this — check back soon." />
        </CardContent>
      </Card>
    </div>
  );
}
