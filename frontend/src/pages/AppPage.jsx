import React from "react";
import Header from "@/components/Header";
import CheckerWorkspace from "@/components/CheckerWorkspace";
import AmbientCanvas from "@/components/AmbientCanvas";

export default function AppPage() {
  return (
    <div className="min-h-screen bg-[#EEF1F6] grain pt-24 pb-20 relative overflow-hidden">
      <AmbientCanvas />
      <Header />
      <div className="max-w-7xl mx-auto px-6 mb-8 relative z-10">
        <div className="label-tiny opacity-60">Workspace</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[#1B2340] mt-1 tracking-tighter">Verify anything</h1>
        <p className="opacity-70 mt-2">Text · Image · URL · QR Code · Payment screenshot. Green = real, red = flagged.</p>
      </div>
      <div className="relative z-10">
        <CheckerWorkspace />
      </div>
    </div>
  );
}
