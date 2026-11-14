"use client"

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FilingComingSoon() {
  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <Clock className="w-10 h-10 text-primary" />
      </div>
      
      <h1 className="text-4xl font-headline font-bold text-on-surface">Tax Filing</h1>
      <p className="text-xl text-on-surface-variant max-w-2xl">
        Direct statutory transmission is currently under development. You can preview our interactive returns filing workflow today or return to your compliance console.
      </p>

      <Card className="bg-surface-container-lowest border-outline-variant shadow-soft rounded-lg mt-8 max-w-md w-full">
        <CardHeader className="pb-4 border-b border-outline-variant">
          <CardTitle className="text-xl font-headline">Coming Soon</CardTitle>
          <CardDescription>Preview the upcoming statutory filing experience below.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-on-surface font-medium">Simplified Nil Returns</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-on-surface font-medium">Step-by-step Income Declaration</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-on-surface font-medium">Automated Relief Calculations</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link href="/retrieval-portal?view=filing" className="w-full">
              <Button className="w-full h-11 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary/90">
                <span>Launch Interactive Filing Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full">
              <Button variant="outline" className="w-full h-10 rounded-xl border-outline-variant font-bold text-xs">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
