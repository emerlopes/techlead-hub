"use client";

import { createContext, useContext, useId, useState } from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{ value: string; setValue: (v: string) => void; id: string } | null>(
  null,
);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* deve estar dentro de <Tabs>");
  return ctx;
}

export function Tabs({
  defaultValue,
  className,
  children,
}: {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState(defaultValue);
  const id = useId();
  return (
    <TabsContext.Provider value={{ value, setValue, id }}>
      <div className={cn("flex flex-col gap-3", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-8 w-fit items-center gap-0.5 rounded-md bg-secondary p-0.5 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: active, setValue, id } = useTabs();
  const selected = active === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${id}-t-${value}`}
      aria-selected={selected}
      aria-controls={`${id}-p-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-2.5 text-xs font-medium pressable hover:text-foreground [&_svg]:size-3.5",
        selected && "bg-surface text-foreground shadow-xs",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: active, id } = useTabs();
  if (active !== value) return null;
  return (
    <div role="tabpanel" id={`${id}-p-${value}`} aria-labelledby={`${id}-t-${value}`} className={className}>
      {children}
    </div>
  );
}
