import React from "react";
import {
  ChevronLeft, ShieldCheck, Zap, CheckCircle2,
  ArrowRight, Percent, Clock, Lock, FileText
} from "lucide-react";

const CreditHowItWorks = ({ onBack, onTabChange, profile }) => {
  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const sections = [
    {
      id: "secured",
      icon: ShieldCheck,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      borderColor: "border-violet-100",
      title: "Portfolio Backed Credit",
      subtitle: "Borrow against your holdings — without selling",
      badge: "Secured",
      badgeBg: "bg-violet-100 text-violet-700",
      steps: [
        { icon: Lock, label: "Select Collateral", desc: "Choose which of your eligible holdings to pledge as security." },
        { icon: Percent, label: "Get Your Rate", desc: "SA Prime Rate (10.5% p.a.) with NCA-regulated fees. No hidden costs." },
        { icon: FileText, label: "Sign Digitally", desc: "Review your repayment schedule and sign the agreement in-app." },
        { icon: ArrowRight, label: "Funds Disbursed", desc: "Capital is paid to your verified bank account via EFT within 24 hours." },
      ],
      details: [
        { label: "Rate", value: "Prime + 0% (10.5% p.a.)" },
        { label: "Term", value: "1 – 6 months" },
        { label: "Initiation Fee", value: "R165 + 10% (capped at R1 050)" },
        { label: "Monthly Service Fee", value: "R69/month" },
        { label: "Repayment", value: "DebiCheck debit order" },
      ],
    },
    {
      id: "unsecured",
      icon: Zap,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      borderColor: "border-indigo-100",
      title: "Unsecured Credit",
      subtitle: "Capital based on your digital financial profile",
      badge: "Unsecured",
      badgeBg: "bg-indigo-100 text-indigo-700",
      steps: [
        { icon: FileText, label: "Complete Profile", desc: "Provide employment and income details for an affordability assessment." },
        { icon: CheckCircle2, label: "Digital Check", desc: "We analyse your digital profile — no physical documents required upfront." },
        { icon: Percent, label: "Get Your Offer", desc: "Receive a personalised credit offer based on your assessed risk profile." },
        { icon: ArrowRight, label: "Accept & Draw", desc: "Accept the offer and draw down funds directly to your bank account." },
      ],
      details: [
        { label: "Rate", value: "Risk-based (NCA max)" },
        { label: "Term", value: "1 – 12 months" },
        { label: "Credit Limit", value: "Up to R50 000" },
        { label: "Repayment", value: "Monthly debit order" },
        { label: "Decision", value: "Within minutes" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-32 relative text-slate-900 overflow-x-hidden">
      <div className="px-5 pt-14 pb-6 sticky top-0 bg-slate-50/80 backdrop-blur-xl z-30 border-b border-slate-100/50">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: fonts.display }}>How It Works</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mint Credit Products</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-6">
        <p className="text-xs text-slate-500 leading-relaxed font-medium px-1">
          Mint offers two distinct credit solutions — choose the one that suits your needs. All credit is subject to NCA regulation and affordability assessment.
        </p>

        {sections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.id} className={`bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border ${section.borderColor}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`h-12 w-12 rounded-2xl ${section.iconBg} flex items-center justify-center border ${section.borderColor}`}>
                  <SectionIcon size={22} className={section.iconColor} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: fonts.display }}>{section.title}</h2>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${section.badgeBg}`}>{section.badge}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">{section.subtitle}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {section.steps.map((step, i) => {
                  const StepIcon = step.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center">
                        <StepIcon size={13} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{step.label}</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-50 rounded-[20px] p-4 border border-slate-100 space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Key Terms</p>
                {section.details.map((d, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{d.label}</span>
                    <span className="text-xs font-bold text-slate-900">{d.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  if (section.id === "secured") onTabChange("instantLiquidity");
                  else onTabChange("creditApply");
                }}
                className="mt-4 w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-all"
              >
                Apply Now <ArrowRight size={14} />
              </button>
            </div>
          );
        })}

        <div className="bg-amber-50 rounded-[24px] p-5 border border-amber-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-2">Regulatory Notice</p>
          <p className="text-[10px] text-amber-800 leading-relaxed">
            All credit extended by Mint is subject to the National Credit Act (NCA) No. 34 of 2005. We are a registered credit provider. Lending decisions are subject to affordability and credit assessment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreditHowItWorks;
