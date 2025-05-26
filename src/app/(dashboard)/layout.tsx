"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoadingAuth, logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  if (isLoadingAuth || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold text-primary">TaskSP</span>
          </Link>
          <div className="flex items-center gap-4">
            {user && <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.username}!</span>}
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 md:p-6">
        {children}
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t bg-secondary/50">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} TaskSP. Built with Next.js and Stored Procedures in mind.
          </p>
        </div>
      </footer>
    </div>
  );
}
