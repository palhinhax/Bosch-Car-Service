"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { updateMyProfile } from "@/lib/actions";

export type MyProfileValues = {
  phone: string;
  personalEmail: string;
  address: string;
  birthDate: string; // YYYY-MM-DD
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
};

export function ProfileForm({ initial }: { initial: MyProfileValues }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<MyProfileValues>(initial);

  const set = (key: keyof MyProfileValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateMyProfile(values);
      if (res.ok) {
        toast({ title: "Perfil atualizado" });
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">
          Contactos pessoais
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Telemóvel</Label>
            <Input
              value={values.phone}
              onChange={(e) => set("phone")(e.target.value)}
              autoComplete="tel"
              placeholder="9XX XXX XXX"
            />
          </div>
          <div className="grid gap-2">
            <Label>Email pessoal</Label>
            <Input
              type="email"
              value={values.personalEmail}
              onChange={(e) => set("personalEmail")(e.target.value)}
              autoComplete="email"
              placeholder="nome@exemplo.pt"
            />
          </div>
          <div className="grid gap-2">
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              value={values.birthDate}
              onChange={(e) => set("birthDate")(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Morada</Label>
            <Textarea
              rows={2}
              value={values.address}
              onChange={(e) => set("address")(e.target.value)}
              placeholder="Rua, nº, código-postal, localidade"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">
          Contacto de emergência
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input
              value={values.emergencyContactName}
              onChange={(e) => set("emergencyContactName")(e.target.value)}
              placeholder="Nome do contacto"
            />
          </div>
          <div className="grid gap-2">
            <Label>Relação</Label>
            <Input
              value={values.emergencyContactRelation}
              onChange={(e) => set("emergencyContactRelation")(e.target.value)}
              placeholder="Cônjuge, Pai/Mãe, Irmão(ã)…"
            />
          </div>
          <div className="grid gap-2">
            <Label>Telefone</Label>
            <Input
              value={values.emergencyContactPhone}
              onChange={(e) => set("emergencyContactPhone")(e.target.value)}
              autoComplete="tel"
              placeholder="9XX XXX XXX"
            />
          </div>
        </div>
      </div>

      <Button onClick={submit} disabled={pending}>
        {pending && <Spinner size="sm" className="mr-2" />}
        Guardar perfil
      </Button>
    </div>
  );
}
