"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { updateSettings } from "@/lib/actions";
import type { SettingsInput } from "@/lib/schemas";

export function SettingsForm({
  initial,
  canManage,
}: {
  initial: SettingsInput;
  canManage: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<SettingsInput>(initial);

  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () =>
    startTransition(async () => {
      const res = await updateSettings(form);
      if (res.ok) toast({ title: "Definições guardadas" });
      else
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
    });

  return (
    <div className="max-w-lg space-y-4">
      <div className="grid gap-2">
        <Label>Nome da oficina</Label>
        <Input
          value={form.name}
          disabled={!canManage}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Ano do mapa</Label>
          <Input
            type="number"
            value={form.year}
            disabled={!canManage}
            onChange={(e) => set("year", Number(e.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label>Mínimo de equipa / dia</Label>
          <Input
            type="number"
            value={form.minStaffPerDay}
            disabled={!canManage}
            onChange={(e) => set("minStaffPerDay", Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Aviso quando as férias deixam menos do que este número de
            colaboradores.
          </p>
        </div>
      </div>
      {canManage && (
        <Button onClick={submit} disabled={pending}>
          {pending && <Spinner size="sm" className="mr-2" />}
          Guardar definições
        </Button>
      )}
    </div>
  );
}
