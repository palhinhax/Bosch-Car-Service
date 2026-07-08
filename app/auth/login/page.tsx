"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import { BrandMark } from "@/components/brand";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "A palavra-passe é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginContent />
    </Suspense>
  );
}

// Full-screen photo background with a dark, Bosch-tinted overlay so the login
// card stays legible on top. Used by both the loading shell and the real form.
function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(var(--bosch-dark))] px-4 py-10">
      <Image
        src="/pexels-denniz-futalan-339724-4487611.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Contrast + brand tint overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,hsl(var(--bosch-red)/0.28),transparent_45%)]" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

function LoginShell() {
  return (
    <AuthBackground>
      <div className="mb-6 flex justify-center [filter:drop-shadow(0_2px_10px_rgba(0,0,0,0.55))]">
        <BrandMark light />
      </div>
      <Card className="border-white/15 bg-background/85 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            Iniciar sessão
          </CardTitle>
          <CardDescription className="text-center">
            Aceda à plataforma de gestão da oficina
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-10">
          <Spinner />
        </CardContent>
      </Card>
    </AuthBackground>
  );
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setError("Email ou palavra-passe incorretos");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Ocorreu um erro inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="mb-6 flex justify-center [filter:drop-shadow(0_2px_10px_rgba(0,0,0,0.55))]">
        <BrandMark light />
      </div>
      <Card className="border-white/15 bg-background/85 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            Iniciar sessão
          </CardTitle>
          <CardDescription className="text-center">
            Aceda à plataforma de gestão da oficina
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.pt"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Spinner size="sm" className="mr-2" />}
              Entrar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthBackground>
  );
}
