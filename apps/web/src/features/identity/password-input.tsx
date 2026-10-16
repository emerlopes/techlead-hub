"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PasswordInput(props: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-9" />
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-0.5 right-0.5 size-7 text-muted-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </Button>
    </div>
  );
}
