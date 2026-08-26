import { cn } from "@/lib/utils";

export function AdminPageHeader({
  actions,
  actionsClassName,
  className,
  description,
  eyebrow,
  title,
}: {
  actions?: React.ReactNode;
  actionsClassName?: string;
  className?: string;
  description: React.ReactNode;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex flex-col justify-between gap-4 md:flex-row md:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase leading-[14px] tracking-[2px] text-artistbor-accent">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-[30px] tracking-[-0.02em] text-artistbor-primary md:text-[30px] md:leading-9">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-normal leading-[22px] text-artistbor-secondary">
          {description}
        </p>
      </div>
      {actions ? (
        <div
          className={cn(
            "flex w-full flex-wrap gap-3 md:w-auto md:justify-end",
            actionsClassName,
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
