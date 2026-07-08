"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { uploadMyAvatar, removeMyAvatar } from "@/lib/actions";

export function AvatarUploader({
  employee,
}: {
  employee: {
    id: string;
    name: string;
    color: string;
    avatarKey: string | null;
  };
}) {
  const { toast } = useToast();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  // Local version key: starts as the stored key, becomes a timestamp after an
  // upload so the <img> URL changes and the browser fetches the new photo.
  const [avatarKey, setAvatarKey] = useState<string | null>(employee.avatarKey);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await uploadMyAvatar(fd);
      if (res.ok) {
        setAvatarKey(`v${Date.now()}`);
        toast({ title: "Foto atualizada" });
        router.refresh();
      } else {
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const onRemove = () =>
    startTransition(async () => {
      const res = await removeMyAvatar();
      if (res.ok) {
        setAvatarKey(null);
        toast({ title: "Foto removida" });
        router.refresh();
      } else {
        toast({
          title: "Erro",
          description: res.error,
          variant: "destructive",
        });
      }
    });

  return (
    <div className="flex items-center gap-4">
      <EmployeeAvatar
        id={employee.id}
        name={employee.name}
        color={employee.color}
        avatarKey={avatarKey}
        size={64}
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending && <Spinner size="sm" className="mr-2" />}
            {avatarKey ? "Alterar foto" : "Carregar foto"}
          </Button>
          {avatarKey && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onRemove}
              className="text-destructive"
            >
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG ou WebP — máximo 5 MB.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
