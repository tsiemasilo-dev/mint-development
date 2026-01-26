import React from "react";
import { ArrowLeft, ChevronRight, ShieldCheck, FileText, ScrollText } from "lucide-react";

const LegalDocumentationPage = ({ onNavigate }) => {
  const legalItems = [
    { id: "privacy", label: "Privacy Policy", icon: ShieldCheck },
    { id: "terms", label: "Terms of Service", icon: FileText },
    { id: "cookies", label: "Cookie Policy", icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-white px-6 pb-10 pt-10">
      <header className="relative mb-8 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onNavigate?.("more")}
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Legal Documentation</h1>
      </header>

      <div className="space-y-2">
        {legalItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-base font-medium text-slate-800">{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LegalDocumentationPage;
