import { useEffect, useRef, useState } from "react";
import SumsubVerification from "../components/SumsubVerification";
import { supabase } from "../lib/supabase";
import "../styles/onboarding-process.css";

const ClipboardCheckIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5.25H7.5A1.5 1.5 0 0 0 6 6.75v10.5A1.5 1.5 0 0 0 7.5 18.75h9A1.5 1.5 0 0 0 18 17.25V6.75A1.5 1.5 0 0 0 16.5 5.25H15M9 5.25A1.5 1.5 0 0 0 10.5 6.75h3A1.5 1.5 0 0 0 15 5.25M9 5.25A1.5 1.5 0 0 1 10.5 3.75h3A1.5 1.5 0 0 1 15 5.25M9.75 13.5l1.5 1.5 3-3"
    />
  </svg>
);

const ArrowLeftIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

const FileContractIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.25 3.75H8.25a1.5 1.5 0 0 0-1.5 1.5v13.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V9.75m-3-6 3 3m-3-3v3h3"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 13.5h6m-6 3h4"
    />
  </svg>
);

const ShieldIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
    />
  </svg>
);

const WalletIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1 0 6h3.75A2.25 2.25 0 0 0 21 13.5V12Zm0 0V9.75a2.25 2.25 0 0 0-2.25-2.25h-13.5A2.25 2.25 0 0 0 3 9.75v7.5A2.25 2.25 0 0 0 5.25 19.5h13.5A2.25 2.25 0 0 0 21 17.25V12ZM5.25 7.5h13.5A2.25 2.25 0 0 1 21 9.75M5.25 7.5A2.25 2.25 0 0 0 3 9.75M5.25 7.5V6a2.25 2.25 0 0 1 2.25-2.25h9A2.25 2.25 0 0 1 18.75 6v1.5"
    />
  </svg>
);

const employmentOptions = [
  { value: "", label: "Select your status" },
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
  { value: "contractor", label: "Contractor" },
  { value: "retired", label: "Retired" },
];

const sourceOfFundsOptions = [
  { value: "", label: "Select source of funds" },
  { value: "salary", label: "Salary / Employment Income" },
  { value: "business", label: "Business Income" },
  { value: "savings", label: "Savings" },
  { value: "investment_returns", label: "Investment Returns" },
  { value: "inheritance", label: "Inheritance" },
  { value: "gift", label: "Gift" },
  { value: "pension", label: "Pension / Retirement Fund" },
  { value: "property_sale", label: "Sale of Property" },
  { value: "other", label: "Other" },
];

const monthlyInvestmentOptions = [
  { value: "", label: "Select amount range" },
  { value: "under_1000", label: "Less than R1,000" },
  { value: "1000_5000", label: "R1,000 - R5,000" },
  { value: "5000_10000", label: "R5,000 - R10,000" },
  { value: "10000_50000", label: "R10,000 - R50,000" },
  { value: "50000_100000", label: "R50,000 - R100,000" },
  { value: "over_100000", label: "More than R100,000" },
];

const OnboardingProcessPage = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [employerIndustry, setEmployerIndustry] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [incomeCurrency, setIncomeCurrency] = useState("USD");
  const [annualIncome, setAnnualIncome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showProceed, setShowProceed] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [existingOnboardingId, setExistingOnboardingId] = useState(null);
  const [agreedRiskDisclosure, setAgreedRiskDisclosure] = useState(false);
  const [agreedMandate, setAgreedMandate] = useState(false);
  const [sourceOfFunds, setSourceOfFunds] = useState("");
  const [sourceOfFundsOther, setSourceOfFundsOther] = useState("");
  const [expectedMonthlyInvestment, setExpectedMonthlyInvestment] = useState("");
  const [agreedSourceOfFunds, setAgreedSourceOfFunds] = useState(false);
  const [sofDropdownOpen, setSofDropdownOpen] = useState(false);
  const [kycAlreadyVerified, setKycAlreadyVerified] = useState(false);
  const [authStatus, setAuthStatus] = useState({
    isChecked: false,
    isAuthenticated: false,
    displayName: "",
  });
  const dropdownRef = useRef(null);
  const sofDropdownRef = useRef(null);

  const selectedOption = employmentOptions.find(
    (option) => option.value === employmentStatus
  );

  const selectedSofOption = sourceOfFundsOptions.find(
    (option) => option.value === sourceOfFunds
  );

  const goToStep = (nextStep) => {
    setIsFading(true);
    window.setTimeout(() => {
      setStep(nextStep);
      setIsFading(false);
    }, 260);
  };

  const handleContinue = () => {
    if (step === 0) {
      if (kycAlreadyVerified) {
        goToStep(3);
      } else {
        goToStep(2);
      }
    }
  };

  const handleBack = () => {
    if (step === 6) {
      goToStep(5);
    } else if (step === 5) {
      goToStep(4);
    } else if (step === 4) {
      goToStep(3);
    } else if (step === 3) {
      if (kycAlreadyVerified) {
        goToStep(0);
      } else {
        goToStep(2);
      }
    } else if (step === 2) {
      goToStep(0);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSelect = (value) => {
    setEmploymentStatus(value);
    setIsDropdownOpen(false);
  };

  const handleSofSelect = (value) => {
    setSourceOfFunds(value);
    setSofDropdownOpen(false);
  };

  const toNumericIncome = (value) => {
    if (!value) return null;
    const normalized = value.replace(/[\s,]/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const toGraduationDate = (value) => {
    if (!value) return null;
    return `${value}-01`;
  };

  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitSuccess("");

    if (!employmentStatus) {
      setSubmitError("Please select your employment status.");
      return;
    }

    if (!supabase) {
      setSubmitError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setSubmitError("You must be signed in to continue.");
        return;
      }

      const payload = {
        employment_status: employmentStatus,
        employer_name: showEmployedSection ? employerName || null : null,
        employer_industry: showEmployedSection ? employerIndustry || null : null,
        employment_type: showEmployedSection ? employmentType || null : null,
        institution_name: showStudentSection ? institutionName || null : null,
        course_name: showStudentSection ? courseName || null : null,
        graduation_date: showStudentSection ? toGraduationDate(graduationDate) : null,
        annual_income_amount: toNumericIncome(annualIncome),
        annual_income_currency: incomeCurrency || "USD",
        existing_onboarding_id: existingOnboardingId || null,
      };

      const res = await fetch("/api/onboarding/save-employment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Failed to save onboarding details.");
      if (result.onboarding_id) {
        setExistingOnboardingId(result.onboarding_id);
      }

      setSubmitSuccess("Onboarding details saved successfully.");
      goToStep(2);
    } catch (err) {
      setSubmitError(err?.message || "Failed to save onboarding details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (sofDropdownRef.current && !sofDropdownRef.current.contains(event.target)) {
        setSofDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    const loadAuthUser = async () => {
      if (!supabase) {
        setAuthStatus({ isChecked: true, isAuthenticated: false, displayName: "" });
        return;
      }

      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) {
          setAuthStatus({ isChecked: true, isAuthenticated: false, displayName: "" });
          return;
        }

        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "Signed in";

        setAuthStatus({ isChecked: true, isAuthenticated: true, displayName });
      } catch {
        setAuthStatus({ isChecked: true, isAuthenticated: false, displayName: "" });
      }
    };

    loadAuthUser();
  }, []);

  useEffect(() => {
    const loadExistingOnboarding = async () => {
      if (!supabase) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.success && result.onboarding_id) {
          setExistingOnboardingId(result.onboarding_id);
        }
      } catch (err) {
        // ignore; user can still proceed normally
      }
    };

    loadExistingOnboarding();
  }, []);

  useEffect(() => {
    if (step !== 2) {
      setShowProceed(false);
    }
    if (step !== 5) {
      setAgreedTerms(false);
      setAgreedPrivacy(false);
    }
  }, [step]);

  useEffect(() => {
    const checkKycStatus = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "";
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;
        const res = await fetch(`${apiBase}/api/sumsub/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (data.success && data.status === "verified") {
          setKycAlreadyVerified(true);
          if (step === 2) setShowProceed(true);
        }
      } catch {
      }
    };
    checkKycStatus();
  }, [step]);

  const showEmployedSection =
    employmentStatus === "employed" ||
    employmentStatus === "self-employed" ||
    employmentStatus === "contractor";

  const showStudentSection = employmentStatus === "student";
  const agreementReady = agreedTerms && agreedPrivacy;
  const sofReady = sourceOfFunds && agreedSourceOfFunds;

  const handleFinalComplete = async () => {
    if (!supabase) {
      if (onComplete) onComplete();
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            existing_onboarding_id: existingOnboardingId || null,
            risk_disclosure_agreed: agreedRiskDisclosure || false,
            source_of_funds: sourceOfFunds || null,
            source_of_funds_other: sourceOfFunds === "other" ? (sourceOfFundsOther || null) : null,
            expected_monthly_investment: expectedMonthlyInvestment || null,
            agreed_terms: agreedTerms || false,
            agreed_privacy: agreedPrivacy || false,
          }),
        });
        const result = await res.json();
        if (!result.success) {
          console.error("Failed to complete onboarding:", result.error);
        }
      }
    } catch (err) {
      console.error("Failed to update KYC status:", err);
    }

    if (onComplete) onComplete();
  };

  return (
    <div
      className={`onboarding-process ${isFading ? "fade-out" : "fade-in"} ${
        isDropdownOpen || sofDropdownOpen ? "dropdown-open" : ""
      }`}
    >
      <div className="min-h-screen flex items-center justify-center px-4 py-8 relative">
        <button
          type="button"
          onClick={handleBack}
          className="back-button animate-fade-in delay-1"
          aria-label="Go back"
        >
          <ArrowLeftIcon width={20} height={20} />
        </button>
        <div className="w-full max-w-2xl onboarding-process-stage">
          <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-slate-500">
            {authStatus.isChecked ? (
              authStatus.isAuthenticated ? (
                <>Signed in as {authStatus.displayName}</>
              ) : (
                <>Not signed in</>
              )
            ) : (
              <>Checking session…</>
            )}
          </div>
          {step === 0 ? (
            <div>
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <ClipboardCheckIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  First time onboarding process
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  We need to verify a few details before you fully onboard
                </p>
              </div>

              <div className="steps-container animate-fade-in delay-2">
                <div className={`step-circle ${kycAlreadyVerified ? 'step-circle-complete' : ''}`}>
                  {kycAlreadyVerified ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : '1'}
                </div>
                <div className={`step-line ${kycAlreadyVerified ? 'step-line-complete' : ''}`}></div>
                <div className="step-circle">2</div>
                <div className="step-line"></div>
                <div className="step-circle">3</div>
                <div className="step-line"></div>
                <div className="step-circle">4</div>
                <div className="step-line"></div>
                <div className="step-circle">5</div>
              </div>

              <div className="step-info animate-fade-in delay-3">
                <div className={`step-item ${kycAlreadyVerified ? 'step-item-complete' : ''}`}>
                  <div className={`step-number ${kycAlreadyVerified ? 'step-number-complete' : ''}`}>
                    {kycAlreadyVerified ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : '1'}
                  </div>
                  <div className="step-content">
                    <div className="step-title">
                      Identification
                      {kycAlreadyVerified && <span className="step-verified-badge">Verified</span>}
                    </div>
                    <div className="step-description">
                      {kycAlreadyVerified
                        ? 'Identity verification complete'
                        : 'Verify your identity for security purposes'}
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <div className="step-title">Discretionary Mandate</div>
                    <div className="step-description">
                      Review and accept the FSP investment mandate
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <div className="step-title">Risk Disclosure</div>
                    <div className="step-description">
                      Review investment risk disclosure
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <div className="step-title">Source of Funds</div>
                    <div className="step-description">
                      Declare the origin of your investment funds
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">5</div>
                  <div className="step-content">
                    <div className="step-title">Agreements</div>
                    <div className="step-description">
                      Review and accept terms and conditions
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className="continue-button"
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>

              <div className="text-center mt-6 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  You'll be taken through our five-step process
                </p>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="w-full max-w-xl mx-auto">
              <div className="text-center mb-8 animate-fade-in delay-1">
                <p
                  className="text-xs uppercase tracking-[0.2em] mb-2"
                  style={{ color: "hsl(270 20% 55%)" }}
                >
                  Step 1 of 5
                </p>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Employment details
                </h2>
                <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                  Help us understand your <span className="mint-brand">MINT</span> profile
                </p>
              </div>

              <div className="space-y-5">
                <div className="animate-fade-in delay-2">
                  <label htmlFor="employment-status">Employment Status</label>
                  <div className="custom-select" ref={dropdownRef}>
                    <div
                      className={`glass-field select-trigger ${
                        isDropdownOpen ? "active" : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setIsDropdownOpen((prev) => !prev);
                        }
                      }}
                    >
                      <div
                        className="selected-value"
                        data-placeholder="Select your status"
                      >
                        {employmentStatus ? selectedOption?.label : ""}
                      </div>
                    </div>
                    <div className={`custom-dropdown ${isDropdownOpen ? "active" : ""}`}>
                      {employmentOptions.map((option) => (
                        <div
                          key={option.value || "placeholder"}
                          className={`custom-option ${
                            employmentStatus === option.value ? "selected" : ""
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelect(option.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleSelect(option.value);
                            }
                          }}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      id="employment-status"
                      name="employment-status"
                      value={employmentStatus}
                    />
                  </div>
                </div>

                <div
                  className={`conditional-section space-y-4 hide-when-dropdown-open ${
                    showEmployedSection ? "active" : ""
                  }`}
                >
                  <div className="grid-2">
                    <div>
                      <label htmlFor="employer-name">Employer Name</label>
                      <div className="glass-field">
                        <input
                          type="text"
                          id="employer-name"
                          placeholder="Company name"
                          value={employerName}
                          onChange={(event) => setEmployerName(event.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="employer-industry">Industry</label>
                      <div className="glass-field">
                        <select
                          id="employer-industry"
                          value={employerIndustry}
                          onChange={(event) => setEmployerIndustry(event.target.value)}
                        >
                          <option value="">Select industry</option>
                          <option value="technology">Technology</option>
                          <option value="finance">Finance</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="education">Education</option>
                          <option value="retail">Retail</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="employment-type">Employment Type</label>
                    <div className="glass-field">
                      <select
                        id="employment-type"
                        value={employmentType}
                        onChange={(event) => setEmploymentType(event.target.value)}
                      >
                        <option value="">Select type</option>
                        <option value="full-time">Full-Time</option>
                        <option value="part-time">Part-Time</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div
                  className={`conditional-section space-y-4 hide-when-dropdown-open ${
                    showStudentSection ? "active" : ""
                  }`}
                >
                  <div className="grid-2">
                    <div>
                      <label htmlFor="institution-name">Institution Name</label>
                      <div className="glass-field">
                        <input
                          type="text"
                          id="institution-name"
                          placeholder="University name"
                          value={institutionName}
                          onChange={(event) => setInstitutionName(event.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="course-name">Course / Major</label>
                      <div className="glass-field">
                        <input
                          type="text"
                          id="course-name"
                          placeholder="e.g. Computer Science"
                          value={courseName}
                          onChange={(event) => setCourseName(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="graduation-date">Expected Graduation</label>
                    <div className="glass-field">
                      <input
                        type="month"
                        id="graduation-date"
                        value={graduationDate}
                        onChange={(event) => setGraduationDate(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="animate-fade-in delay-3 hide-when-dropdown-open">
                  <label htmlFor="annual-income">Annual Income</label>
                  <div className="income-row">
                    <div className="glass-field">
                      <select
                        id="income-currency"
                        value={incomeCurrency}
                        onChange={(event) => setIncomeCurrency(event.target.value)}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="ZAR">ZAR</option>
                        <option value="NGN">NGN</option>
                        <option value="KES">KES</option>
                        <option value="GHS">GHS</option>
                      </select>
                    </div>
                    <div className="glass-field">
                      <input
                        type="text"
                        id="annual-income"
                        placeholder="e.g. 50,000"
                        value={annualIncome}
                        onChange={(event) => setAnnualIncome(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 animate-fade-in delay-4 hide-when-dropdown-open">
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Continue"}
                  </button>
                  {submitError ? (
                    <p className="form-error" role="alert">
                      {submitError}
                    </p>
                  ) : null}
                  {submitSuccess ? (
                    <p className="form-success" role="status">
                      {submitSuccess}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center mb-8 animate-fade-in delay-1">
                <p
                  className="text-xs uppercase tracking-[0.2em] mb-2"
                  style={{ color: "hsl(270 20% 55%)" }}
                >
                  Step 1 of 5
                </p>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Identity Verification
                </h2>
                <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                  {kycAlreadyVerified
                    ? "Your identity has already been verified"
                    : "Verify your identity securely with Sumsub"}
                </p>
              </div>
              {kycAlreadyVerified ? (
                <div className="text-center py-8 animate-fade-in delay-2">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: "hsl(270 30% 25%)" }}>
                    Identity Verified
                  </h3>
                  <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                    Your identity has been successfully verified
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: "hsl(152 80% 95%)", color: "hsl(152 60% 30%)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>Verification Complete</span>
                  </div>
                </div>
              ) : (
                <SumsubVerification onVerified={() => setShowProceed(true)} />
              )}
              {showProceed && (
                <div className="text-center mt-8 animate-fade-in delay-2">
                  <button
                    type="button"
                    className="continue-button proceed-button"
                    onClick={() => goToStep(3)}
                  >
                    Continue to Mandate
                  </button>
                </div>
              )}
            </div>
          ) : step === 3 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <FileContractIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Discretionary FSP Mandate
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  Please review and accept the investment management mandate
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
              </div>

              <div className="agreement-card animate-fade-in delay-2">
                <div className="agreement-title">Discretionary Investment Management Mandate</div>

                <div className="agreement-section">
                  <div className="agreement-text" style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '8px' }}>
                    ENTERED INTO BETWEEN
                  </div>
                  <div className="agreement-text" style={{ textAlign: 'center' }}>
                    <strong>ALGOHIVE (PTY) LTD</strong><br />
                    (Registration Number: 2024/644796/07)<br />
                    An Authorised Financial Services Provider<br />
                    <strong>FSP NO 55118</strong>
                  </div>
                  <div className="agreement-text" style={{ textAlign: 'center' }}>
                    3 Gwen Lane, Sandown, Sandton, 2031<br />
                    Tel: +27 (0) 73 781 3375<br />
                    Email: info@thealgohive.com
                  </div>
                  <div className="agreement-text" style={{ textAlign: 'center', margin: '8px 0' }}>
                    (hereinafter referred to as <strong>ALGOHIVE</strong>)
                  </div>
                  <div className="agreement-text" style={{ textAlign: 'center', fontWeight: 'bold' }}>and</div>
                  <div className="agreement-text" style={{ textAlign: 'center' }}>
                    <strong>The Client</strong> (as per your registered account details)
                  </div>
                  <div className="agreement-text" style={{ textAlign: 'center', margin: '8px 0' }}>
                    (hereinafter referred to as the <strong>Client</strong>)
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">1. Introduction</div>
                  <div className="agreement-text">
                    1.1 ALGOHIVE warrants that it is the holder of a Category II FSP license number 55118, in accordance with the Financial Advisory and Intermediary Services Act, 2002 (Act No. 37 of 2002), hereafter referred to as FAIS and is authorised to render intermediary services of a discretionary nature in respect of investment products residing under the financial product subcategories indicated in paragraph 1.2 hereunder. The Conditions promulgated in terms of FAIS, provide that a Discretionary Financial Service Provider shall enter into a written mandate with the Client to record the arrangements between the Client and the Financial Service Provider (FSP). The terms and conditions of this written mandate are recorded hereunder.
                  </div>
                  <div className="agreement-text">
                    1.2 ALGOHIVE may, in order to render an intermediary service to the Client, utilise the services of its own staff/approved strategists or that of another approved FSP.
                  </div>
                  <div className="agreement-text">
                    1.3 ALGOHIVE is authorised to invest in any of the following financial product categories:
                  </div>
                  <div className="agreement-text" style={{ marginTop: '8px' }}>
                    <strong>Category I – Advice and Intermediary Services:</strong>
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    • Long term Insurance Sub Category A<br />
                    • Long term Insurance Sub Category B1<br />
                    • Long term Insurance Sub Category B2<br />
                    • Long term Insurance Sub Category C<br />
                    • Retail Pension Funds<br />
                    • Pension Fund Benefits<br />
                    • Shares<br />
                    • Money Market<br />
                    • Participatory Interest in a Collective Investment Scheme<br />
                    • Long-term Deposits<br />
                    • Short-term Deposits<br />
                    • Crypto Assets
                  </div>
                  <div className="agreement-text" style={{ marginTop: '8px' }}>
                    <strong>Category II – Intermediary Services:</strong>
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    • Shares<br />
                    • Participatory Interest in a Collective Investment Scheme<br />
                    • Long term Deposits<br />
                    • Short term Deposits<br />
                    • Crypto Assets
                  </div>
                  <div className="agreement-text">
                    1.4 Prior to entering into this Mandate ALGOHIVE obtained from the Client information, with regards to the Client's financial circumstances, needs and objectives and such other information necessary to enable ALGOHIVE to render suitable intermediary services to the Client in terms hereof. Alternatively, ALGOHIVE has ascertained that such information was obtained from the Client's financial advisor and has checked that the advisor is licensed in terms of the FAIS Act.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">2. Authorisation</div>
                  <div className="agreement-text">
                    2.1 The Client hereby authorises ALGOHIVE to manage the Client's investments either with full discretion or limited discretion as set out in the schedule that is attached to this Mandate.
                  </div>
                  <div className="agreement-text">
                    2.2 This Mandate and attached schedules authorise ALGOHIVE, as the Client's duly authorised agent, to purchase, sell and enter into any transaction on the Client's behalf and in respect of the investments.
                  </div>
                  <div className="agreement-text">
                    2.3 ALGOHIVE may implement investment instructions or model portfolios that replicate, or mirror investment strategies selected by the Client from approved strategist models, within the discretion authorised under this mandate.
                  </div>
                  <div className="agreement-text">
                    2.4 ALGOHIVE may invest in foreign investments on behalf of the Client.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">3. Investment Objectives</div>
                  <div className="agreement-text">
                    3.1 The Client's investment objectives are specified in the schedule that is attached to this Mandate.
                  </div>
                  <div className="agreement-text">
                    3.2 The Client's risk profile is determined considering the Client's current set of information and circumstances and the Client acknowledges that these circumstances and information may change over time.
                  </div>
                  <div className="agreement-text">
                    3.3 The Client warrants the on-going accuracy and correctness of the Client's investment objectives and any other information that has been provided to ALGOHIVE in order to conclude this Mandate.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">4. Risk Disclosure</div>
                  <div className="agreement-text">
                    4.1 ALGOHIVE uses its discretion to invest on the Client's behalf with great care and diligence. However, the Client acknowledges that there is a risk associated with investing in the financial products involved. The value of the investments and income may rise as well as fall, and there is a risk that the Client may suffer financial losses.
                  </div>
                  <div className="agreement-text">
                    4.2 Where the Client selects a strategist model for replication, performance may vary due to timing, execution, liquidity, and cost factors. Past performance of strategist models is not necessarily indicative of future results. ALGOHIVE does not guarantee identical performance or outcomes.
                  </div>
                  <div className="agreement-text">
                    4.3 The Client acknowledges that it has been made aware by ALGOHIVE of risks pertaining to the investments which may result in financial loss to it and acknowledges that it accepts such risks and ALGOHIVE or its staff will not be liable or responsible for any financial losses.
                  </div>
                  <div className="agreement-text">
                    4.4 The Client hereby irrevocably indemnifies ALGOHIVE and holds it harmless against all and any claims of whatsoever nature that might be made against it howsoever arising from its management of the investments including but not limited to any loss or damage which might be suffered by the Client in consequence of any depreciation in the value of the investments from whatsoever cause arising.
                  </div>
                  <div className="agreement-text">
                    4.5 When investing in foreign investment products, it is important to be aware of the following risks:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    4.5.1 Obtaining access to investment performance information may be more difficult than South African based investments.<br /><br />
                    4.5.2 Investments are exposed to different tax regimes which may change without warning, and which may influence investment returns.<br /><br />
                    4.5.3 Exchange control measures may change in the country of investment and it may influence accessibility to the invested capital.<br /><br />
                    4.5.4 The value of the Rand with respect to the base currencies in which the foreign investment products are invested will fluctuate. The Rand value of such foreign investment products will also fluctuate accordingly.
                  </div>
                  <div className="agreement-text">
                    4.6 Subject to its discretionary authorisation, ALGOHIVE may invest in wrap funds or models on behalf of the Client in terms of this Mandate and is thus required by the registrar to make certain disclosures regarding wrap funds and how they differ from funds of funds:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    4.6.1 A fund of funds is a collective investment scheme fund that is not allowed to invest more than 50% of the value of the fund in any one collective investment scheme fund. The Collective Investment Scheme Act guarantees the repurchase of participatory interests in a fund of funds by the management company.<br /><br />
                    4.6.2 A wrap fund or a model is a basket of different collective investment schemes wrapped as a single investment portfolio. The underlying combination of collective investments schemes is selected optimally to target the risk/return requirement and investment objectives of the client. In fact, it is a number of separate investments in which the investor has direct ownership. These underlying investments are selected in line with the investment requirements of the Client. There is no joint ownership among investors and individual ownership of the participatory interests in the collective investment schemes can be transparently demonstrated at all times. A wrap fund investment is administered and facilitated by a linked investment service provider (LISP) i.e. an Administrative FSP. A wrap fund has no limit concerning the collective investment schemes that it may include in its portfolio. The Administrative FSP of the wrap funds does not guarantee the repurchase of participatory interests in the collective investment schemes that comprise the wrap funds. The Administrative FSP has service level agreements in place with the management company of each collective investment scheme according to which the repurchase of participatory interests in collective investment schemes comprising wrap funds are guaranteed. The costs and other information applicable to wrap funds are set out in the documentation of the administrator of the wrap funds.
                  </div>
                  <div className="agreement-text">
                    4.7 Any jurisdiction restrictions in respect of the client's portfolio are specified in the schedule that is attached to this Mandate.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">5. Registration of Investments</div>
                  <div className="agreement-text">
                    5.1 All investments managed by ALGOHIVE in terms of this Mandate shall, at ALGOHIVE's election, be registered from time to time in the name of:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    5.1.1 The Client, or<br /><br />
                    5.1.2 A Nominee company as the custodian thereof for the benefit of the Client, or<br /><br />
                    5.1.3 A Nominee company of a member of the relevant stock or securities exchange, or<br /><br />
                    5.1.4 In the case of a discretionary LISP, the independent custodian
                  </div>
                  <div className="agreement-text">
                    5.2 The Client warrants and undertakes that all investments entrusted and/or delivered by it, or under its authority, to ALGOHIVE in terms of or for the purposes of this Mandate, are not and will not be subject to any lien, charge or other encumbrance or impediment to transfer and that the same shall remain free to any such lien, charge, encumbrance or impediment whilst subject to ALGOHIVE's authority pursuant to this Mandate.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">6. Treatment of Funds</div>
                  <div className="agreement-text">
                    6.1 ALGOHIVE shall not receive funds from the Client for the purpose of managing the investments as defined in the Mandate. The Client will deposit the funds directly into the bank account of the investment company or their nominee company (see Annexure A for banking details) where such funds are to be placed for the future management of the investment. Further, ALGOHIVE will not receive any monies whatsoever which are not received through the intermediation of a bank.
                  </div>
                  <div className="agreement-text">
                    6.2 Any income, dividends or other distributions generated by the investment will be re-invested in the investment for the Client unless otherwise instructed in the Schedule. If the Client instructs such income, dividends or other distributions to be paid to the Client quarterly or six-monthly, depending on the underlying investments, payment will be effected into the Client's stipulated bank account as they fall due.
                  </div>
                  <div className="agreement-text">
                    6.3 In respect of any monies received from an ALGOHIVE client and paid into the ALGOHIVE Client Account, a rate equal to the prevailing banks daily call rate will be accrued and invested for or on behalf of the client as part of their portfolio as soon as the investment on behalf of the client is made. Any other cash portfolio utilized by ALGOHIVE on behalf of a client which earns either interest and/or dividends will be solely for the account of the client after the deduction of the stated fees. Both interest and dividends will be apportioned immediately following accrual and receipt thereof.
                  </div>
                  <div className="agreement-text">
                    6.4 No third-party payments will be undertaken by ALGOHIVE on behalf of the Client.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">7. Voting on Behalf of Clients</div>
                  <div className="agreement-text">
                    7.1 ALGOHIVE may vote on behalf of the Client in respect of a ballot conducted by collective investment scheme in so far as the ballot relates to the investments managed by ALGOHIVE on behalf of the Client.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">8. Information to be Disclosed by Product Providers</div>
                  <div className="agreement-text">
                    8.1 The Client confirms that ALGOHIVE shall not be required to provide the Client with any information other than that which a product provider, such as a collective investment scheme or other listed insurance company, is required by law to disclose to the Client.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">9. Prohibition Against Selling or Buying Certain Investments</div>
                  <div className="agreement-text">
                    9.1 ALGOHIVE shall not directly or indirectly:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    9.1.1 Sell any financial products owned by ALGOHIVE to the Client<br /><br />
                    9.1.2 Buy for its own account any investments owned by the Client
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">10. Declaration Regarding Funds & Investments</div>
                  <div className="agreement-text">
                    10.1 The Client warrants, declares and undertakes that all investments entrusted and/or delivered by it, or under its authority, to ALGOHIVE in terms or for the purposes of this Mandate are derived from legitimate sources and do not constitute the "proceeds of unlawful activities" either as defined in the Prevention of Organised Crime Act No. 121 of 1998, as amended, or at all.
                  </div>
                  <div className="agreement-text">
                    10.2 The Client further warrants that, where required, all funds entrusted to ALGOHIVE in terms or for the purpose of this Mandate are duly declared in terms of the Income Tax Act of 1962 and that the Client has obtained all necessary approvals from the South African Reserve Bank for foreign funds, assets or investments owned by the Client.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">11. Reporting</div>
                  <div className="agreement-text">
                    11.1 ALGOHIVE shall furnish the Client with quarterly reports concerning the Client's investments.
                  </div>
                  <div className="agreement-text">
                    11.2 ALGOHIVE may furnish the Client with electronic reports provided that the Client can access the reports.
                  </div>
                  <div className="agreement-text">
                    11.3 The reports shall contain such information as is reasonably necessary to enable the Client to:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    11.3.1 Produce a set of financial statements;<br /><br />
                    11.3.2 Determine the composition of the financial products comprising the investments and any changes therein over the period to which such report relates;<br /><br />
                    11.3.3 Determine the market value of such financial products and any changes therein during the period to which such report relates.
                  </div>
                  <div className="agreement-text">
                    11.4 ALGOHIVE shall, on request in a comprehensible and timely manner, provide to the Client any reasonable information regarding the investments, market practices and the risks inherent in the different markets and products.
                  </div>
                  <div className="agreement-text">
                    11.5 Reports will include details of portfolio holdings, transactions, and where applicable, performance attribution relative to the selected strategist model.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">12. Remuneration</div>
                  <div className="agreement-text">
                    12.1 In consideration for the management by ALGOHIVE of the investments, the Client shall make payment to ALGOHIVE an annual management fee of 1.00% based on the market value of the portfolio of the Client. Such management fee will be calculated on the market value of the portfolio at the end of each month.
                  </div>
                  <div className="agreement-text">
                    12.2 ALGOHIVE may recover the remuneration referred to above at intervals of 1 month from the investment of the Client.
                  </div>
                  <div className="agreement-text">
                    12.3 ALGOHIVE will receive no commission / incentives, fee reductions or rebates from a LISP, collective investment scheme for placing the Client's funds with them.
                  </div>
                  <div className="agreement-text">
                    12.4 In the event of ALGOHIVE being remunerated by the Life Assurance or Investment Companies, this fact will be disclosed to the Client and the parties may elect to negotiate a different fee structure.
                  </div>
                  <div className="agreement-text">
                    12.5 Fees for managing the Client's investments will depend on the type of solution selected:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    <strong>(a) AlgoHive Managed Funds</strong><br />
                    For investments placed into AlgoHive-managed funds or model portfolios (excluding the OpenStrategies platform), the Client shall pay an annual management fee of 0.99% based on the market value of the portfolio. This fee will be calculated monthly in arrears on the closing market value and deducted directly from the investment account.<br /><br />
                    <strong>(b) OpenStrategies Platform</strong><br />
                    For investments executed via the OpenStrategies mirrored strategy platform, no asset-based management fee will be charged. Instead:<br />
                    • 70% of profits realised accrue to the Client<br />
                    • 20–25% of profits are allocated to the selected Strategist<br />
                    • 5–10% of profits are retained by AlgoHive for platform and oversight services<br />
                    These allocations are calculated and settled in accordance with the OpenStrategies participation terms signed by the Client.<br /><br />
                    <strong>(c) Transaction Costs</strong><br />
                    Brokerage and execution fees, including those from Interactive Brokers (IBKR) or any appointed execution broker, are for the Client's account. AlgoHive may earn a margin on these execution costs and pass them through at cost as disclosed by the executing broker.
                  </div>
                  <div className="agreement-text">
                    12.6 Fees and performance allocations will be deducted automatically from the investment account and itemised in periodic statements provided to the Client.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">13. Disputes</div>
                  <div className="agreement-text">
                    13.1 If any dispute or difference arises as to the validity, interpretation, effect or rights and obligations of either party under this Mandate, either party shall have the right to require that such dispute or difference be referred for a decision to arbitration before a single arbitrator.
                  </div>
                  <div className="agreement-text">
                    13.2 The arbitration shall be held in an informal manner in Durban and the identity of the arbitrator shall be mutually agreed upon between the parties within a period of 5 (five) days from the date that the arbitration is called for. The arbitrator shall be an attorney or advocate of 10 (ten) years' standing or more with experience and knowledge of insurance law and with no interest in the proceedings.
                  </div>
                  <div className="agreement-text">
                    13.3 The parties agree to keep the arbitration, its subject matter and evidence heard during the arbitration confidential and not to disclose it to any other person.
                  </div>
                  <div className="agreement-text">
                    13.4 The decision of the arbitrator shall be final and binding upon the parties and not subject to appeal.
                  </div>
                  <div className="agreement-text">
                    13.5 The arbitrator shall include in his award an order as to the costs of the arbitration and who shall bear them.
                  </div>
                  <div className="agreement-text">
                    13.6 The arbitrator shall at his sole discretion decide on the formulation of the dispute for arbitration but shall at all times be guided by the requirements of the Financial Advisory and Intermediary Services Act 2002 and all applicable ancillary legislation.
                  </div>
                  <div className="agreement-text">
                    13.7 The inclusion of this arbitration clause shall not prevent a party from applying to court for urgent relief in the appropriate circumstances.
                  </div>
                  <div className="agreement-text">
                    13.8 The parties agree that all the terms of this Mandate are material.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">14. Termination of Mandate</div>
                  <div className="agreement-text">
                    14.1 ALGOHIVE or the Client shall be entitled to terminate this Mandate by furnishing, the one to the other, not less than sixty (60) calendar days' written notice of such termination.
                  </div>
                  <div className="agreement-text">
                    14.2 ALGOHIVE shall not initiate any market transactions in respect of any investments on behalf of the Client after receipt of notice of termination by the Client of this Mandate unless specifically instructed otherwise by the Client.
                  </div>
                  <div className="agreement-text">
                    14.3 Upon receipt from the Client of any such notice of termination of this Mandate, all outstanding fees owing to ALGOHIVE in terms of or arising from the Mandate shall forthwith thereupon be and become due, owing and payable. In this regard the Client irrevocably authorises and empowers ALGOHIVE to deduct such fees either from the cash standing to the credit of the investment's portfolio or from the sale of any securities or financial instruments forming part of the investments if such cash balance is insufficient to enable payment of such fees to be made.
                  </div>
                  <div className="agreement-text">
                    14.4 Notwithstanding any other provision in this Mandate, ALGOHIVE's appointment shall immediately cease without prejudice to the rights and obligations of ALGOHIVE and the Client if its status as an authorised financial services provider is finally withdrawn in terms of the FAIS Act or any other provision of applicable legislation.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">15. Effective Date</div>
                  <div className="agreement-text">
                    15.1 This Agreement will become of force and effect on last date of signature.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">16. Administrative Arrangements</div>
                  <div className="agreement-text">
                    16.1 The Client shall apply for the investment products and portfolios on the applicable initial investment application forms.
                  </div>
                  <div className="agreement-text">
                    16.2 Any amendment of any provision of this mandate shall be in writing and shall be by means of a supplementary or new agreement between ALGOHIVE and the Client.
                  </div>
                  <div className="agreement-text">
                    16.3 ALGOHIVE may make use of the services of its staff and/or that of another authorised financial services provider to execute certain administrative functions in the course of rendering intermediary services to the Client.
                  </div>
                </div>

                <div className="agreement-section" style={{ borderTop: '2px solid hsl(270 20% 85%)', paddingTop: '16px', marginTop: '16px' }}>
                  <div className="section-title">Schedule – Full Discretion</div>
                  <div className="agreement-text" style={{ fontWeight: 'bold', border: '1px solid hsl(270 20% 80%)', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                    This schedule delegates authority to ALGOHIVE to effect transactions in your name without limitation. If you wish for transactions to be entered into on your behalf to be limited or conditional in any way, this form should not be used. Refer to the limited discretion schedule.
                  </div>
                  <div className="agreement-text">
                    I hereby authorise ALGOHIVE to manage my investments at its sole and full discretion in order to achieve my investment objectives as indicated below. This means that the Mandate is an unlimited Mandate for ALGOHIVE to exercise its full discretion with regards to the process of managing my investments and ALGOHIVE shall not need to obtain further authority or consent from me to effect any transactions in terms of the Mandate to which this is attached. ALGOHIVE may reinvest in terms of this schedule any amounts that have accrued to me in the form of interests, dividends and the proceeds of disposals.
                  </div>
                  <div className="agreement-text">
                    I hereby authorise ALGOHIVE to manage my portfolio in respect of:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    • Local jurisdictions only<br />
                    • Off-shore jurisdictions only<br />
                    • Both local and off-shore jurisdictions
                  </div>
                  <div className="agreement-text">
                    <strong>Investment Objectives:</strong>
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    <strong>Long Term (5 years or longer):</strong> Capital Growth / Income Generation<br />
                    <strong>Medium Term (2 to 5 years):</strong> Capital Growth / Income Generation<br />
                    <strong>Short Term (3 months to 2 years):</strong> Capital Growth / Income Generation
                  </div>
                  <div className="agreement-text">
                    <strong>Risk Preference:</strong> Very Conservative / Conservative / Moderate / Aggressive / Very Aggressive
                  </div>
                </div>

                <div className="agreement-section" style={{ borderTop: '2px solid hsl(270 20% 85%)', paddingTop: '16px', marginTop: '16px' }}>
                  <div className="section-title">Schedule – Limited Discretion</div>
                  <div className="agreement-text" style={{ fontWeight: 'bold', border: '1px solid hsl(270 20% 80%)', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                    This schedule delegates limited authority to ALGOHIVE to effect transactions in your name. If you wish for transactions to be entered into on your behalf, not to be limited or conditional in any way, this form should not be used. Refer to the full discretion schedule.
                  </div>
                  <div className="agreement-text">
                    I hereby restrict ALGOHIVE's discretion in the management on my behalf. ALGOHIVE's right to purchase and sell investments on my behalf may only be exercised by ALGOHIVE:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    • On my instruction and prior consent<br />
                    • On the instruction of my investment advisor, who is a financial services provider licensed in terms of section 8 of the FAIS Act<br />
                    • Upon me receiving advice in respect of such investments from ALGOHIVE, and to which I have consented
                  </div>
                  <div className="agreement-text">
                    I hereby authorise ALGOHIVE to manage my portfolio in respect of:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    • Local jurisdictions only<br />
                    • Off-shore jurisdictions only<br />
                    • Both local and off-shore jurisdictions
                  </div>
                  <div className="agreement-text">
                    Unless instructed otherwise, all cash accruals received in respect of the investments including dividends and interest, shall be:
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    • Reinvested as and when they fall due and shall form part of the investments<br />
                    • Paid out to the client into the indicated bank account
                  </div>
                  <div className="agreement-text">
                    <strong>Investment Objectives:</strong>
                  </div>
                  <div className="agreement-text" style={{ paddingLeft: '16px' }}>
                    <strong>Long Term (5 years or longer):</strong> Capital Growth / Income Generation<br />
                    <strong>Medium Term (2 to 5 years):</strong> Capital Growth / Income Generation<br />
                    <strong>Short Term (3 months to 2 years):</strong> Capital Growth / Income Generation
                  </div>
                  <div className="agreement-text">
                    <strong>Risk Preference:</strong> Very Conservative / Conservative / Moderate / Aggressive / Very Aggressive
                  </div>
                </div>

                <div className="agreement-section" style={{ borderTop: '2px solid hsl(270 20% 85%)', paddingTop: '16px', marginTop: '16px' }}>
                  <div className="section-title">17. General</div>
                  <div className="agreement-text">
                    17.1 This Mandate constitutes the entire agreement between the parties regarding the subject matter hereof and supersedes all prior agreements, representations and negotiations.
                  </div>
                  <div className="agreement-text">
                    17.2 No amendment of any provision of this Mandate shall be binding unless made in writing and signed by both parties.
                  </div>
                  <div className="agreement-text">
                    17.3 The failure by any party to enforce any provision of this Mandate shall not be deemed a waiver of such right.
                  </div>
                  <div className="agreement-text">
                    17.4 This agreement shall be governed by the laws of the Republic of South Africa.
                  </div>
                  <div className="agreement-text">
                    17.5 Both parties accept the jurisdiction of the relevant South African courts.
                  </div>
                  <div className="agreement-text">
                    17.6 The invalidity of any provision of this Mandate shall not affect the validity of the remaining provisions.
                  </div>
                </div>

                <div className="agreement-section" style={{ borderTop: '2px solid hsl(270 20% 85%)', paddingTop: '16px', marginTop: '16px' }}>
                  <div className="section-title">Annexure A – Banking Details</div>
                  <div className="agreement-text">
                    <strong>Account Holder:</strong> ALGOHIVE (PTY) LTD<br />
                    <strong>Bank:</strong> TBA<br />
                    <strong>Type of Account:</strong> Business Current Account<br />
                    <strong>Account Number:</strong> 000 000 000<br />
                    <strong>Branch Opened:</strong> TBA<br />
                    <strong>Branch Code:</strong> 000000
                  </div>
                </div>
              </div>

              <div className="checkbox-container animate-fade-in delay-3" style={{ display: 'block' }}>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={agreedMandate}
                    onChange={(event) => setAgreedMandate(event.target.checked)}
                  />
                  <span className="checkbox-label">
                    I have read and agree to the Discretionary FSP Mandate and authorise ALGOHIVE to manage my investments as described
                  </span>
                </label>
              </div>

              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className={`continue-button agreement-continue ${agreedMandate ? "enabled" : ""}`}
                  disabled={!agreedMandate}
                  onClick={() => goToStep(4)}
                >
                  Continue to Risk Disclosure
                </button>
              </div>

              <div className="text-center mt-6 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  Step 2 of 5
                </p>
              </div>
            </div>
          ) : step === 4 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <ShieldIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Risk Disclosure
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  Please review the investment risk disclosure
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
              </div>

              <div className="agreement-card animate-fade-in delay-2">
                <div className="agreement-title">Investment Risk Disclosure</div>

                <div className="agreement-section">
                  <div className="section-title">1. Investment Risk Warning</div>
                  <div className="agreement-text">
                    Investing in financial instruments involves risk, including the possible loss of some or all of your principal investment. Past performance is not indicative of future results. The value of investments and the income derived from them may go down as well as up.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">2. Market Volatility</div>
                  <div className="agreement-text">
                    Financial markets can be volatile and unpredictable. Prices of securities, including those listed on the JSE, can fluctuate significantly due to various factors including economic conditions, political events, company performance, and market sentiment.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">3. No Guaranteed Returns</div>
                  <div className="agreement-text">
                    MINT does not guarantee any returns on investments. All investment decisions are made at your own risk. You should only invest money that you can afford to lose without affecting your standard of living.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">4. Regulatory Compliance</div>
                  <div className="agreement-text">
                    MINT operates in compliance with South African financial regulations. We are committed to transparency and providing you with the information needed to make informed investment decisions. However, we do not provide personalised financial advice.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">5. Diversification Notice</div>
                  <div className="agreement-text">
                    Concentrating investments in a single security, sector, or asset class increases risk. We encourage you to diversify your portfolio and seek independent financial advice if needed.
                  </div>
                </div>
              </div>

              <div className="checkbox-container animate-fade-in delay-3" style={{ display: 'block' }}>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={agreedRiskDisclosure}
                    onChange={(event) => setAgreedRiskDisclosure(event.target.checked)}
                  />
                  <span className="checkbox-label">
                    I acknowledge that I have read and understand the investment risk disclosure
                  </span>
                </label>
              </div>

              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className={`continue-button agreement-continue ${agreedRiskDisclosure ? "enabled" : ""}`}
                  disabled={!agreedRiskDisclosure}
                  onClick={() => goToStep(5)}
                >
                  Continue to Source of Funds
                </button>
              </div>

              <div className="text-center mt-6 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  Step 3 of 5
                </p>
              </div>
            </div>
          ) : step === 5 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <WalletIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Source of Funds
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  Declare the origin of your investment funds
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step"></div>
              </div>

              <div className="space-y-5">
                <div className="animate-fade-in delay-2">
                  <label htmlFor="source-of-funds">Primary Source of Funds</label>
                  <div className="custom-select" ref={sofDropdownRef}>
                    <div
                      className={`glass-field select-trigger ${
                        sofDropdownOpen ? "active" : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSofDropdownOpen((prev) => !prev)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSofDropdownOpen((prev) => !prev);
                        }
                      }}
                    >
                      <div
                        className="selected-value"
                        data-placeholder="Select source of funds"
                      >
                        {sourceOfFunds ? selectedSofOption?.label : ""}
                      </div>
                    </div>
                    <div className={`custom-dropdown ${sofDropdownOpen ? "active" : ""}`}>
                      {sourceOfFundsOptions.map((option) => (
                        <div
                          key={option.value || "placeholder"}
                          className={`custom-option ${
                            sourceOfFunds === option.value ? "selected" : ""
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSofSelect(option.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleSofSelect(option.value);
                            }
                          }}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      id="source-of-funds"
                      name="source-of-funds"
                      value={sourceOfFunds}
                    />
                  </div>
                </div>

                <div
                  className={`conditional-section hide-when-dropdown-open ${
                    sourceOfFunds === "other" ? "active" : ""
                  }`}
                >
                  <label htmlFor="source-of-funds-other">Please describe your source of funds</label>
                  <div className="glass-field">
                    <input
                      type="text"
                      id="source-of-funds-other"
                      placeholder="Describe your source of funds"
                      value={sourceOfFundsOther}
                      onChange={(event) => setSourceOfFundsOther(event.target.value)}
                    />
                  </div>
                </div>

                <div className="animate-fade-in delay-3 hide-when-dropdown-open">
                  <label htmlFor="expected-monthly-investment">Expected Monthly Investment Amount</label>
                  <div className="glass-field">
                    <select
                      id="expected-monthly-investment"
                      value={expectedMonthlyInvestment}
                      onChange={(event) => setExpectedMonthlyInvestment(event.target.value)}
                    >
                      {monthlyInvestmentOptions.map((option) => (
                        <option key={option.value || "placeholder"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="animate-fade-in delay-3 hide-when-dropdown-open" style={{ display: 'block' }}>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={agreedSourceOfFunds}
                      onChange={(event) => setAgreedSourceOfFunds(event.target.checked)}
                    />
                    <span className="checkbox-label">
                      I declare that the funds I will use for investing are from legitimate sources and I am the beneficial owner of these funds
                    </span>
                  </label>
                </div>

                <div className="text-center mt-8 animate-fade-in delay-4 hide-when-dropdown-open">
                  <button
                    type="button"
                    className={`continue-button agreement-continue ${sofReady ? "enabled" : ""}`}
                    disabled={!sofReady}
                    onClick={() => goToStep(6)}
                  >
                    Continue to Agreements
                  </button>
                </div>

                <div className="text-center mt-6 animate-fade-in delay-4 hide-when-dropdown-open">
                  <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                    Step 4 of 5
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <FileContractIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Contract Agreement
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  Please review and accept our <span className="mint-brand">MINT</span> terms and conditions
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
              </div>

              <div className="agreement-card animate-fade-in delay-2">
                <div className="agreement-title">Terms and Conditions</div>

                <div className="agreement-section">
                  <div className="section-title">1. Introduction</div>
                  <div className="agreement-text">
                    Welcome to MINT. By accessing or using our services, you agree to be bound by these Terms and Conditions. Please read them carefully before proceeding. These terms govern your use of our platform and all related services.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">2. User Account</div>
                  <div className="agreement-text">
                    You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, current, and complete information during the registration process and keep your information updated.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">3. Privacy and Data Protection</div>
                  <div className="agreement-text">
                    We collect, process, and store your personal data in accordance with our Privacy Policy. By using our services, you consent to such processing and warrant that all data provided by you is accurate. We implement industry-standard security measures to protect your information.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">4. Use of Services</div>
                  <div className="agreement-text">
                    You agree to use our services only for lawful purposes and in accordance with these Terms. You must not use our services in any way that could damage, disable, or impair our platform, or interfere with any other party's use of our services.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">5. Intellectual Property</div>
                  <div className="agreement-text">
                    All content, features, and functionality of our services, including but not limited to text, graphics, logos, and software, are the exclusive property of MINT and are protected by international copyright, trademark, and other intellectual property laws.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">6. Limitation of Liability</div>
                  <div className="agreement-text">
                    MINT shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use our services. Our total liability shall not exceed the amount paid by you, if any, for accessing our services.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">7. Modifications</div>
                  <div className="agreement-text">
                    We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through our platform. Your continued use of our services after such modifications constitutes acceptance of the updated Terms.
                  </div>
                </div>
              </div>

              <div className="checkbox-container animate-fade-in delay-3">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(event) => setAgreedTerms(event.target.checked)}
                  />
                  <span className="checkbox-label">
                    I have read and agree to the Terms and Conditions
                  </span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={agreedPrivacy}
                    onChange={(event) => setAgreedPrivacy(event.target.checked)}
                  />
                  <span className="checkbox-label">
                    I consent to the Privacy Policy and data processing
                  </span>
                </label>
              </div>

              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className={`continue-button agreement-continue ${agreementReady ? "enabled" : ""}`}
                  disabled={!agreementReady}
                  onClick={handleFinalComplete}
                >
                  Accept and Continue
                </button>
              </div>

              <div className="text-center mt-6 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  Step 5 of 5 - Final step to complete your onboarding
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingProcessPage;
