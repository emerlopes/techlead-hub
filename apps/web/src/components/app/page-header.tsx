export function PageHeader({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow && (
        <p className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
      )}
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
