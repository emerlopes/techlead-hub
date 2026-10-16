import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertTone = "info" | "success" | "warning" | "danger";

const styles: Record<AlertTone, { box: string; icon: LucideIcon; iconColor: string }> = {
  info: { box: "border-info/30 bg-info-subtle", icon: Info, iconColor: "text-info" },
  success: { box: "border-success/30 bg-success-subtle", icon: CircleCheck, iconColor: "text-success" },
  warning: { box: "border-warning/30 bg-warning-subtle", icon: TriangleAlert, iconColor: "text-warning" },
  danger: { box: "border-danger/30 bg-danger-subtle", icon: CircleX, iconColor: "text-danger" },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const s = styles[tone];
  const Icon = s.icon;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border p-3 text-sm", s.box, className)}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", s.iconColor)} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium text-foreground">{title}</p>
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
