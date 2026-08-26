import React from "react";
import Header from "@/components/Header";
import CheckerWorkspace from "@/components/CheckerWorkspace";

export default function AppPage() {
  return (
    <div className="min-h-screen bg-[#EEF1F6] grain pt-24 pb-20">
      <Header />
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="label-tiny opacity-60">Workspace</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[#1B2340] mt-1">Verify anything</h1>
        <p className="opacity-70 mt-2">Text · Image · QR Code · Payment screenshot. Green = real, red = flagged.</p>
      </div>
      <CheckerWorkspace />
    </div>
  );
}
