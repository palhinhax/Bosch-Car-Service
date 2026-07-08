"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { changeOwnPassword } from "@/lib/actions";

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (next.length < 6) {
      setError("A nova palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("A confirmação não coincide com a nova palavra-passe.");
      return;
    }
    startTransition(async () => {
      const res = await changeOwnPassword(current, next);
      if (res.ok) {
        toast({ title: "Palavra-passe alterada" });
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="max-w-md space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-2">
        <Label>Palavra-passe atual</Label>
        <Input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Nova palavra-passe</Label>
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div className="grid gap-2">
          <Label>Confirmar</Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>
      <Button onClick={submit} disabled={pending || !current || !next}>
        {pending && <Spinner size="sm" className="mr-2" />}
        Alterar palavra-passe
      </Button>
    </div>
  );
}
