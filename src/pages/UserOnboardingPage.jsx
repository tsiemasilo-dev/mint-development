import React, { useEffect, useRef, useState } from "react";
import ExperianVerification from "../components/ExperianVerification";
import MandateViewer from "../components/MandateViewer";
import AccountAgreementStep from "../components/AccountAgreementStep";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";
import { markOnboardingComplete } from "../lib/useOnboardingStatus";
import AddressAutocomplete from "../components/AddressAutocomplete";
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

const BankIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6M4.5 9.75v10.5h15V9.75" />
  </svg>
);

const CheckCircleIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const southAfricanBanks = [
  { value: "", label: "Select your bank", logo: null, branchCode: "" },
  { value: "absa", label: "Absa Bank", logo: "https://logo.clearbit.com/absa.co.za", branchCode: "632005" },
  { value: "access_bank", label: "Access Bank", logo: "https://logo.clearbit.com/accessbank.co.za", branchCode: "410506" },
  { value: "african_bank", label: "African Bank", logo: "https://logo.clearbit.com/africanbank.co.za", branchCode: "430000" },
  { value: "zero", label: "Bank Zero", logo: "https://logo.clearbit.com/bankzero.co.za", branchCode: "888000" },
  { value: "bidvest_bank", label: "Bidvest Bank", logo: "https://logo.clearbit.com/bidvestbank.co.za", branchCode: "462005" },
  { value: "capitec", label: "Capitec Bank", logo: "https://logo.clearbit.com/capitecbank.co.za", branchCode: "470010" },
  { value: "capitec_business", label: "Capitec Business Bank", logo: "https://logo.clearbit.com/capitecbank.co.za", branchCode: "450105" },
  { value: "discovery_bank", label: "Discovery Bank", logo: "https://logo.clearbit.com/discovery.co.za", branchCode: "679000" },
  { value: "fnb", label: "First National Bank (FNB)", logo: "https://logo.clearbit.com/fnb.co.za", branchCode: "250655" },
  { value: "investec", label: "Investec", logo: "https://logo.clearbit.com/investec.com", branchCode: "580105" },
  { value: "nedbank", label: "Nedbank", logo: "https://logo.clearbit.com/nedbank.co.za", branchCode: "198765" },
  { value: "old_mutual", label: "Old Mutual", logo: "https://logo.clearbit.com/oldmutual.co.za", branchCode: "462005" },
  { value: "sasfin", label: "Sasfin Bank", logo: "https://logo.clearbit.com/sasfin.com", branchCode: "683000" },
  { value: "standard_bank", label: "Standard Bank", logo: "https://logo.clearbit.com/standardbank.co.za", branchCode: "051001" },
  { value: "tyme_bank", label: "TymeBank", logo: "https://logo.clearbit.com/tymebank.co.za", branchCode: "678910" },
  { value: "ubank", label: "UBank", logo: "https://logo.clearbit.com/ubank.co.za", branchCode: "431010" },
  { value: "other", label: "Other", logo: null, branchCode: "" },
];

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

const accountTypeOptions = [
  { value: "savings", label: "Savings" },
  { value: "cheque", label: "Cheque / Current" },
  { value: "business", label: "Business" },
  { value: "transmission", label: "Transmission" },
  { value: "other", label: "Other" },
];

const OnboardingProcessPage = ({ onBack, onComplete, editMandate = false }) => {
  const { profile, loading: profileLoading } = useProfile();
  const [step, setStep] = useState(editMandate ? 5 : 0);
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
  const [agreedAll, setAgreedAll] = useState(false);
  const [sec1Open, setSec1Open] = useState(false);
  const [sec2Open, setSec2Open] = useState(false);
  const [sec3Open, setSec3Open] = useState(false);
  const [signingStarted, setSigningStarted] = useState(false);
  const [existingOnboardingId, setExistingOnboardingId] = useState(null);

  const [agreedMandate, setAgreedMandate] = useState(false);
  const [mandateValid, setMandateValid] = useState(false);
  const mandateDataRef = useRef(null);
  const [mandateRequestTab, setMandateRequestTab] = useState(null);
  const [sourceOfFunds, setSourceOfFunds] = useState("");
  const [sourceOfFundsOther, setSourceOfFundsOther] = useState("");
  const [expectedMonthlyInvestment, setExpectedMonthlyInvestment] = useState("");
  const [agreedSourceOfFunds, setAgreedSourceOfFunds] = useState(false);
  const [sofDropdownOpen, setSofDropdownOpen] = useState(false);
  const [accountTypeDropdownOpen, setAccountTypeDropdownOpen] = useState(false);
  const [monthlyInvestmentDropdownOpen, setMonthlyInvestmentDropdownOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountType, setBankAccountType] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankBranchCode, setBankBranchCode] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [identityCheckLoading, setIdentityCheckLoading] = useState(false);
  const [identityCheckError, setIdentityCheckError] = useState("");
  const [applicantId, setApplicantId] = useState(null);
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef(null);
  const [kycAlreadyVerified, setKycAlreadyVerified] = useState(false);
  const [kycVerificationDone, setKycVerificationDone] = useState(false);
  const [identityCheckConfirmed, setIdentityCheckConfirmed] = useState(false);
  const [bankDone, setBankDone] = useState(false);
  const [bankLetterDone, setBankLetterDone] = useState(false);
  const [bankLetterRejected, setBankLetterRejected] = useState(false);
  const [bankLetterRejectReason, setBankLetterRejectReason] = useState("");
  const [bankLetterUploading, setBankLetterUploading] = useState(false);
  const [mandateDone, setMandateDone] = useState(false);
  const [riskDone, setRiskDone] = useState(false);
  const [sofDone, setSofDone] = useState(false);
  const [taxDone, setTaxDone] = useState(false);
  const [taxNumber, setTaxNumber] = useState("");
  const [address, setAddress] = useState("");
  const [addressDone, setAddressDone] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  // Structured manual-fallback address (only used when no bureau address is on
  // record). Captured as separate fields so the format — and the postal code —
  // are guaranteed, then combined into "Province, City, Street, 0000".
  const [addrProvince, setAddrProvince] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  // Proof-of-address document (e.g. bank statement) — required on the manual fallback.
  const [poaUrl, setPoaUrl] = useState("");
  const [poaFileName, setPoaFileName] = useState("");
  const [poaUploading, setPoaUploading] = useState(false);
  const [poaError, setPoaError] = useState("");
  // Experian KYC V2 address lookup (bureau addresses for the dropdown on step 3)
  const [experianAddresses, setExperianAddresses] = useState(null); // null = not fetched, [] = none found
  const [experianAddrLoading, setExperianAddrLoading] = useState(false);
  const [experianPhones, setExperianPhones] = useState([]); // bureau contact numbers (for multi-number dropdown)
  const [selectedPhone, setSelectedPhone] = useState("");
  const [bureauPostalCode, setBureauPostalCode] = useState(""); // postal code from the chosen/known bureau address
  const experianAddrFetchedRef = useRef(false);
  const [termsDone, setTermsDone] = useState(false);
  const [agreementSignedDone, setAgreementSignedDone] = useState(false);
  const [authStatus, setAuthStatus] = useState({
    isChecked: false,
    isAuthenticated: false,
    displayName: "",
  });
  const dropdownRef = useRef(null);
  const sofDropdownRef = useRef(null);
  const accountTypeDropdownRef = useRef(null);
  const monthlyInvestmentDropdownRef = useRef(null);

  const selectedOption = employmentOptions.find(
    (option) => option.value === employmentStatus
  );

  const selectedSofOption = sourceOfFundsOptions.find(
    (option) => option.value === sourceOfFunds
  );

  const selectedBankOption = southAfricanBanks.find(
    (option) => option.value === bankName
  );

  const handleBankSelect = (value) => {
    setBankName(value);
    setBankDropdownOpen(false);
    const selected = southAfricanBanks.find((b) => b.value === value);
    if (selected?.branchCode) {
      setBankBranchCode(selected.branchCode);
    } else {
      setBankBranchCode("");
    }
  };

  const bankDetailsReady = bankName && bankAccountName.trim() && bankAccountType && bankAccountNumber && bankBranchCode;

  const goToStep = (nextStep) => {
    setIsFading(true);
    window.setTimeout(() => {
      setStep(nextStep);
      setIsFading(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 260);
  };

  const ensureOnboardingRecord = async () => {
    if (existingOnboardingId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/onboarding/save-employment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employment_status: "not_provided", annual_income_currency: "ZAR" }),
      });
      const result = await res.json();
      if (result.success && result.onboarding_id) {
        setExistingOnboardingId(result.onboarding_id);
      }
    } catch (err) {
      console.error("[Onboarding] Failed to ensure onboarding record:", err);
    }
  };

  const saveProgressFlag = async (flagKey, extraFields) => {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      const id = existingOnboardingId || null;
      const query = supabase.from("user_onboarding").select("sumsub_raw");
      const { data: record } = id
        ? await query.eq("id", id).eq("user_id", userId).maybeSingle()
        : await query.eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      let raw = {};
      try { raw = typeof record?.sumsub_raw === "string" ? JSON.parse(record.sumsub_raw) : (record?.sumsub_raw || {}); } catch { }
      raw[flagKey] = true;
      if (extraFields) Object.assign(raw, extraFields);
      const updateQuery = supabase.from("user_onboarding").update({ sumsub_raw: raw });
      const { error } = id
        ? await updateQuery.eq("id", id).eq("user_id", userId)
        : await updateQuery.eq("user_id", userId);
      if (error) console.error("[Onboarding] saveProgressFlag failed for", flagKey, error.message);
    } catch (err) {
      console.error("[Onboarding] saveProgressFlag error for", flagKey, err?.message);
    }
  };

  // Upload the manual-fallback proof-of-address document (bank statement / utility
  // bill). Stored in the existing "documents" bucket under a per-user prefix; the
  // public URL is kept in component state and persisted with the address below.
  const handlePoaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPoaError("");
    if (file.size > 10 * 1024 * 1024) { setPoaError("File too large — max 10MB."); return; }
    const okType = /pdf$/i.test(file.type) || /^image\//i.test(file.type) || /\.(pdf|png|jpe?g|webp|heic)$/i.test(file.name);
    if (!okType) { setPoaError("Please upload a PDF or image (bank statement / utility bill)."); return; }
    setPoaUploading(true);
    try {
      if (!supabase) throw new Error("Storage not available");
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("You need to be signed in.");
      const safeName = file.name.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
      const path = `proof-of-address/${userId}/${Date.now()}-${safeName || "proof-of-address"}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
      setPoaUrl(pub?.publicUrl || path);
      setPoaFileName(file.name);
    } catch (err) {
      console.error("[Onboarding] POA upload failed:", err);
      setPoaError(err?.message || "Upload failed. Please try again.");
    } finally {
      setPoaUploading(false);
    }
  };

  const getNextIncompleteStep = (afterStep, justCompletedStep) => {
    const identityCheckDone = identityCheckConfirmed || kycAlreadyVerified;
    const financialDetailsDone = taxDone && bankDone && bankLetterDone && sofDone;
    const finalAgreementsDone = riskDone && termsDone && agreementSignedDone;
    const steps = [
      { step: 1, done: identityCheckDone && kycVerificationDone },
      { step: 3, done: addressDone },
      { step: 4, done: financialDetailsDone },
      { step: 5, done: mandateDone },
      { step: 6, done: finalAgreementsDone },
      { step: 7, done: finalAgreementsDone },
    ];
    for (const s of steps) {
      if (s.step > afterStep && !s.done && s.step !== justCompletedStep) return s.step;
    }
    return 7;
  };

  const handleContinue = async () => {
    if (step === 0) {
      goToStep(getNextIncompleteStep(0));
    }
  };

  const handleIdentityCheckContinue = async () => {
    setIdentityCheckError("");

    const cleanIdNumber = identityNumber.replace(/\D/g, "");
    if (!/^\d{13}$/.test(cleanIdNumber)) {
      setIdentityCheckError("Please enter a valid 13-digit ID number.");
      return;
    }

    if (!supabase) {
      setIdentityCheckError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setIdentityCheckLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setIdentityCheckError("You must be signed in to continue.");
        return;
      }

      const res = await fetch("/api/onboarding/check-id-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id_number: cleanIdNumber }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to verify ID number.");
      }

      if (result.exists) {
        setIdentityCheckError("An account with this ID number already exists.");
        return;
      }

      await ensureOnboardingRecord();

      if (result.applicantId) {
        setApplicantId(result.applicantId);
      }

      // Save the ID number and applicant ID to the onboarding record we just ensured exists
      await saveProgressFlag("identity_details_saved", {
        identity_details: { identity_number: cleanIdNumber, applicantId: result.applicantId, savedAt: new Date().toISOString() },
      });

      setIdentityCheckConfirmed(true);
    } catch (err) {
      setIdentityCheckError(err?.message || "Failed to verify ID number.");
    } finally {
      setIdentityCheckLoading(false);
    }
  };

  const getPrevIncompleteStep = (beforeStep) => {
    const identityCheckDone = identityCheckConfirmed || kycAlreadyVerified;
    const financialDetailsDone = taxDone && bankDone && bankLetterDone && sofDone;
    const finalAgreementsDone = riskDone && termsDone && agreementSignedDone;
    const steps = [
      { step: 6, done: finalAgreementsDone },
      { step: 5, done: mandateDone },
      { step: 4, done: financialDetailsDone },
      { step: 3, done: addressDone },
      { step: 1, done: identityCheckDone && kycVerificationDone },
    ];
    for (const s of steps) {
      if (s.step < beforeStep && !s.done) return s.step;
    }
    return 0;
  };

  const handleBack = () => {
    if (step >= 1) {
      goToStep(getPrevIncompleteStep(step));
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
      goToStep(getNextIncompleteStep(3, 3));
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
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target)) {
        setBankDropdownOpen(false);
      }
      if (accountTypeDropdownRef.current && !accountTypeDropdownRef.current.contains(event.target)) {
        setAccountTypeDropdownOpen(false);
      }
      if (monthlyInvestmentDropdownRef.current && !monthlyInvestmentDropdownRef.current.contains(event.target)) {
        setMonthlyInvestmentDropdownOpen(false);
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
        const userId = session?.user?.id;
        if (!token || !userId) return;

        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.success && result.onboarding_id) {
          setExistingOnboardingId(result.onboarding_id);
        }

        const onboardingId = result.success && result.onboarding_id ? result.onboarding_id : null;
        const recordQuery = supabase
          .from("user_onboarding")
          .select("bank_name, bank_account_number, bank_branch_code, sumsub_raw, kyc_status")
          .eq("user_id", userId);
        const { data: record } = onboardingId
          ? await recordQuery.eq("id", onboardingId).maybeSingle()
          : await recordQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();

        if (record) {
          if (record.bank_name && record.bank_account_number && record.bank_branch_code) {
            setBankDone(true);
            setBankName(record.bank_name);
            setBankAccountNumber(record.bank_account_number);
            setBankBranchCode(record.bank_branch_code);
          }
          let raw = {};
          try { raw = typeof record.sumsub_raw === "string" ? JSON.parse(record.sumsub_raw) : (record.sumsub_raw || {}); } catch { }

          // Populate field values from stored data
          if (raw.bank_details?.bank_account_name) setBankAccountName(raw.bank_details.bank_account_name);
          if (raw.identity_details?.identity_number) setIdentityNumber(raw.identity_details.identity_number);
          if (raw.bank_details?.bank_account_type) setBankAccountType(raw.bank_details.bank_account_type);
          if (raw.tax_details?.tax_number) setTaxNumber(raw.tax_details.tax_number);
          if (raw.address_details?.address || record.address) setAddress(raw.address_details?.address || record.address);
          // Rehydrate structured manual-fallback fields + proof of address so a
          // returning user with partial progress doesn't lose what they entered.
          if (raw.address_details?.manual_entry) {
            const ad = raw.address_details;
            if (ad.province) setAddrProvince(ad.province);
            if (ad.city) setAddrCity(ad.city);
            if (ad.street) setAddrStreet(ad.street);
            if (ad.postal_code) setAddrPostal(ad.postal_code);
            if (ad.proof_of_address_url) setPoaUrl(ad.proof_of_address_url);
            if (ad.proof_of_address_name) setPoaFileName(ad.proof_of_address_name);
          }
          if (raw.source_of_funds_details) {
            const { source_of_funds, source_of_funds_other, expected_monthly_investment } = raw.source_of_funds_details;
            if (source_of_funds) setSourceOfFunds(source_of_funds);
            if (source_of_funds_other) setSourceOfFundsOther(source_of_funds_other);
            if (expected_monthly_investment) setExpectedMonthlyInvestment(expected_monthly_investment);
          }

          // If the user has fully completed onboarding, mark all steps done
          const fullyComplete =
            record.kyc_status === "onboarding_complete" ||
            (!!raw?.signed_at) ||
            (!!raw?.account_agreement_signed);

          if (fullyComplete) {
            setTaxDone(true);
            setBankDone(true);
            setBankLetterDone(true);
            setSofDone(true);
            // Respect explicit admin reset: address_saved === false overrides fullyComplete
            if (raw?.address_saved !== false) setAddressDone(true);
            setMandateDone(true);
            setRiskDone(true);
            setTermsDone(true);
            setAgreementSignedDone(true);
          } else {
            // For in-progress users, check each flag individually
            if (raw.identity_details_saved === true || raw.identity_details?.identity_number) setIdentityCheckConfirmed(true);
            if (raw.tax_details?.tax_number || raw.tax_details_saved === true) setTaxDone(true);
            if (raw.address_details?.address || record.address || raw.address_saved === true) setAddressDone(true);
            if (raw.mandate_data?.agreedMandate === true || raw.mandate_accepted === true) setMandateDone(true);
            if (raw.risk_disclosure_accepted === true) setRiskDone(true);
            if (raw.source_of_funds_accepted === true) setSofDone(true);
            if (raw.bank_details_saved === true) setBankDone(true);
            if (raw.bank_letter_uploaded === true) setBankLetterDone(true);
            if (raw.address_saved === true) setAddressDone(true);
            if (raw.terms_accepted === true) setTermsDone(true);
            if (raw.account_agreement_signed === true || raw.signed_at) setAgreementSignedDone(true);
          }
        }
      } catch (err) {
        // ignore; user can still proceed normally
      }
    };

    loadExistingOnboarding();
  }, []);

  useEffect(() => {
    if (!profileLoading && profile && !bankAccountName) {
      const nameFromProfile = [profile.first_name || profile.firstName, profile.last_name || profile.lastName]
        .filter(Boolean).join(" ");
      if (nameFromProfile) {
        setBankAccountName(nameFromProfile);
      }
    }
  }, [profile, profileLoading, bankAccountName]);

  useEffect(() => {
    if (step !== 1) {
      setShowProceed(false);
    }
    if (step !== 7) {
      setAgreedAll(false);
    }
  }, [step]);

  useEffect(() => {
    const checkKycStatus = async () => {
      try {
      const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;
        const res = await fetch("/api/experian/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (data.success && data.status === "verified") {
          setKycAlreadyVerified(true);
          setKycVerificationDone(true);

          if (step === 1) {
            setShowProceed(true);

            try {
              const { data: packData } = await supabase
                .from("user_onboarding_pack_details")
                .select("pack_details")
                .eq("user_id", userId)
                .maybeSingle();

              if (packData?.pack_details) {
                const packDetail = packData.pack_details;
                const idDocs = Array.isArray(packDetail?.info?.idDocs) ? packDetail.info.idDocs : [];
                const idDoc = idDocs.find(d => d.number && (d.idDocType === "ID_CARD" || d.idDocType === "PASSPORT" || d.idDocType === "DRIVERS"));

                if (idDoc?.number) {
                  setIdentityNumber(idDoc.number);
                }
              }

              setTimeout(() => {
                goToStep(getNextIncompleteStep(2));
              }, 500);
            } catch (e) {
              console.error("Failed to extract ID from sumsub:", e);
              setTimeout(() => {
                goToStep(getNextIncompleteStep(2));
              }, 500);
            }
          }
        }
      } catch {
      }
    };
    checkKycStatus();
  }, [step]);

  // On the address step, fetch the user's bureau addresses from Experian KYC V2
  // once, so they can pick from a dropdown instead of typing it. Falls back to
  // manual entry if none are returned. Fetched once (it's a billable lookup).
  useEffect(() => {
    if (step !== 3 || experianAddrFetchedRef.current) return;
    experianAddrFetchedRef.current = true;
    (async () => {
      try {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        setExperianAddrLoading(true);
        console.log("[Onboarding] Fetching Experian bureau addresses…");
        const res = await fetch("/api/experian/kyc-addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = data?.success && Array.isArray(data.addresses) ? data.addresses : [];
        console.log(
          `[Onboarding] Experian address lookup → HTTP ${res.status}, ${list.length} address(es)` +
            (data?.note ? `, note: "${data.note}"` : "") +
            (data?.personFound != null ? `, personFound: ${data.personFound}` : ""),
          data
        );
        if (list.length === 0) {
          console.log("[Onboarding] No bureau addresses → showing manual entry fallback.");
        }
        setExperianAddresses(list);

        // Default the postal code to the first bureau address that has one.
        const firstPostal = list.find((a) => a.postalCode)?.postalCode;
        if (firstPostal) {
          setBureauPostalCode(firstPostal);
          console.log("[Onboarding] Bureau postal code:", firstPostal);
        }

        // Bureau contact numbers. One number → save it silently (if the profile
        // has none). Multiple → expose them so the user can pick in a dropdown.
        const rawPhones = Array.isArray(data?.contact?.phones) ? data.contact.phones.filter((p) => p?.value) : [];
        const uniqPhones = [...new Map(rawPhones.map((p) => [p.value, p])).values()];
        setExperianPhones(uniqPhones);
        console.log(`[Onboarding] Experian contact → ${uniqPhones.length} number(s)`);
        if (uniqPhones.length === 1) {
          const cell = uniqPhones[0].value;
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: prow } = await supabase.from("profiles").select("phone_number").eq("id", user.id).maybeSingle();
              if (!prow?.phone_number?.trim()) {
                await supabase.from("profiles").update({ phone_number: cell }).eq("id", user.id);
                setSelectedPhone(cell);
                window.dispatchEvent(new Event("profile-updated"));
                console.log("[Onboarding] Saved bureau cell number to profile:", cell);
              }
            }
          } catch (e) {
            console.warn("[Onboarding] Could not save bureau contact number:", e);
          }
        }
      } catch (err) {
        console.warn("[Onboarding] Experian address lookup failed:", err);
        setExperianAddresses([]);
      } finally {
        setExperianAddrLoading(false);
      }
    })();
  }, [step]);

  const showEmployedSection =
    employmentStatus === "employed" ||
    employmentStatus === "self-employed" ||
    employmentStatus === "contractor";

  const showStudentSection = employmentStatus === "student";
  const agreementReady = agreedAll;
  const sofReady =
    sourceOfFunds &&
    (sourceOfFunds !== "other" || sourceOfFundsOther.trim().length > 0) &&
    expectedMonthlyInvestment &&
    agreedSourceOfFunds;

  // ── Progressive auto-save: bank details ──────────────────────────────────
  // Saves as soon as all 5 bank fields are filled — no need to hit Continue.
  useEffect(() => {
    if (!bankDetailsReady) return;
    const timer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          await supabase.from("user_onboarding").update({
            bank_name: bankName || null,
            bank_account_number: bankAccountNumber || null,
            bank_branch_code: bankBranchCode || null,
          }).eq("user_id", userId);
        }
      } catch {}
      await saveProgressFlag("bank_details_saved", {
        bank_details: {
          bank_name: bankName || null,
          bank_account_name: bankAccountName || null,
          bank_account_type: bankAccountType || null,
          bank_account_number: bankAccountNumber || null,
          bank_branch_code: bankBranchCode || null,
          savedAt: new Date().toISOString(),
        },
      });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankName, bankAccountName, bankAccountType, bankAccountNumber, bankBranchCode]);

  // ── Progressive auto-save: tax number ────────────────────────────────────
  useEffect(() => {
    if (!taxNumber || taxNumber.length < 6) return;
    const timer = setTimeout(async () => {
      await saveProgressFlag("tax_details_saved", {
        tax_details: { tax_number: taxNumber, savedAt: new Date().toISOString() },
      });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxNumber]);

  // ── Progressive auto-save: source of funds ───────────────────────────────
  useEffect(() => {
    if (!sofReady) return;
    const timer = setTimeout(async () => {
      await saveProgressFlag("source_of_funds_accepted", {
        source_of_funds_details: {
          source_of_funds: sourceOfFunds,
          source_of_funds_other: sourceOfFunds === "other" ? sourceOfFundsOther : null,
          expected_monthly_investment: expectedMonthlyInvestment,
        },
      });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sofReady, sourceOfFunds, sourceOfFundsOther, expectedMonthlyInvestment]);

  const handleFinalComplete = async (signingResults = {}) => {
    if (!supabase) {
      if (onComplete) onComplete();
      return;
    }

    let completionSuccess = false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        if (mandateDataRef.current) {
          const savePayload = { ...mandateDataRef.current };
          try {
            const mandateRes = await fetch("/api/onboarding/save-mandate", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ mandate_data: savePayload, existing_onboarding_id: existingOnboardingId || null }),
            });
            const mandateResult = await mandateRes.json();
            if (mandateResult.onboarding_id) setExistingOnboardingId(mandateResult.onboarding_id);
          } catch (e) {
            console.error("Mandate save error during completion:", e);
          }
        }

        const completePayload = {
          existing_onboarding_id: existingOnboardingId || null,
          risk_disclosure_agreed: agreedAll || false,
          source_of_funds: sourceOfFunds || null,
          source_of_funds_other: sourceOfFunds === "other" ? (sourceOfFundsOther || null) : null,
          expected_monthly_investment: expectedMonthlyInvestment || null,
          agreed_terms: agreedAll || false,
          agreed_privacy: agreedAll || false,
          tax_number: taxNumber || null,
          bank_name: bankName || null,
          bank_account_name: bankAccountName || null,
          bank_account_type: bankAccountType || null,
          bank_account_number: bankAccountNumber || null,
          bank_branch_code: bankBranchCode || null,
          // Pass signing results if available
          signed_agreement_url: signingResults.signed_agreement_url || null,
          signed_at: signingResults.signed_at || null,
          downloaded_at: signingResults.downloaded_at || null,
        };

        console.log("[Onboarding] Completing with payload:", completePayload);

        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(completePayload),
        });
        const result = await res.json();
        if (result.success) {
          completionSuccess = true;
          markOnboardingComplete();
        } else {
          console.error("Failed to complete onboarding via API:", result.error);
          throw new Error(result.error?.message || "Failed to save completion status. Please try again.");
        }

        if (!completionSuccess) {
          console.warn("[Onboarding] Completion API failed. Skipping risky Supabase fallback.");
        }
      }
    } catch (err) {
      console.error("Failed to update KYC status:", err);
    }

    setAgreementSignedDone(true);
    if (onComplete) onComplete();
  };

  return (
    <div
      className={`onboarding-process ${isFading ? "fade-out" : "fade-in"} ${isDropdownOpen || bankDropdownOpen ? "dropdown-open" : ""
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

              {(() => {
                const tick = (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                );
                const tickSm = (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                );
                const identityCheckDone = identityCheckConfirmed || kycAlreadyVerified;
                const financialDetailsDone = taxDone && bankDone && bankLetterDone && sofDone;
                const steps = [
                  { done: identityCheckDone && kycVerificationDone, title: "Identity & Verification", doneDesc: "Identity verified", pendingDesc: "Confirm your ID and complete identity verification", badge: "Verified" },
                  { done: addressDone, title: "Residential Address", doneDesc: "Address captured", pendingDesc: "Provide your current residential address", badge: "Captured" },
                  { done: financialDetailsDone, title: "Financial Details", doneDesc: "Financial details saved", pendingDesc: "Bank, tax, source of funds & more", badge: "Saved" },
                  { done: mandateDone, title: "Discretionary Mandate", doneDesc: "Mandate accepted", pendingDesc: "Review and accept the FSP investment mandate", badge: "Accepted" },
                  { done: riskDone && termsDone && agreementSignedDone, title: "Final Agreements", doneDesc: "Agreements signed", pendingDesc: "Risk disclosure, terms & account agreement", badge: "Signed" },
                ];
                return (
                  <>
                    <div className="steps-container animate-fade-in delay-2">
                      {steps.map((s, i) => (
                        <React.Fragment key={i}>
                          <div className={`step-circle ${s.done ? 'step-circle-complete' : ''}`}>
                            {s.done ? tick : i + 1}
                          </div>
                          {i < steps.length - 1 && <div className={`step-line ${s.done ? 'step-line-complete' : ''}`}></div>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="step-info animate-fade-in delay-3">
                      {steps.map((s, i) => (
                        <div key={i} className={`step-item ${s.done ? 'step-item-complete' : ''}`}>
                          <div className={`step-number ${s.done ? 'step-number-complete' : ''}`}>
                            {s.done ? tickSm : i + 1}
                          </div>
                          <div className="step-content">
                            <div className="step-title">
                              {s.title}
                              {s.done && <span className="step-verified-badge">{s.badge}</span>}
                            </div>
                            <div className="step-description">
                              {s.done ? s.doneDesc : s.pendingDesc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

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
              {!identityCheckConfirmed ? (
                <>
                  <div className="text-center mb-8 animate-fade-in delay-1">
                    <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "hsl(270 20% 55%)" }}>
                      Step 1 of 5
                    </p>
                    <h2 className="text-3xl font-light tracking-tight mb-2" style={{ color: "hsl(270 30% 25%)" }}>
                      Identity & Verification
                    </h2>
                    <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                      Enter your South African ID number to get started
                    </p>
                  </div>
                  <div className="space-y-5">
                    <div className="animate-fade-in delay-2">
                      <label htmlFor="identity-number">ID Number</label>
                      <div className="glass-field">
                        <input
                          type="text"
                          id="identity-number"
                          placeholder="Enter your 13-digit ID number"
                          value={identityNumber}
                          onChange={(event) => setIdentityNumber(event.target.value.replace(/\D/g, "").slice(0, 13))}
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                      We will check this number in onboarding pack records before allowing you to proceed.
                    </div>
                    <div className="pt-2 animate-fade-in delay-3">
                      <button
                        type="button"
                        className="submit-btn"
                        onClick={handleIdentityCheckContinue}
                        disabled={identityCheckLoading}
                      >
                        {identityCheckLoading ? "Checking..." : "Continue"}
                      </button>
                      {identityCheckError ? (
                        <p className="form-error" role="alert">{identityCheckError}</p>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <ExperianVerification onVerified={() => {
                  setKycVerificationDone(true);
                  goToStep(getNextIncompleteStep(2));
                }} />
              )}
            </div>
          ) : step === 2 ? (
            <ExperianVerification onVerified={() => {
              setKycVerificationDone(true);
              goToStep(getNextIncompleteStep(2));
            }} />
          ) : step === 3 ? (
            <div className="w-full max-w-xl mx-auto">
              <div className="text-center mb-8 animate-fade-in delay-1">
                <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "hsl(270 20% 55%)" }}>
                  Step 2 of 5
                </p>
                <div className="hero-icon">
                  <WalletIcon width={48} height={48} />
                </div>
                <h2 className="text-3xl font-light tracking-tight mb-2" style={{ color: "hsl(270 30% 25%)" }}>
                  Residential Address
                </h2>
                <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                  Please provide your current residential address for FICA compliance
                </p>
              </div>

              <div className="space-y-6">
                {/* Experian KYC V2 — pick a known address from the bureau */}
                {experianAddrLoading ? (
                  <div className="animate-fade-in delay-2 text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                    Looking up your addresses…
                  </div>
                ) : (experianAddresses && experianAddresses.length > 0) ? (
                  <div className="animate-fade-in delay-2">
                    <label htmlFor="experian-address">Select your address</label>
                    <div className="glass-field">
                      <select
                        id="experian-address"
                        className="w-full"
                        value={experianAddresses.findIndex((a) => a.formatted === address)}
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          if (idx >= 0 && experianAddresses[idx]) {
                            setAddress(experianAddresses[idx].formatted);
                            if (experianAddresses[idx].postalCode) setBureauPostalCode(experianAddresses[idx].postalCode);
                          }
                        }}
                      >
                        <option value={-1}>Choose an address…</option>
                        {experianAddresses.map((a, i) => (
                          <option key={i} value={i}>
                            {a.typeLabel ? `${a.typeLabel} — ` : ""}{a.formatted}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs mt-2" style={{ color: "hsl(270 15% 60%)" }}>
                      These are the addresses Experian has on record for you. Pick one, or enter a different one below.
                    </p>
                  </div>
                ) : null}

                {experianAddrLoading ? null : (experianAddresses && experianAddresses.length > 0) ? (
                  /* Bureau address on record — keep the free-text "different address" box. */
                  <div className="animate-fade-in delay-2">
                    <label htmlFor="residential-address">Or enter your address</label>
                    <div className="glass-field">
                      <AddressAutocomplete
                        value={address}
                        onChange={(value) => setAddress(value)}
                        placeholder="Search for your residential address"
                        containerClassName=""
                        inputClassName="w-full with-icon"
                      />
                    </div>
                    <p className="text-xs mt-2" style={{ color: "hsl(270 15% 60%)" }}>
                      Your address is required for regulatory compliance and credit assessment.
                    </p>
                  </div>
                ) : (
                  /* Manual fallback (no bureau address) — structured fields on one row
                     so the format + postal code are guaranteed, plus a required
                     proof-of-address document. */
                  <>
                    <div className="animate-fade-in delay-2">
                      <label htmlFor="addr-province">Residential Address</label>
                      <div className="glass-field" style={{ display: "flex", alignItems: "stretch", padding: 0, overflow: "hidden" }}>
                        <select
                          id="addr-province"
                          value={addrProvince}
                          onChange={(e) => setAddrProvince(e.target.value)}
                          style={{ flex: "0 0 30%", minWidth: 0, border: "none", background: "transparent", padding: "12px 8px", fontSize: "13px", outline: "none", color: addrProvince ? "hsl(270 30% 20%)" : "hsl(270 15% 60%)" }}
                        >
                          <option value="">Province</option>
                          {["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <div style={{ width: 1, background: "hsl(270 20% 90%)" }} />
                        <input
                          value={addrCity}
                          onChange={(e) => setAddrCity(e.target.value)}
                          placeholder="City"
                          style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", padding: "12px 8px", fontSize: "13px", outline: "none", color: "hsl(270 30% 20%)" }}
                        />
                        <div style={{ width: 1, background: "hsl(270 20% 90%)" }} />
                        <input
                          value={addrStreet}
                          onChange={(e) => setAddrStreet(e.target.value)}
                          placeholder="Street"
                          style={{ flex: 1.3, minWidth: 0, border: "none", background: "transparent", padding: "12px 8px", fontSize: "13px", outline: "none", color: "hsl(270 30% 20%)" }}
                        />
                        <div style={{ width: 1, background: "hsl(270 20% 90%)" }} />
                        <input
                          value={addrPostal}
                          onChange={(e) => setAddrPostal(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="0000"
                          inputMode="numeric"
                          maxLength={4}
                          style={{ flex: "0 0 58px", minWidth: 0, border: "none", background: "transparent", padding: "12px 6px", fontSize: "13px", outline: "none", color: "hsl(270 30% 20%)", letterSpacing: "1px" }}
                        />
                      </div>
                      <p className="text-xs mt-2" style={{ color: "hsl(270 15% 60%)" }}>
                        Enter your full address — province, city, street and 4-digit postal code.
                      </p>
                    </div>

                    <div className="animate-fade-in delay-2">
                      <label htmlFor="poa-upload">Proof of address</label>
                      <label
                        htmlFor="poa-upload"
                        className="glass-field"
                        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: poaUploading ? "wait" : "pointer" }}
                      >
                        {poaUrl ? (
                          <CheckCircleIcon width={18} height={18} style={{ color: "hsl(160 50% 40%)", flexShrink: 0 }} />
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "hsl(270 25% 55%)", flexShrink: 0 }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        )}
                        <span style={{ fontSize: "13px", color: poaUrl ? "hsl(160 50% 35%)" : "hsl(270 15% 55%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {poaUploading ? "Uploading…" : poaUrl ? poaFileName : "Upload bank statement or utility bill"}
                        </span>
                      </label>
                      <input id="poa-upload" type="file" accept=".pdf,image/*" style={{ display: "none" }} disabled={poaUploading} onChange={handlePoaUpload} />
                      {poaError ? (
                        <p className="text-xs mt-2" style={{ color: "hsl(0 60% 50%)" }}>{poaError}</p>
                      ) : (
                        <p className="text-xs mt-2" style={{ color: "hsl(270 15% 60%)" }}>
                          A recent bank statement or utility bill (PDF or photo) showing your name and address.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Experian KYC V2 — pick a contact number when several are on record */}
                {experianPhones && experianPhones.length > 1 && (
                  <div className="animate-fade-in delay-2">
                    <label htmlFor="experian-phone">Select your contact number</label>
                    <div className="glass-field">
                      <select
                        id="experian-phone"
                        className="w-full"
                        value={selectedPhone}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setSelectedPhone(val);
                          if (!val) return;
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                              await supabase.from("profiles").update({ phone_number: val }).eq("id", user.id);
                              window.dispatchEvent(new Event("profile-updated"));
                              console.log("[Onboarding] Saved selected bureau number to profile:", val);
                            }
                          } catch (err) {
                            console.warn("[Onboarding] Could not save selected number:", err);
                          }
                        }}
                      >
                        <option value="">Choose a number…</option>
                        {experianPhones.map((p, i) => (
                          <option key={i} value={p.value}>
                            {p.value}{p.type && p.type !== "other" ? ` (${p.type})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs mt-2" style={{ color: "hsl(270 15% 60%)" }}>
                      These are the contact numbers Experian has on record for you.
                    </p>
                  </div>
                )}

                <div className="pt-4 text-center animate-fade-in delay-3">
                  <button
                    type="button"
                    className="continue-button"
                    onClick={async () => {
                      const fallback = !(experianAddresses && experianAddresses.length > 0);
                      let finalAddress = address;
                      let details = {};
                      if (fallback) {
                        // Structured manual entry — all fields + proof of address required.
                        if (!(addrProvince && addrCity.trim() && addrStreet.trim() && /^\d{4}$/.test(addrPostal) && poaUrl)) return;
                        finalAddress = `${addrProvince}, ${addrCity.trim()}, ${addrStreet.trim()}, ${addrPostal}`;
                        details = {
                          province: addrProvince,
                          city: addrCity.trim(),
                          street: addrStreet.trim(),
                          postal_code: addrPostal,
                          proof_of_address_url: poaUrl,
                          proof_of_address_name: poaFileName,
                          manual_entry: true,
                        };
                      } else if (!(address && address.length > 5)) {
                        return;
                      }
                      setAddressLoading(true);
                      try {
                        if (!supabase) {
                          throw new Error("Supabase not initialized");
                        }
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user) {
                          // Save to profiles table
                          await supabase
                            .from("profiles")
                            .update({ address: finalAddress })
                            .eq("id", session.user.id);

                          // Save flag to user_onboarding
                          await saveProgressFlag("address_saved", {
                            address_details: { address: finalAddress, savedAt: new Date().toISOString(), ...details },
                          });

                          setAddressDone(true);
                          goToStep(getNextIncompleteStep(3));
                        }
                      } catch (err) {
                        console.error("Failed to save address:", err);
                      } finally {
                        setAddressLoading(false);
                      }
                    }}
                    disabled={addressLoading || ((experianAddresses && experianAddresses.length > 0)
                      ? (!address || address.length < 5)
                      : !(addrProvince && addrCity.trim() && addrStreet.trim() && /^\d{4}$/.test(addrPostal) && poaUrl))}
                  >
                    {addressLoading ? "Saving..." : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          ) : step === 4 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center mb-6 animate-fade-in delay-1">
                <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "hsl(270 20% 55%)" }}>
                  Step 3 of 5
                </p>
                <div className="hero-icon">
                  <FileContractIcon width={48} height={48} />
                </div>
                <h2 className="text-3xl font-light tracking-tight mb-2" style={{ color: "hsl(270 30% 25%)" }}>
                  Financial Details
                </h2>
                <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                  Complete all four sections below to continue
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
              </div>

              {/* ── Section 1: Tax Reference Number ── */}
              <div className="animate-fade-in delay-2" style={{ marginBottom: '12px', background: 'white', borderRadius: '16px', border: '1px solid hsl(270 20% 90%)', padding: '18px 20px', boxShadow: '0 2px 12px rgba(100,60,140,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'hsl(270 30% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>1</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'hsl(270 30% 25%)' }}>Tax Reference Number</div>
                    <div style={{ fontSize: '12px', color: 'hsl(270 15% 60%)' }}>Required by SARS for investment reporting</div>
                  </div>
                </div>
                <div className="glass-field">
                  <input
                    type="text"
                    placeholder="Enter your 10-digit tax number"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* ── Section 2: Bank Account Details ── */}
              <div className={`animate-fade-in delay-2 bank-step-wrapper${bankDropdownOpen ? ' dropdown-open' : ''}`} style={{ marginBottom: '12px', background: 'white', borderRadius: '16px', border: '1px solid hsl(270 20% 90%)', padding: '18px 20px', boxShadow: '0 2px 12px rgba(100,60,140,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'hsl(270 30% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>2</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'hsl(270 30% 25%)' }}>Bank Account Details</div>
                    <div style={{ fontSize: '12px', color: 'hsl(270 15% 60%)' }}>Link your South African bank account</div>
                  </div>
                </div>
                <div className="bank-section">
                  <div className="bank-section-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" /></svg>
                    Select Your Bank
                  </div>
                  <div className="custom-select" ref={bankDropdownRef}>
                    <div
                      className={`bank-select-trigger ${bankDropdownOpen ? "active" : ""}`}
                      role="button" tabIndex={0}
                      onClick={() => setBankDropdownOpen((p) => !p)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBankDropdownOpen((p) => !p); } }}
                    >
                      {bankName ? (
                        <span className="bank-select-value">
                          {selectedBankOption?.logo && <img src={selectedBankOption.logo} alt="" className="bank-option-logo" onError={(e) => { e.target.style.display = "none"; }} />}
                          <span>{selectedBankOption?.label}</span>
                        </span>
                      ) : <span className="bank-select-placeholder">Choose a bank</span>}
                      <svg className="bank-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                    <div className={`bank-dropdown-list ${bankDropdownOpen ? "active" : ""}`}>
                      {southAfricanBanks.map((option) => (
                        <div key={option.value || "placeholder"} className={`bank-dropdown-option ${bankName === option.value ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => handleBankSelect(option.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleBankSelect(option.value); } }}>
                          {option.logo && <img src={option.logo} alt="" className="bank-option-logo" onError={(e) => { e.target.style.display = "none"; }} />}
                          <span>{option.label}</span>
                          {bankName === option.value && <svg className="bank-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                        </div>
                      ))}
                    </div>
                    <input type="hidden" value={bankName} />
                  </div>
                </div>
                <div className="bank-section hide-when-dropdown-open" ref={accountTypeDropdownRef} style={{ position: 'relative', zIndex: 10 }}>
                  <div className="bank-section-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>
                    Account Type
                  </div>
                  <div className="custom-select">
                    <div
                      className={`bank-select-trigger ${accountTypeDropdownOpen ? "active" : ""}`}
                      role="button" tabIndex={0}
                      onClick={() => setAccountTypeDropdownOpen(p => !p)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAccountTypeDropdownOpen(p => !p); } }}
                    >
                      {bankAccountType
                        ? <span className="bank-select-value">{accountTypeOptions.find(o => o.value === bankAccountType)?.label}</span>
                        : <span className="bank-select-placeholder">Select account type</span>}
                      <svg className="bank-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                    <div className={`bank-dropdown-list ${accountTypeDropdownOpen ? "active" : ""}`}>
                      {accountTypeOptions.map((option) => (
                        <div key={option.value} className={`bank-dropdown-option ${bankAccountType === option.value ? "selected" : ""}`} role="button" tabIndex={0}
                          onClick={() => { setBankAccountType(option.value); setAccountTypeDropdownOpen(false); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBankAccountType(option.value); setAccountTypeDropdownOpen(false); } }}>
                          <span>{option.label}</span>
                          {bankAccountType === option.value && <svg className="bank-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bank-account-fields hide-when-dropdown-open">
                  <div className="bank-section-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" /></svg>
                    Account Details
                  </div>
                  <div className="bank-inputs-card">
                    <div className="bank-input-row">
                      <label htmlFor="bank-account-name2">Account Holder Name</label>
                      <div className="bank-input-field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18" className="bank-input-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A17.933 17.933 0 0 1 12 21.75a17.933 17.933 0 0 1-7.5-1.632Z" /></svg>
                        <input type="text" id="bank-account-name2" placeholder="Enter account holder full name" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} autoComplete="name" />
                      </div>
                    </div>
                    <div className="bank-input-divider"></div>
                    <div className="bank-input-row">
                      <label htmlFor="bank-account-number2">Account Number</label>
                      <div className="bank-input-field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18" className="bank-input-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>
                        <input type="text" id="bank-account-number2" placeholder="Enter your account number" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 13))} inputMode="numeric" autoComplete="off" maxLength={13} />
                      </div>
                    </div>
                    <div className="bank-input-divider"></div>
                    <div className="bank-input-row">
                      <label htmlFor="bank-branch-code2">Branch Code</label>
                      <div className="bank-input-field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18" className="bank-input-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                        <input type="text" id="bank-branch-code2" placeholder={bankName === "other" ? "Enter your branch code" : "Select a bank above"} value={bankBranchCode} onChange={(e) => setBankBranchCode(e.target.value.replace(/\D/g, ""))} readOnly={bankName !== "other" && bankName !== ""} style={bankName !== "other" && bankName !== "" ? { opacity: 0.7, cursor: "default" } : {}} inputMode="numeric" autoComplete="off" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bank-security-notice hide-when-dropdown-open">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16" className="bank-security-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                  <span>Your banking details are encrypted and stored securely.</span>
                </div>
              </div>

              {/* ── Section 3: Bank Confirmation Letter ── */}
              <div className="animate-fade-in delay-3" style={{ marginBottom: '12px', background: 'white', borderRadius: '16px', border: `1px solid ${bankLetterRejected ? '#fca5a5' : 'hsl(270 20% 90%)'}`, padding: '18px 20px', boxShadow: '0 2px 12px rgba(100,60,140,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: bankLetterDone ? '#22c55e' : bankLetterRejected ? '#ef4444' : 'hsl(270 30% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {bankLetterDone
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="14" height="14"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      : bankLetterRejected
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="14" height="14"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        : <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>3</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'hsl(270 30% 25%)' }}>Bank Confirmation Letter</div>
                    <div style={{ fontSize: '12px', color: 'hsl(270 15% 60%)' }}>PDF or image, not older than 3 months</div>
                  </div>
                  {bankLetterDone && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#dcfce7', color: '#16a34a', fontWeight: '600' }}>Verified</span>}
                  {bankLetterRejected && !bankLetterDone && <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#fee2e2', color: '#dc2626', fontWeight: '600' }}>Not matched</span>}
                </div>

                {bankLetterDone ? (
                  <div>
                    <p style={{ fontSize: '13px', color: 'hsl(270 15% 55%)', marginBottom: '10px' }}>Your letter has been verified successfully.</p>
                    <button
                      onClick={() => { setBankLetterDone(false); setBankLetterRejected(false); setBankLetterRejectReason(""); }}
                      style={{ fontSize: '12px', color: 'hsl(270 30% 45%)', background: 'none', border: '1px solid hsl(270 20% 85%)', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer' }}
                    >
                      Re-upload
                    </button>
                  </div>
                ) : (
                  <>
                    {bankLetterRejected && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
                        <p style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500', marginBottom: '4px' }}>Document could not be verified</p>
                        <p style={{ fontSize: '12px', color: '#b91c1c' }}>{bankLetterRejectReason || "Please upload a clear bank confirmation letter showing your name and account number."}</p>
                      </div>
                    )}
                    <div
                      className="glass-field py-6 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors"
                      style={{ borderColor: bankLetterRejected ? '#fca5a5' : '#cbd5e1' }}
                      onClick={() => document.getElementById('bank-letter-upload-v2').click()}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" style={{ color: bankLetterRejected ? '#ef4444' : '#94a3b8', marginBottom: '8px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                      <p className="text-sm font-medium" style={{ color: bankLetterRejected ? '#dc2626' : 'hsl(270 30% 25%)' }}>{bankLetterRejected ? 'Upload a new letter' : 'Click to upload your letter'}</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(270 15% 60%)' }}>PDF, JPG or PNG (max 5MB)</p>
                      <input
                        type="file" id="bank-letter-upload-v2" className="hidden" accept=".pdf,image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          e.target.value = "";
                          setBankLetterUploading(true);
                          setSubmitError("");
                          setBankLetterRejected(false);
                          setBankLetterRejectReason("");
                          try {
                            const reader = new FileReader();
                            reader.onload = async (evt) => {
                              const base64 = evt.target.result;
                              const { data: { session } } = await supabase.auth.getSession();
                              const token = session?.access_token;
                              const res = await fetch("/api/onboarding/upload-bank-letter", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                                body: JSON.stringify({
                                  fileBase64: base64,
                                  fileType: file.type,
                                  accountNumber: bankAccountNumber,
                                  accountHolderName: bankAccountName,
                                  bankName: bankName,
                                }),
                              });
                              const result = await res.json();
                              if (result.success && result.verified) {
                                setBankLetterDone(true);
                                await saveProgressFlag("bank_letter_uploaded", { bank_letter_url: result.publicUrl, bank_letter_uploaded_at: new Date().toISOString() });
                              } else if (result.success && result.verified === false) {
                                setBankLetterRejected(true);
                                setBankLetterRejectReason(result.reason || "Document could not be verified.");
                              } else {
                                setSubmitError(result.error || "Failed to upload file");
                              }
                              setBankLetterUploading(false);
                            };
                            reader.readAsDataURL(file);
                          } catch {
                            setSubmitError("An error occurred during upload");
                            setBankLetterUploading(false);
                          }
                        }}
                      />
                    </div>
                    {bankLetterUploading && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                        <span className="text-xs text-slate-500">Uploading and verifying…</span>
                      </div>
                    )}
                    {submitError && <p className="text-center mt-2 text-red-500 text-xs">{submitError}</p>}
                  </>
                )}
              </div>

              {/* ── Section 4: Source of Funds ── */}
              <div className="animate-fade-in delay-3" style={{ marginBottom: '12px', background: 'white', borderRadius: '16px', border: '1px solid hsl(270 20% 90%)', padding: '18px 20px', boxShadow: '0 2px 12px rgba(100,60,140,0.06)', position: 'relative', zIndex: 20, transform: 'translateZ(0)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'hsl(270 30% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>4</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'hsl(270 30% 25%)' }}>Source of Funds</div>
                    <div style={{ fontSize: '12px', color: 'hsl(270 15% 60%)' }}>Declare the origin of your investment funds</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="source-of-funds2" style={{ fontSize: '13px', fontWeight: '500', color: 'hsl(270 30% 25%)', display: 'block', marginBottom: '6px' }}>Primary Source of Funds</label>
                    <div className="custom-select" ref={sofDropdownRef}>
                      <div
                        className={`bank-select-trigger ${sofDropdownOpen ? "active" : ""}`}
                        role="button" tabIndex={0}
                        onClick={() => setSofDropdownOpen((p) => !p)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSofDropdownOpen((p) => !p); } }}
                      >
                        {sourceOfFunds
                          ? <span className="bank-select-value">{selectedSofOption?.label}</span>
                          : <span className="bank-select-placeholder">Select source of funds</span>}
                        <svg className="bank-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                      </div>
                      <div className={`bank-dropdown-list ${sofDropdownOpen ? "active" : ""}`}>
                        {sourceOfFundsOptions.filter(o => o.value).map((option) => (
                          <div key={option.value} className={`bank-dropdown-option ${sourceOfFunds === option.value ? "selected" : ""}`} role="button" tabIndex={0}
                            onClick={() => handleSofSelect(option.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSofSelect(option.value); } }}>
                            <span>{option.label}</span>
                            {sourceOfFunds === option.value && <svg className="bank-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                          </div>
                        ))}
                      </div>
                      <input type="hidden" id="source-of-funds2" value={sourceOfFunds} />
                    </div>
                  </div>
                  {sourceOfFunds === "other" && (
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '500', color: 'hsl(270 30% 25%)', display: 'block', marginBottom: '6px' }}>Please describe your source of funds</label>
                      <div className="glass-field"><input type="text" placeholder="Describe your source of funds" value={sourceOfFundsOther} onChange={(e) => setSourceOfFundsOther(e.target.value)} /></div>
                    </div>
                  )}
                  <div className="bank-section" ref={monthlyInvestmentDropdownRef} style={{ position: 'relative', zIndex: 10, marginBottom: 0 }}>
                    <div className="bank-section-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                      Expected Monthly Investment
                    </div>
                    <div className="custom-select">
                      <div
                        className={`bank-select-trigger ${monthlyInvestmentDropdownOpen ? "active" : ""}`}
                        role="button" tabIndex={0}
                        onClick={() => setMonthlyInvestmentDropdownOpen(p => !p)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMonthlyInvestmentDropdownOpen(p => !p); } }}
                      >
                        {expectedMonthlyInvestment
                          ? <span className="bank-select-value">{monthlyInvestmentOptions.find(o => o.value === expectedMonthlyInvestment)?.label}</span>
                          : <span className="bank-select-placeholder">Select amount range</span>}
                        <svg className="bank-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                      </div>
                      <div className={`bank-dropdown-list ${monthlyInvestmentDropdownOpen ? "active" : ""}`}>
                        {monthlyInvestmentOptions.filter(o => o.value).map((option) => (
                          <div key={option.value} className={`bank-dropdown-option ${expectedMonthlyInvestment === option.value ? "selected" : ""}`} role="button" tabIndex={0}
                            onClick={() => { setExpectedMonthlyInvestment(option.value); setMonthlyInvestmentDropdownOpen(false); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpectedMonthlyInvestment(option.value); setMonthlyInvestmentDropdownOpen(false); } }}>
                            <span>{option.label}</span>
                            {expectedMonthlyInvestment === option.value && <svg className="bank-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="checkbox-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input type="checkbox" checked={agreedSourceOfFunds} onChange={(e) => setAgreedSourceOfFunds(e.target.checked)} />
                      <span className="checkbox-label" style={{ fontSize: '13px' }}>I declare that the funds I will use for investing are from legitimate sources and I am the beneficial owner of these funds</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Continue: saves everything at once ── */}
              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className={`continue-button agreement-continue${taxNumber && taxNumber.length >= 6 && bankDetailsReady && bankLetterDone && sofReady ? ' enabled' : ''}`}
                  disabled={!(taxNumber && taxNumber.length >= 6 && bankDetailsReady && bankLetterDone && sofReady)}
                  onClick={async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const userId = session?.user?.id;
                      if (userId) {
                        await supabase.from("user_onboarding").update({ bank_name: bankName || null, bank_account_number: bankAccountNumber || null, bank_branch_code: bankBranchCode || null }).eq("user_id", userId);
                      }
                    } catch { }
                    await saveProgressFlag("tax_details_saved", { tax_details: { tax_number: taxNumber, savedAt: new Date().toISOString() } });
                    await saveProgressFlag("bank_details_saved", { bank_details: { bank_name: bankName || null, bank_account_name: bankAccountName || null, bank_account_type: bankAccountType || null, bank_account_number: bankAccountNumber || null, bank_branch_code: bankBranchCode || null, savedAt: new Date().toISOString() } });
                    await saveProgressFlag("source_of_funds_accepted", { source_of_funds_details: { source_of_funds: sourceOfFunds, source_of_funds_other: sourceOfFunds === "other" ? sourceOfFundsOther : null, expected_monthly_investment: expectedMonthlyInvestment } });
                    setTaxDone(true);
                    setBankDone(true);
                    setSofDone(true);
                    goToStep(getNextIncompleteStep(4, 4));
                  }}
                >
                  Continue
                </button>
              </div>
              <div className="text-center mt-4 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>Step 3 of 5</p>
              </div>
            </div>

          ) : step === 5 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon"><FileContractIcon width={48} height={48} /></div>
                <h2 className="text-3xl font-light tracking-tight mb-2" style={{ color: "hsl(270 30% 25%)" }}>Discretionary FSP Mandate</h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>Please review and accept the investment management mandate</p>
              </div>
              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step"></div>
              </div>
              {(() => {
                if (profileLoading) return null;
                const missingFields = [
                  !(profile?.firstName?.trim() || profile?.first_name?.trim()) && "First Name",
                  !(profile?.lastName?.trim() || profile?.last_name?.trim()) && "Surname",
                  !profile?.idNumber?.trim() && "ID Number",
                  !profile?.address?.trim() && "Address",
                  !profile?.phoneNumber?.trim() && "Cell Number",
                  !profile?.email?.trim() && "Email Address",
                ].filter(Boolean);
                if (missingFields.length === 0) return null;
                return (
                  <div className="animate-fade-in delay-2" style={{ background: "hsl(38 100% 97%)", border: "1px solid hsl(38 80% 75%)", borderRadius: "12px", padding: "14px 18px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="hsl(38 90% 45%)" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, marginTop: "1px" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: "600", color: "hsl(38 70% 30%)", marginBottom: "6px" }}>Your profile is missing the following required fields. Please fill them in on the first tab of the mandate document below before you can continue:</p>
                        <ul style={{ margin: 0, paddingLeft: "16px", listStyleType: "disc" }}>
                          {missingFields.map((field) => <li key={field} style={{ fontSize: "12px", color: "hsl(38 70% 30%)", marginBottom: "2px" }}>{field}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="animate-fade-in delay-2" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid hsl(270 20% 90%)', boxShadow: '0 4px 20px rgba(100, 60, 140, 0.08)', background: 'white' }}>
                <MandateViewer profile={profile} onValidChange={setMandateValid} onDataChange={(data) => { mandateDataRef.current = data; }} requestTab={mandateRequestTab} bureauPostalCode={bureauPostalCode} />
              </div>
              {!mandateValid && (
                <div className="animate-fade-in" style={{ marginTop: "10px" }}>
                  <p style={{ color: "#ef4444", fontSize: "12px", textAlign: "center" }}>Select your discretion type, complete the Schedules selections, then finish the Sign Off below before continuing.</p>
                </div>
              )}
              {submitError && <p className="text-center animate-fade-in" style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px" }}>{submitError}</p>}
              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className={`continue-button agreement-continue ${mandateValid ? "enabled" : ""}`}
                  disabled={!mandateValid}
                  onClick={async () => {
                    await saveProgressFlag("mandate_accepted");
                    setMandateDone(true);
                    if (editMandate) {
                      // Updating discretionary only: persist the mandate and return.
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const token = session?.access_token;
                        if (token && mandateDataRef.current) {
                          await fetch("/api/onboarding/save-mandate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ mandate_data: { ...mandateDataRef.current }, existing_onboarding_id: existingOnboardingId || null }),
                          });
                        }
                      } catch (e) { console.error("Mandate update save error:", e); }
                      if (onComplete) onComplete();
                      return;
                    }
                    goToStep(getNextIncompleteStep(5, 5));
                  }}
                >
                  Continue
                </button>
              </div>
              <div className="text-center mt-6 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>Step 4 of 5</p>
              </div>
            </div>

          ) : step === 6 ? (
            <div className="w-full max-w-3xl mx-auto">
              {!signingStarted && (
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon"><ShieldIcon width={48} height={48} /></div>
                <h2 className="text-3xl font-light tracking-tight mb-2" style={{ color: "hsl(270 30% 25%)" }}>Final Agreements</h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>Review the risk disclosure, accept our terms, and sign your account agreement</p>
              </div>
              )}
              {!signingStarted && (
              <>{/* ── Section 1: Risk Disclosure (accordion) ── */}
              <div className="animate-fade-in delay-2" style={{ marginBottom: '12px', background: 'white', borderRadius: '16px', border: '1px solid hsl(270 20% 90%)', boxShadow: '0 2px 12px rgba(100,60,140,0.06)', overflow: 'hidden' }}>
                <button type="button" onClick={() => setSec1Open(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'hsl(270 30% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>1</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'hsl(270 30% 25%)' }}>Investment Risk Disclosure</div>
                    <div style={{ fontSize: '12px', color: 'hsl(270 15% 60%)' }}>Review the risks before investing</div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="hsl(270 20% 55%)" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: sec1Open ? 'rotate(180deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                </button>
                {sec1Open && (
                  <div style={{ padding: '0 20px 18px' }}>
                    <div className="agreement-card">
                      <div className="agreement-section">
                        <div className="section-title">1. Investment Risk Warning</div>
                        <div className="agreement-text">Investing in financial instruments involves risk, including the possible loss of some or all of your principal investment. Past performance is not indicative of future results. The value of investments and the income derived from them may go down as well as up.</div>
                      </div>
                      <div className="agreement-section">
                        <div className="section-title">2. Market Volatility</div>
                        <div className="agreement-text">Financial markets can be volatile and unpredictable. Prices of securities, including those listed on the JSE, can fluctuate significantly due to various factors including economic conditions, political events, company performance, and market sentiment.</div>
                      </div>
                      <div className="agreement-section">
                        <div className="section-title">3. No Guaranteed Returns</div>
                        <div className="agreement-text">MINT does not guarantee any returns on investments. All investment decisions are made at your own risk. You should only invest money that you can afford to lose without affecting your standard of living.</div>
                      </div>
                      <div className="agreement-section">
                        <div className="section-title">4. Regulatory Compliance</div>
                        <div className="agreement-text">MINT operates in compliance with South African financial regulations. We are committed to transparency and providing you with the information needed to make informed investment decisions. However, we do not provide personalised financial advice.</div>
                      </div>
                      <div className="agreement-section">
                        <div className="section-title">5. Diversification Notice</div>
                        <div className="agreement-text">Concentrating investments in a single security, sector, or asset class increases risk. We encourage you to diversify your portfolio and seek independent financial advice if needed.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Section 2: Terms & Conditions (accordion) ── */}
              <div className="animate-fade-in delay-3" style={{ marginBottom: '12px', background: 'white', borderRadius: '16px', border: '1px solid hsl(270 20% 90%)', boxShadow: '0 2px 12px rgba(100,60,140,0.06)', overflow: 'hidden' }}>
                <button type="button" onClick={() => setSec2Open(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'hsl(270 30% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>2</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'hsl(270 30% 25%)' }}>Terms &amp; Conditions</div>
                    <div style={{ fontSize: '12px', color: 'hsl(270 15% 60%)' }}>Review and accept the MINT terms</div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="hsl(270 20% 55%)" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: sec2Open ? 'rotate(180deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                </button>
                {sec2Open && (
                  <div style={{ padding: '0 20px 18px' }}>
                    <div className="agreement-card">
                      <div className="agreement-section">
                        <div className="section-title">1. Introduction</div>
                        <div className="agreement-text">Welcome to MINT. By accessing or using our services, you agree to be bound by these Terms and Conditions. Please read them carefully before proceeding. These terms govern your use of our platform and all related services.</div>
                      </div>
                      <div className="agreement-section">
                        <div className="section-title">2. User Account</div>
                        <div className="agreement-text">To use MINT, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information during the onboarding process.</div>
                      </div>
                      <div className="agreement-section">
                        <div className="section-title">3. Investment Services</div>
                        <div className="agreement-text">MINT provides a platform for fractional investment in various assets. We are not a financial advisor, and the information provided through our platform does not constitute financial, investment, or tax advice. You should perform your own research or consult with a qualified advisor.</div>
                      </div>
                      <div className="agreement-section">
                        <div className="section-title">4. Fees and Charges</div>
                        <div className="agreement-text">MINT may charge fees for its services. These fees will be clearly disclosed to you. You agree to pay all fees associated with your use of our platform. We reserve the right to change our fee structure with prior notice to you.</div>
                      </div>
                      <div className="agreement-section">
                        <div className="section-title">5. Privacy and Security</div>
                        <div className="agreement-text">Your privacy is important to us. We collect and process your personal information in accordance with our Privacy Policy. We use industry-standard security measures to protect your data, but we cannot guarantee absolute security.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Section 3: Account Agreement signing (accordion, always visible) ── */}
              <div className="animate-fade-in delay-4" style={{ marginBottom: '12px', background: 'white', borderRadius: '16px', border: '1px solid hsl(270 20% 90%)', boxShadow: '0 2px 12px rgba(100,60,140,0.06)', overflow: 'hidden' }}>
                <button type="button" onClick={() => setSec3Open(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'hsl(270 30% 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>3</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'hsl(270 30% 25%)' }}>Sign Your Account Agreement</div>
                    <div style={{ fontSize: '12px', color: 'hsl(270 15% 60%)' }}>Review and sign your client agreement</div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="hsl(270 20% 55%)" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: sec3Open ? 'rotate(180deg)' : 'rotate(0deg)' }}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                </button>
                {sec3Open && (
                  <div style={{ padding: '0 20px 18px' }}>
                    <AccountAgreementStep
                      profile={profile}
                      onboardingData={{ bankName, bankAccountNumber, bankBranchCode, bankAccountType, taxNumber, identityNumber, sourceOfFunds, sourceOfFundsOther, expectedMonthlyInvestment }}
                      existingOnboardingId={existingOnboardingId}
                      initialPhase="sign"
                      mode="text-only"
                    />
                  </div>
                )}
              </div>
              </>)}

              {/* ── Standalone Signature Section ── */}
              <div
                className={signingStarted ? "animate-fade-in" : "animate-fade-in delay-4"}
                style={{
                  marginBottom: signingStarted ? '0' : '12px',
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid hsl(270 20% 90%)',
                  boxShadow: signingStarted ? '0 4px 24px rgba(83,47,126,0.10)' : '0 2px 12px rgba(100,60,140,0.06)',
                  overflow: 'hidden',
                }}
              >
                {!signingStarted && (
                  <div style={{ padding: '18px 20px', borderBottom: '1px solid hsl(270 20% 90%)', background: 'hsl(270 50% 98%)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="hsl(270 30% 25%)" strokeWidth="1.5" width="20" height="20" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                    </svg>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'hsl(270 30% 25%)' }}>Your Signature</div>
                      <div style={{ fontSize: '12px', color: 'hsl(270 15% 60%)' }}>Sign below to agree to all sections and complete onboarding</div>
                    </div>
                  </div>
                )}
                <div style={{ padding: signingStarted ? '0' : '20px' }}>
                  <AccountAgreementStep
                    profile={profile}
                    onboardingData={{ bankName, bankAccountNumber, bankBranchCode, bankAccountType, taxNumber, identityNumber, sourceOfFunds, sourceOfFundsOther, expectedMonthlyInvestment }}
                    existingOnboardingId={existingOnboardingId}
                    initialPhase="sign"
                    mode="signature-only"
                    onSignStart={() => setSigningStarted(true)}
                    onComplete={async (signingResults) => {
                      setRiskDone(true);
                      setTermsDone(true);
                      await handleFinalComplete(signingResults);
                      goToStep(7);
                    }}
                  />
                </div>
              </div>

              {!signingStarted && (
                <div className="text-center mt-4 animate-fade-in delay-4">
                  <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>Step 5 of 5</p>
                </div>
              )}
            </div>

          ) : step === 7 ? (
            <div className="w-full max-w-3xl mx-auto">
              {(() => {
                const tick = (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                );
                const tickSm = (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                );
                const identityCheckDone = identityCheckConfirmed || kycAlreadyVerified;
                const financialDetailsDone = taxDone && bankDone && bankLetterDone && sofDone;
                const reviewSteps = [
                  { done: identityCheckDone && kycVerificationDone, title: "Identity & Verification", doneDesc: "Identity verified", pendingDesc: "Confirm your ID and complete identity verification", badge: "Verified" },
                  { done: addressDone, title: "Residential Address", doneDesc: "Address captured", pendingDesc: "Provide your current residential address", badge: "Captured" },
                  { done: financialDetailsDone, title: "Financial Details", doneDesc: "Financial details saved", pendingDesc: "Bank, tax, source of funds & more", badge: "Saved" },
                  { done: mandateDone, title: "Discretionary Mandate", doneDesc: "Mandate accepted", pendingDesc: "Review and accept the FSP investment mandate", badge: "Accepted" },
                  { done: riskDone && termsDone && agreementSignedDone, title: "Final Agreements", doneDesc: "Agreements signed", pendingDesc: "Risk disclosure, terms & account agreement", badge: "Signed" },
                ];
                const allDone = reviewSteps.every(s => s.done);
                return (
                  <>
                    <div className="text-center animate-fade-in delay-1">
                      <div className="hero-icon">
                        {allDone
                          ? <svg viewBox="0 0 24 24" fill="none" stroke="hsl(270 30% 25%)" strokeWidth="1.5" width="48" height="48"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                          : <svg viewBox="0 0 24 24" fill="none" stroke="hsl(270 30% 25%)" strokeWidth="1.5" width="48" height="48"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 0 0 2.25 2.25h.75" /></svg>
                        }
                      </div>
                      <h2 className="text-3xl font-light tracking-tight mb-2" style={{ color: "hsl(270 30% 25%)" }}>
                        {allDone ? "You're all set!" : "Application Review"}
                      </h2>
                      <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                        {allDone ? "Your onboarding is complete. Welcome to MINT." : "Here's a summary of your onboarding progress"}
                      </p>
                    </div>
                    <div className="steps-container animate-fade-in delay-2">
                      {reviewSteps.map((s, i) => (
                        <React.Fragment key={i}>
                          <div className={`step-circle ${s.done ? 'step-circle-complete' : ''}`}>
                            {s.done ? tick : i + 1}
                          </div>
                          {i < reviewSteps.length - 1 && <div className={`step-line ${s.done ? 'step-line-complete' : ''}`}></div>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="step-info animate-fade-in delay-3">
                      {reviewSteps.map((s, i) => (
                        <div key={i} className={`step-item ${s.done ? 'step-item-complete' : ''}`}>
                          <div className={`step-number ${s.done ? 'step-number-complete' : ''}`}>
                            {s.done ? tickSm : i + 1}
                          </div>
                          <div className="step-content">
                            <div className="step-title">
                              {s.title}
                              {s.done && <span className="step-verified-badge">{s.badge}</span>}
                            </div>
                            <div className="step-description">
                              {s.done ? s.doneDesc : s.pendingDesc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {allDone && (
                      <div className="text-center mt-8 animate-fade-in delay-4">
                        <button
                          type="button"
                          className="continue-button agreement-continue enabled"
                          onClick={() => { if (onComplete) onComplete(); }}
                        >
                          Go to Dashboard
                        </button>
                      </div>
                    )}
                    {!allDone && (
                      <div className="text-center mt-8 animate-fade-in delay-4">
                        <button
                          type="button"
                          className="continue-button agreement-continue enabled"
                          onClick={() => goToStep(getNextIncompleteStep(0))}
                        >
                          Continue Where I Left Off
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OnboardingProcessPage;
