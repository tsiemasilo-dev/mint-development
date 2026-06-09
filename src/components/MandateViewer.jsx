import React, { useState, useRef, useEffect, useCallback } from "react";

const CHECKBOX_GROUPS = {
  full_jurisdiction: ["full-local", "full-offshore", "full-both"],
  full_long_term: ["full-lt-0", "full-lt-1"],
  full_medium_term: ["full-mt-0", "full-mt-1"],
  full_short_term: ["full-st-0", "full-st-1"],
  full_risk: ["full-rp-0", "full-rp-1", "full-rp-2", "full-rp-3", "full-rp-4"],
  lim_exercise: ["lim-instruction", "lim-advice", "lim-advisor"],
  lim_jurisdiction: ["lim-local", "lim-offshore", "lim-both"],
  lim_cash: ["lim-reinvest", "lim-payout"],
  lim_long_term: ["lim-lt-0", "lim-lt-1"],
  lim_medium_term: ["lim-mt-0", "lim-mt-1"],
  lim_short_term: ["lim-st-0", "lim-st-1"],
  lim_risk: ["lim-rp-0", "lim-rp-1", "lim-rp-2", "lim-rp-3", "lim-rp-4"],
};

const COUNTRY_CODES = [
  { code: "+27", label: "South Africa (+27)", flag: "🇿🇦" },
  { code: "+1",  label: "United States (+1)",  flag: "🇺🇸" },
  { code: "+44", label: "United Kingdom (+44)", flag: "🇬🇧" },
  { code: "+61", label: "Australia (+61)",      flag: "🇦🇺" },
  { code: "+49", label: "Germany (+49)",        flag: "🇩🇪" },
  { code: "+33", label: "France (+33)",         flag: "🇫🇷" },
  { code: "+91", label: "India (+91)",          flag: "🇮🇳" },
  { code: "+86", label: "China (+86)",          flag: "🇨🇳" },
  { code: "+55", label: "Brazil (+55)",         flag: "🇧🇷" },
  { code: "+234", label: "Nigeria (+234)",      flag: "🇳🇬" },
  { code: "+254", label: "Kenya (+254)",        flag: "🇰🇪" },
  { code: "+263", label: "Zimbabwe (+263)",     flag: "🇿🇼" },
];

// Read-only initials stamp shown inside document pages
const InitialsStamp = ({ value }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", paddingTop: "10px" }}>
    <div style={{ border: "1px solid #333", padding: "5px 8px", width: "120px", background: "white", borderRadius: "4px" }}>
      <div style={{ fontSize: "9px", fontWeight: "bold", marginBottom: "3px" }}>Initials:</div>
      <div style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "4px", padding: "2px 0", minHeight: "20px", borderBottom: "1px solid #ccc", color: value ? "#222" : "#ccc", textAlign: "center" }}>
        {value || "—"}
      </div>
    </div>
  </div>
);

const MandateViewer = ({ profile = {}, onValidChange, onDataChange, savedData, requestTab }) => {
  const [sec3Open, setSec3Open]       = useState(false);
  const [docViewer, setDocViewer]     = useState(null); // null | "mandate" | "terms"
  const [initials, setInitials]       = useState(savedData?.initials    || "");
  const [countryCode, setCountryCode] = useState(savedData?.countryCode || "");
  const [agreedRead, setAgreedRead]   = useState(savedData?.agreedRead  || false);
  const [signKey, setSignKey]         = useState("initials"); // current sign-off slide
  const [signExtras, setSignExtras]   = useState(null);       // frozen list of missing required fields
  const [showLimitedPopup, setShowLimitedPopup] = useState(false);
  const [addendumOpen, setAddendumOpen] = useState(false);
  const [annexureOpen, setAnnexureOpen] = useState(false);
  const [checkedBoxes, setCheckedBoxes]   = useState(savedData?.checkedBoxes   || {});
  const [showErrors, setShowErrors]       = useState(false);
  const [discretionType, setDiscretionType] = useState(savedData?.discretionType || null);
  const [editableFields, setEditableFields] = useState(savedData?.editableFields || {});

  const sec3HeaderRef    = useRef(null);
  const manualOverrideRef = useRef(false);
  const fullRef           = useRef(null);
  const limitedRef        = useRef(null);
  const signDirRef        = useRef("fwd");

  // Restore saved data
  useEffect(() => {
    if (savedData?.initials !== undefined) {
      setInitials(savedData.initials || "");
      setCheckedBoxes(savedData.checkedBoxes || {});
      setDiscretionType(savedData.discretionType || null);
      setEditableFields(savedData.editableFields || {});
      if (savedData.countryCode) setCountryCode(savedData.countryCode);
      if (savedData.agreedRead)  setAgreedRead(savedData.agreedRead);
    }
  }, [savedData]);

  // External tab request: 0→mandate doc, 1→terms doc, 2→schedules accordion
  useEffect(() => {
    if (requestTab == null) return;
    if (requestTab === 0) setDocViewer("mandate");
    else if (requestTab === 1) setDocViewer("terms");
    else if (requestTab === 2) {
      setSec3Open(true); setShowErrors(true);
      setTimeout(() => sec3HeaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [requestTab]);

  const updateEditableField = (key, val) => setEditableFields(p => ({ ...p, [key]: val }));
  // Compose a full phone from a country code + local digits (strip a leading 0).
  const updatePhone = (cc, localRaw) => {
    const local = String(localRaw).replace(/\D/g, "");
    setCountryCode(cc);
    setEditableFields(p => ({ ...p, phoneLocal: local, phoneNumber: local ? `${cc}${local.replace(/^0/, "")}` : "" }));
  };
  const toggleCheckbox      = (id)        => setCheckedBoxes(p  => ({ ...p, [id]: !p[id] }));

  const REQUIRE_ALL_GROUPS = ["lim_exercise"];

  const activeGroups = useCallback(() => {
    if (!discretionType) return [];
    const prefix = discretionType === "full" ? "full_" : "lim_";
    return Object.keys(CHECKBOX_GROUPS).filter(k => k.startsWith(prefix));
  }, [discretionType]);

  const isGroupValid = useCallback((groupKey) => {
    const ids = CHECKBOX_GROUPS[groupKey];
    return REQUIRE_ALL_GROUPS.includes(groupKey) ? ids.every(id => checkedBoxes[id]) : ids.some(id => checkedBoxes[id]);
  }, [checkedBoxes]);

  const allGroupsValid = useCallback(() => {
    const groups = activeGroups();
    return groups.length > 0 && groups.every(k => isGroupValid(k));
  }, [isGroupValid, activeGroups]);

  // Profile fields
  const {
    firstName: pFirst = "", lastName: pLast = "",
    idNumber: pId = "", address: pAddr = "",
    phoneNumber: pPhone = "", email: pEmail = "",
  } = profile;
  const getField        = (key, pv) => editableFields[key] !== undefined ? editableFields[key] : (pv || "");
  const fromProfile     = (pv)       => !!(pv && String(pv).trim());

  const firstName   = getField("firstName",  pFirst  || profile?.first_name  || "");
  const lastName    = getField("lastName",   pLast   || profile?.last_name   || "");
  const idNumber    = getField("idNumber",   pId);
  const address     = getField("address",    pAddr);
  const email       = getField("email",      pEmail);
  const phoneNumber = getField("phoneNumber", pPhone);

  // Phone / address helpers
  const parsePhone = (val) => {
    if (!val) return { cc: "", cell: "", num: "" };
    const c = String(val).replace(/[\s()-]/g, "");
    if (c.startsWith("+27")) return { cc: "+27", cell: c.slice(3,5), num: c.slice(5) };
    if (c.startsWith("0"))   return { cc: "+27", cell: c.slice(1,3), num: c.slice(3) };
    const m = c.match(/^\+(\d{1,3})/);
    return { cc: m ? `+${m[1]}` : "", cell: "", num: c };
  };
  const parseAddr = (a) => {
    if (!a) return { addr: "", code: "" };
    const m = a.match(/(\d{4,5})\s*$/);
    return m ? { addr: a.slice(0, m.index).trim().replace(/,\s*$/, ""), code: m[1] } : { addr: a, code: "" };
  };
  const ph = parsePhone(phoneNumber);
  const ad = parseAddr(address);

  // Effective required values: profile/Experian first, sign-off fallback second.
  // Postal code comes from the address; country code is derived from the phone
  // number — neither is asked in the sign-off unless it can't be resolved.
  const postalCode     = ad.code || editableFields.postalCode || "";
  const effCountryCode = ph.cc || countryCode || "";

  const idFilled      = !!idNumber.trim();
  const postalFilled  = !!postalCode.trim();
  const countryFilled = !!effCountryCode.trim();
  const phoneFilled   = !!ph.cc && String(phoneNumber).replace(/\D/g, "").length >= 10;
  const initialsDone  = initials.trim().length >= 1;
  const agreedDone    = !!agreedRead;

  // Cover-page prompt only when something the doc shows is still missing.
  const requiredFieldsFilled = !!(firstName.trim() && lastName.trim() && email.trim() && idFilled && postalFilled);

  const sec3Done      = allGroupsValid() && discretionType !== null;
  const signComplete  = initialsDone && idFilled && postalFilled && phoneFilled && agreedDone;
  const isMandateValid = sec3Done && signComplete && firstName.trim() && lastName.trim() && email.trim();

  useEffect(() => { if (onValidChange) onValidChange(isMandateValid); }, [isMandateValid, onValidChange]);

  // Persist mandate state upward (country code reported as the effective value).
  const getMandateData = useCallback(() => ({
    initials, checkedBoxes, discretionType, editableFields,
    countryCode: effCountryCode, agreedRead, agreedMandate: agreedRead,
    savedAt: new Date().toISOString(),
  }), [initials, checkedBoxes, discretionType, editableFields, effCountryCode, agreedRead]);

  useEffect(() => { if (onDataChange) onDataChange(getMandateData()); },
    [initials, checkedBoxes, discretionType, editableFields, effCountryCode, agreedRead]);

  // Freeze which extra required fields the sign-off must collect, computed while
  // the user is still on the initials step (so late-loading profile data counts).
  useEffect(() => {
    if (!discretionType) { setSignExtras(null); return; }
    if (signKey === "initials") {
      const ex = [];
      if (!idFilled)     ex.push("idNumber");
      if (!postalFilled) ex.push("postalCode");
      // Phone is always confirmed in the sign-off: prefilled from the number on
      // record (profile / Experian) so the user can keep it or use another.
      ex.push("phone");
      setSignExtras(ex);
    }
  }, [discretionType, signKey, idFilled, postalFilled]);

  // Ordered slides: initials → missing required fields → agreement.
  const signSeq = ["initials", ...(signExtras || []), "agreement"];
  const goSign = (dir) => {
    const i = signSeq.indexOf(signKey);
    const ni = dir === "back" ? i - 1 : i + 1;
    if (ni >= 0 && ni < signSeq.length) { signDirRef.current = dir; setSignKey(signSeq[ni]); }
  };
  // Keep the active slide valid if the sequence changes underneath it.
  useEffect(() => { if (discretionType && !signSeq.includes(signKey)) setSignKey("initials"); }, [signSeq, signKey, discretionType]);

  // Red severity popup when limited discretion is chosen.
  useEffect(() => { setShowLimitedPopup(discretionType === "limited"); }, [discretionType]);

  // ── Shared styles ────────────────────────────────────────────────────────
  const pg  = { background:"white", padding:"24px", fontSize:"11px", lineHeight:"1.6", fontFamily:"Arial,sans-serif", color:"#222" };
  const h2  = { fontSize:"16px", fontWeight:"bold", margin:"20px 0 10px", textAlign:"center" };
  const h3  = { fontSize:"14px", fontWeight:"bold", margin:"15px 0 10px" };
  const sn  = { fontWeight:"bold" };
  const ind = { marginLeft:"30px", marginBottom:"8px" };
  const p   = { marginBottom:"8px" };
  const itbl= { width:"100%", borderCollapse:"collapse", margin:"15px 0", fontSize:"11px" };
  const itd = { padding:"8px", border:"none", verticalAlign:"top" };
  const itdB= { ...itd, fontWeight:"bold", width:"35%" };
  const inp = { width:"100%", border:"none", borderBottom:"1px solid #333", padding:"2px 0", fontSize:"11px", background:"transparent", color:"#333", outline:"none" };
  const sinp= { ...inp, width:"50px" };
  const einp= { width:"100%", border:"none", borderBottom:"1.5px solid #94a3b8", padding:"3px 4px", fontSize:"11px", background:"#f8fafc", color:"#1e293b", outline:"none", borderRadius:"2px 2px 0 0" };
  const miss= (v) => v && v.trim() ? {} : { borderBottom:"1.5px dashed #ef4444", background:"#fef2f2" };
  const ctbl= { width:"100%", borderCollapse:"collapse", margin:"15px 0", fontSize:"11px", border:"1px solid #333" };
  const cth = { border:"1px solid #333", padding:"6px", textAlign:"left", background:"#f0f0f0", fontWeight:"bold" };
  const ctd = { border:"1px solid #333", padding:"6px", textAlign:"left" };
  const warn= { border:"2px solid #333", padding:"10px", margin:"15px 0", fontSize:"11px", fontWeight:"bold" };

  const isActiveGroup = (gk) => !!(discretionType && gk.startsWith(discretionType === "full" ? "full_" : "lim_"));
  const grpErr = (gk) => ({
    border: showErrors && isActiveGroup(gk) && !isGroupValid(gk) ? "1.5px solid #ef4444" : "1.5px solid transparent",
    borderRadius:"6px", padding:"4px 6px", marginBottom:"2px", transition:"border-color 0.2s ease",
  });
  const cbCon = { display:"flex", alignItems:"center", margin:"8px 0", padding:"5px 0" };
  const cbInp = { width:"16px", height:"16px", marginRight:"10px", cursor:"pointer" };
  const cbLbl = { cursor:"pointer", fontSize:"11px" };

  const renderCb = (id, label) => (
    <div key={id} style={cbCon}>
      <input type="checkbox" id={id} checked={!!checkedBoxes[id]} onChange={() => toggleCheckbox(id)} style={cbInp} />
      <label htmlFor={id} style={cbLbl}>{label}</label>
    </div>
  );

  const getAddendumChecked = useCallback((si, ii) => {
    if (!discretionType) return false;
    const skeys = ["lt","mt","st","rp"];
    return !!checkedBoxes[`${discretionType === "full" ? "full" : "lim"}-${skeys[si]}-${ii}`];
  }, [checkedBoxes, discretionType]);

  const selectDiscretion = (type) => {
    setDiscretionType(type);
    setTimeout(() => {
      const ref = type === "full" ? fullRef : limitedRef;
      if (ref.current) ref.current.scrollIntoView({ behavior:"smooth", block:"nearest" });
    }, 50);
  };

  // ── Document pages ────────────────────────────────────────────────────────

  const renderCoverPage = () => (
    <div style={pg}>
      <div style={{ textAlign:"center", paddingTop:"60px" }}>
        <h1 style={{ fontSize:"24px", marginBottom:"20px", fontWeight:"bold" }}>DISCRETIONARY FSP MANDATE<br />(Mandate)</h1>
        <div style={{ fontSize:"12px", margin:"10px 0" }}>Prepared by MINT PLATFORMS (PTY) LTD,</div>
        <div style={{ fontSize:"12px", margin:"10px 0" }}>in terms of the Financial Advisory and Intermediary Services Act No. 37 of 2002 (FAIS)</div>
        <div style={{ fontSize:"12px", margin:"10px 0" }}>and subsection 5.1 of the Code of Conduct for Discretionary FSPs</div>
        <div style={{ fontSize:"12px", margin:"30px 0 10px" }}>An Authorised Financial Services Provider</div>
        <div style={{ fontSize:"12px" }}><strong>FSP NO 55118</strong></div>
      </div>
      <hr style={{ margin:"40px 0", border:"none", borderTop:"1px solid #ddd" }} />
      <div style={h2}>DISCRETIONARY INVESTMENT MANAGEMENT MANDATE</div>
      <div style={{ ...h3, textAlign:"center" }}>ENTERED INTO BETWEEN</div>
      <div style={{ ...h3, textAlign:"center", marginTop:"20px" }}>MINT PLATFORMS (PTY) LTD</div>
      <div style={{ textAlign:"center", ...p }}>(Registration Number: 2024/644796/07)</div>
      <div style={{ textAlign:"center", ...p }}>An Authorised Financial Services Provider</div>
      <div style={{ textAlign:"center", ...p }}><strong>FSP NO 55118</strong></div>
      <table style={{ ...itbl, marginTop:"20px" }}>
        <tbody>
          <tr><td style={itdB}>Street Address</td><td style={itd}>3 Gwen Lane, Sandown, Sandton, 2031</td></tr>
          <tr><td style={itdB}>Telephone Number</td><td style={itd}>+27 (0) 73 781 3375</td></tr>
          <tr><td style={itdB}>Email Address</td><td style={itd}>info@mintplatforms.co.za</td></tr>
        </tbody>
      </table>
      <div style={{ textAlign:"center", margin:"20px 0" }}>(hereinafter referred to as <strong>MINT Platforms</strong>)</div>
      <div style={{ textAlign:"center", fontWeight:"bold" }}>and</div>

      {!requiredFieldsFilled && (
        <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:"6px", padding:"8px 12px", margin:"10px 0", fontSize:"11px", color:"#dc2626" }}>
          Please complete your profile to auto-fill client details below.
        </div>
      )}

      <table style={{ ...itbl, marginTop:"20px" }}>
        <tbody>
          <tr>
            <td style={itdB}><strong>CLIENT DETAILS:</strong></td>
            <td style={itd}>Surname: {fromProfile(pLast)
              ? <input type="text" style={inp} value={lastName} readOnly />
              : <input type="text" style={{...einp,...miss(lastName)}} value={lastName} onChange={e=>updateEditableField("lastName",e.target.value)} placeholder="Enter surname" />}
            </td>
          </tr>
          <tr><td style={itdB}></td>
            <td style={itd}>First Name/s: {fromProfile(pFirst)
              ? <input type="text" style={inp} value={firstName} readOnly />
              : <input type="text" style={{...einp,...miss(firstName)}} value={firstName} onChange={e=>updateEditableField("firstName",e.target.value)} placeholder="Enter first name(s)" />}
            </td>
          </tr>
          <tr><td style={itdB}>ID Number (or Passport Number)</td>
            <td style={itd}>{fromProfile(pId)
              ? <input type="text" style={inp} value={idNumber} readOnly />
              : <input type="text" style={{...einp,...miss(idNumber)}} value={idNumber} onChange={e=>updateEditableField("idNumber",e.target.value)} placeholder="Enter ID or passport number" />}
            </td>
          </tr>
          <tr><td style={itdB}><strong>OR</strong></td><td style={itd}></td></tr>
          <tr><td style={itdB}>Company/Trust Registration Number</td>
            <td style={itd}><input type="text" style={inp} value={editableFields.companyRegNo||""} onChange={e=>updateEditableField("companyRegNo",e.target.value)} /></td>
          </tr>
          <tr><td style={itdB}>Postal Address</td>
            <td style={itd}>{fromProfile(pAddr)
              ? <input type="text" style={inp} value={ad.addr} readOnly />
              : <input type="text" style={{...einp,...miss(address)}} value={address} onChange={e=>updateEditableField("address",e.target.value)} placeholder="Enter full address" />}
            </td>
          </tr>
          <tr><td style={itdB}></td>
            <td style={itd}>Code: {fromProfile(pAddr) && ad.code
              ? <input type="text" style={{...inp,width:"100px"}} value={postalCode} readOnly />
              : <input type="text" style={{...einp,width:"100px",...miss(postalCode)}} value={editableFields.postalCode||""} onChange={e=>updateEditableField("postalCode",e.target.value)} placeholder="Code" />}
            </td>
          </tr>
          <tr><td style={itdB}>Residential Address</td>
            <td style={itd}>{fromProfile(pAddr)
              ? <input type="text" style={inp} value={address} readOnly />
              : <input type="text" style={einp} value={editableFields.residentialAddress||""} onChange={e=>updateEditableField("residentialAddress",e.target.value)} placeholder="If different from postal" />}
            </td>
          </tr>
          <tr><td style={itdB}></td>
            <td style={itd}><input type="text" style={inp} value={editableFields.residentialAddress2||""} onChange={e=>updateEditableField("residentialAddress2",e.target.value)} /></td>
          </tr>
          <tr><td style={itdB}>Tel Number (H)</td>
            <td style={itd}>Country Code ( <input type="text" style={sinp} value={editableFields.telH_cc||countryCode} onChange={e=>updateEditableField("telH_cc",e.target.value)} /> ) Regional Code ( <input type="text" style={sinp} value={editableFields.telH_rc||""} onChange={e=>updateEditableField("telH_rc",e.target.value)} /> ) <input type="text" style={inp} value={editableFields.telH_num||""} onChange={e=>updateEditableField("telH_num",e.target.value)} /></td>
          </tr>
          <tr><td style={itdB}>Tel Number (W)</td>
            <td style={itd}>Country Code ( <input type="text" style={sinp} value={editableFields.telW_cc||countryCode} onChange={e=>updateEditableField("telW_cc",e.target.value)} /> ) Regional Code ( <input type="text" style={sinp} value={editableFields.telW_rc||""} onChange={e=>updateEditableField("telW_rc",e.target.value)} /> ) <input type="text" style={inp} value={editableFields.telW_num||""} onChange={e=>updateEditableField("telW_num",e.target.value)} /></td>
          </tr>
          <tr><td style={itdB}>Fax Number (Confidential)</td>
            <td style={itd}>Country Code ( <input type="text" style={sinp} value={editableFields.faxConf_cc||""} onChange={e=>updateEditableField("faxConf_cc",e.target.value)} /> ) Regional Code ( <input type="text" style={sinp} value={editableFields.faxConf_rc||""} onChange={e=>updateEditableField("faxConf_rc",e.target.value)} /> ) <input type="text" style={inp} value={editableFields.faxConf_num||""} onChange={e=>updateEditableField("faxConf_num",e.target.value)} /></td>
          </tr>
          <tr><td style={itdB}>Cell Number</td>
            <td style={itd}>{fromProfile(pPhone)
              ? <>Country Code ( <input type="text" style={sinp} value={ph.cc||countryCode} readOnly /> ) Cell Code ( <input type="text" style={sinp} value={ph.cell} readOnly /> ) <input type="text" style={inp} value={ph.num} readOnly /></>
              : <input type="text" style={{...einp,...miss(phoneNumber)}} value={phoneNumber} onChange={e=>updateEditableField("phoneNumber",e.target.value)} placeholder="+27 82 123 4567" />}
            </td>
          </tr>
          <tr><td style={itdB}>Email Address (Confidential)</td>
            <td style={itd}>{fromProfile(pEmail)
              ? <input type="text" style={inp} value={email} readOnly />
              : <input type="text" style={{...einp,...miss(email)}} value={email} onChange={e=>updateEditableField("email",e.target.value)} placeholder="Enter email address" />}
            </td>
          </tr>
          <tr><td style={itdB}>Email Address (Other)</td>
            <td style={itd}><input type="text" style={inp} value={editableFields.emailOther||""} onChange={e=>updateEditableField("emailOther",e.target.value)} /></td>
          </tr>
        </tbody>
      </table>
      <div style={{ textAlign:"center", marginTop:"20px" }}>(hereinafter referred to as the <strong>Client</strong>)</div>
      <InitialsStamp value={initials} />
    </div>
  );

  const renderMainSections = () => (
    <div style={pg}>
      <div style={h3}>1. INTRODUCTION</div>
      <div style={p}><span style={sn}>1.1</span> MINT Platforms warrants that it is the holder of a Category II FSP license number 55118, in accordance with the Financial Advisory and Intermediary Services Act, 2002 (Act No. 37 of 2002), hereafter referred to as FAIS and is authorised to render intermediary services of a discretionary nature in respect of investment products residing under the financial product subcategories indicated in paragraph 1.2 hereunder.</div>
      <div style={p}><span style={sn}>1.2</span> MINT Platforms may, in order to render an intermediary service to the Client, utilise the services of its own staff/approved strategists or that of another approved FSP.</div>
      <div style={p}><span style={sn}>1.3</span> MINT Platforms is authorised to invest in any of the following financial product categories:</div>
      <table style={ctbl}>
        <thead><tr><th colSpan="2" style={cth}>Category I</th><th style={cth}>Advice and Intermediary Services</th></tr></thead>
        <tbody>{[["1.1","Long term Insurance Sub Category A"],["1.3","Long term Insurance Sub Category B1"],["1.4","Long term Insurance Sub Category C"],["1.20","Long term Insurance Sub Category B2"],["1.5","Retail Pension Funds"],["1.7","Pension Fund Benefits"],["1.8","Shares"],["1.9","Money Market"],["1.17","Participatory Interest in a Collective Investment Scheme"],["1.17","Long-term Deposits"],["1.18","Short-term Deposits"],["1.27","Crypto Assets"]].map(([n,nm],i)=>(
          <tr key={i}><td style={ctd}>{n}</td><td style={ctd}>{nm}</td><td style={{...ctd,textAlign:"center"}}>X</td></tr>
        ))}</tbody>
      </table>
      <table style={ctbl}>
        <thead><tr><th colSpan="2" style={cth}>Category II</th><th style={cth}>Intermediary Services</th></tr></thead>
        <tbody>{[["2.5","Shares"],["2.11","Participatory Interest in a Collective Investment Scheme"],["2.13","Long term Deposits"],["2.14","Short term deposits"],["2.21","Crypto Assets"]].map(([n,nm],i)=>(
          <tr key={i}><td style={ctd}>{n}</td><td style={ctd}>{nm}</td><td style={{...ctd,textAlign:"center"}}>X</td></tr>
        ))}</tbody>
      </table>
      <div style={p}><span style={sn}>1.4</span> Prior to entering into this Mandate MINT Platforms obtained from the Client information with regards to the Client's financial circumstances, needs and objectives to enable MINT Platforms to render suitable intermediary services to the Client.</div>
      <InitialsStamp value={initials} />

      <div style={h3}>2. AUTHORISATION</div>
      <div style={p}><span style={sn}>2.1</span> The Client hereby authorises MINT Platforms to manage the Client's investments either with full discretion or limited discretion as set out in the schedule attached to this Mandate.</div>
      <div style={p}><span style={sn}>2.2</span> This Mandate and attached schedules authorise MINT Platforms, as the Client's duly authorised agent, to purchase, sell and enter into any transaction on the Client's behalf in respect of the investments.</div>
      <div style={p}><span style={sn}>2.3</span> MINT Platforms may implement investment instructions or model portfolios that replicate, or mirror investment strategies selected by the Client from approved strategist models.</div>
      <div style={p}><span style={sn}>2.4</span> MINT Platforms may invest in foreign investments on behalf of the Client.</div>

      <div style={h3}>3. INVESTMENT OBJECTIVES</div>
      <div style={p}><span style={sn}>3.1</span> The Client's investment objectives are specified in the schedule attached to this Mandate.</div>
      <div style={p}><span style={sn}>3.2</span> The Client's risk profile is determined considering the Client's current set of information and circumstances and the Client acknowledges that these may change over time.</div>
      <div style={p}><span style={sn}>3.3</span> The Client warrants the on-going accuracy and correctness of the Client's investment objectives and any other information provided to MINT Platforms.</div>

      <div style={h3}>4. RISK DISCLOSURE</div>
      <div style={p}><span style={sn}>4.1</span> MINT Platforms uses its discretion to invest on the Client's behalf with great care and diligence. However, the Client acknowledges that there is a risk associated with investing in the financial products involved. The value of the investments and income may rise as well as fall.</div>
      <div style={p}><span style={sn}>4.2</span> Where the Client selects a strategist model for replication, performance may vary due to timing, execution, liquidity, and cost factors. Past performance is not necessarily indicative of future results. MINT Platforms does not guarantee identical performance or outcomes.</div>
      <div style={p}><span style={sn}>4.3</span> The Client acknowledges the risks pertaining to the investments and accepts such risks. MINT Platforms or its staff will not be liable for any financial losses.</div>
      <div style={p}><span style={sn}>4.4</span> The Client hereby irrevocably indemnifies MINT Platforms and holds it harmless against all claims whatsoever arising from its management of the investments.</div>
      <InitialsStamp value={initials} />
      <div style={p}><span style={sn}>4.5</span> When investing in foreign investment products, risks include: different tax regimes, exchange control measures, and currency fluctuations.</div>
      <div style={p}><span style={sn}>4.6</span> Subject to its discretionary authorisation, MINT Platforms may invest in wrap funds or models on behalf of the Client.</div>
      <div style={p}><span style={sn}>4.7</span> Any jurisdiction restrictions are specified in the schedule attached to this Mandate.</div>
      <InitialsStamp value={initials} />

      <div style={h3}>5. REGISTRATION OF INVESTMENTS</div>
      <div style={p}><span style={sn}>5.1</span> All investments managed by MINT Platforms in terms of this Mandate shall, at MINT Platforms' election, be registered in the name of the Client, a Nominee company, or in the case of a discretionary LISP, the independent custodian.</div>
      <div style={p}><span style={sn}>5.2</span> The Client warrants that all investments entrusted to MINT Platforms are not subject to any lien, charge or other encumbrance.</div>

      <div style={h3}>6. TREATMENT OF FUNDS</div>
      <div style={p}><span style={sn}>6.1</span> MINT Platforms shall not receive funds from the Client for the purpose of managing the investments. The Client will deposit funds directly into the bank account of the investment company or their nominee company (see Annexure A for banking details).</div>
      <div style={p}><span style={sn}>6.2</span> Any income, dividends or other distributions generated will be re-invested for the Client unless otherwise instructed in the Schedule.</div>
      <div style={p}><span style={sn}>6.3</span> No third-party payments will be undertaken by MINT Platforms on behalf of the Client.</div>

      <div style={h3}>7. VOTING ON BEHALF OF CLIENTS</div>
      <div style={p}><span style={sn}>7.1</span> MINT Platforms may vote on behalf of the Client in respect of a ballot conducted by a collective investment scheme in so far as the ballot relates to the investments managed by MINT Platforms on behalf of the Client.</div>
      <InitialsStamp value={initials} />

      <div style={h3}>8. INFORMATION TO BE DISCLOSED BY PRODUCT PROVIDERS</div>
      <div style={p}><span style={sn}>8.1</span> The Client confirms that MINT Platforms shall not be required to provide information other than that which a product provider is required by law to disclose.</div>

      <div style={h3}>9. PROHIBITION AGAINST SELLING OR BUYING CERTAIN INVESTMENTS</div>
      <div style={p}><span style={sn}>9.1</span> MINT Platforms shall not directly or indirectly sell any financial products owned by MINT Platforms to the Client, or buy for its own account any investments owned by the Client.</div>

      <div style={h3}>10. DECLARATION REGARDING FUNDS &amp; INVESTMENTS</div>
      <div style={p}><span style={sn}>10.1</span> The Client warrants that all investments entrusted to MINT Platforms are derived from legitimate sources and do not constitute the proceeds of unlawful activities.</div>

      <div style={h3}>11. REPORTING</div>
      <div style={p}><span style={sn}>11.1</span> MINT Platforms shall furnish the Client with quarterly reports concerning the Client's investments.</div>
      <div style={p}><span style={sn}>11.5</span> Reports will include portfolio holdings, transactions, and where applicable, performance attribution relative to the selected strategist model.</div>
      <InitialsStamp value={initials} />

      <div style={h3}>12. REMUNERATION</div>
      <div style={p}><span style={sn}>12.1</span> In consideration for the management by MINT Platforms of the investments, the Client shall make payment to MINT Platforms an annual management fee of 1.00% based on the market value of the portfolio, calculated at the end of each month.</div>
      <div style={{...p,marginTop:"10px"}}><strong>(a) MINT Platforms Managed Funds</strong></div>
      <div style={ind}>For investments placed into MINT Platforms-managed funds or model portfolios (excluding the OpenStrategies platform), the Client shall pay an annual management fee of 0.99% deducted directly from the investment account.</div>
      <div style={{...p,marginTop:"10px"}}><strong>(b) OpenStrategies Platform</strong></div>
      <div style={ind}>No asset-based management fee will be charged. 70% of profits accrue to the Client, 20–25% to the selected Strategist, and 5–10% are retained by MINT Platforms for platform and oversight services.</div>
      <div style={{...p,marginTop:"10px"}}><strong>(c) Transaction Costs</strong></div>
      <div style={ind}>Brokerage and execution fees are for the Client's account. MINT Platforms may earn a margin on execution costs as disclosed by the executing broker.</div>

      <div style={h3}>13. DISPUTES</div>
      <div style={p}><span style={sn}>13.1</span> Any dispute shall be referred for a decision to arbitration before a single arbitrator in Durban, mutually agreed upon by the parties within 5 days.</div>
      <div style={p}><span style={sn}>13.4</span> The decision of the arbitrator shall be final and binding and not subject to appeal.</div>
      <InitialsStamp value={initials} />

      <div style={h3}>14. TERMINATION OF MANDATE</div>
      <div style={p}><span style={sn}>14.1</span> MINT Platforms or the Client shall be entitled to terminate this Mandate by furnishing not less than sixty (60) calendar days' written notice.</div>
      <div style={p}><span style={sn}>14.4</span> MINT Platforms' appointment shall immediately cease if its status as an authorised financial services provider is finally withdrawn in terms of the FAIS Act.</div>

      <div style={h3}>15. EFFECTIVE DATE</div>
      <div style={p}><span style={sn}>15.1</span> This Agreement will become of force and effect on last date of signature.</div>

      <div style={h3}>16. ADMINISTRATIVE ARRANGEMENTS</div>
      <div style={p}><span style={sn}>16.1</span> The Client shall apply for the investment products on the applicable initial investment application forms.</div>
      <div style={p}><span style={sn}>16.2</span> Any amendment of any provision of this mandate shall be in writing.</div>
      <InitialsStamp value={initials} />
    </div>
  );

  const selectorBtn = (selected) => ({
    flex:1, padding:"14px 12px", fontSize:"12px", fontWeight: selected ? "700" : "500",
    color: selected ? "white" : "#555",
    background: selected ? "hsl(270 50% 50%)" : "#f5f5f5",
    border: selected ? "2px solid hsl(270 50% 45%)" : "2px solid #ddd",
    borderRadius:"10px", cursor:"pointer", transition:"all 0.2s ease", textAlign:"center",
  });

  const renderSchedules = () => (
    <div style={pg}>
      {!discretionType && (
        <div style={{ display:"flex", flexDirection:"column", gap:"16px", marginBottom:"24px" }}>
          <div style={{ fontWeight:"bold", fontSize:"14px", textAlign:"center", color:"hsl(270 30% 30%)", marginBottom:"4px" }}>Select Your Mandate Type</div>
          <button type="button" onClick={() => selectDiscretion("full")} style={{ background:"hsl(270 30% 97%)", border:"2px solid hsl(270 30% 85%)", borderRadius:"12px", padding:"20px", cursor:"pointer", textAlign:"left", transition:"all 0.2s ease" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
              <span style={{ fontWeight:"bold", fontSize:"13px", color:"hsl(270 40% 35%)" }}>SCHEDULE – FULL DISCRETION</span>
              <span style={{ background:"linear-gradient(135deg,#7c3aed,#a855f7)", color:"#fff", fontSize:"9px", fontWeight:"700", padding:"3px 10px", borderRadius:"999px", textTransform:"uppercase" }}>Recommended</span>
            </div>
            <div style={{ fontSize:"11px", color:"#555", lineHeight:"1.6" }}>This schedule delegates authority to MINT Platforms to effect transactions in your name without limitation.</div>
          </button>
          <button type="button" onClick={() => selectDiscretion("limited")} style={{ background:"hsl(270 30% 97%)", border:"2px solid hsl(270 30% 85%)", borderRadius:"12px", padding:"20px", cursor:"pointer", textAlign:"left", transition:"all 0.2s ease" }}>
            <div style={{ fontWeight:"bold", fontSize:"13px", marginBottom:"8px", color:"hsl(270 40% 35%)" }}>SCHEDULE – LIMITED DISCRETION</div>
            <div style={{ fontSize:"11px", color:"#555", lineHeight:"1.6" }}>This schedule delegates limited authority to MINT Platforms to effect transactions in your name.</div>
          </button>
          {showErrors && !discretionType && <div style={{ color:"#ef4444", fontSize:"10px", textAlign:"center" }}>Please select a mandate type to continue</div>}
        </div>
      )}

      {discretionType && (<>
        <div style={{ display:"flex", gap:"8px", marginBottom:"20px" }}>
          <button type="button" style={selectorBtn(discretionType==="full")} onClick={() => selectDiscretion("full")}>
            Full Discretion <span style={{ fontSize:"9px", fontWeight:700, background:discretionType==="full"?"rgba(255,255,255,0.25)":"hsl(270 80% 95%)", color:discretionType==="full"?"#fff":"hsl(270 60% 50%)", borderRadius:"6px", padding:"1px 6px", marginLeft:"6px", textTransform:"uppercase" }}>Recommended</span>
          </button>
          <button type="button" style={selectorBtn(discretionType==="limited")} onClick={() => selectDiscretion("limited")}>Limited Discretion</button>
        </div>

        <div ref={fullRef}>
        {discretionType !== "limited" && <>
          <div style={h2}>SCHEDULE – FULL DISCRETION</div>
          <div style={warn}>This schedule delegates authority to MINT Platforms to effect transactions in your name without limitation. If you wish for transactions to be limited or conditional in any way, this form should not be used. Refer to the limited discretion schedule.</div>
          <div style={p}>I hereby authorise MINT Platforms to manage my investments at its sole and full discretion to achieve my investment objectives as indicated below.</div>
          <div style={{...p,marginTop:"15px"}}>I hereby authorise MINT Platforms to manage my portfolio in respect of:</div>
          <div style={grpErr("full_jurisdiction")}>
            {[{id:"full-local",label:"Local jurisdictions only"},{id:"full-offshore",label:"Off-shore jurisdictions only"},{id:"full-both",label:"Both local and off-shore jurisdictions"}].map(({id,label}) => renderCb(id,label))}
            {showErrors && discretionType==="full" && !isGroupValid("full_jurisdiction") && <div style={{color:"#ef4444",fontSize:"9px",margin:"2px 0 0 26px"}}>Please select at least one option</div>}
          </div>
          <div style={{...p,marginTop:"15px"}}>The Client's investment objectives are specified as follows:</div>
          {[{label:"Long Term (5 years or longer)",key:"full_long_term",pfx:"full-lt"},{label:"Medium Term (2 to 5 years)",key:"full_medium_term",pfx:"full-mt"},{label:"Short Term (3 months to 2 years)",key:"full_short_term",pfx:"full-st"}].map(({label,key,pfx}) => (
            <div key={key}><div style={{fontWeight:"bold",marginTop:"10px",marginBottom:"4px"}}>{label}</div>
            <div style={grpErr(key)}>
              {["Capital Growth","Income Generation"].map((l,i) => renderCb(`${pfx}-${i}`,l))}
              {showErrors && discretionType==="full" && !isGroupValid(key) && <div style={{color:"#ef4444",fontSize:"9px",margin:"2px 0 0 26px"}}>Please select at least one option</div>}
            </div></div>
          ))}
          <div style={{fontWeight:"bold",marginTop:"10px",marginBottom:"4px"}}>Risk Preference*</div>
          <div style={grpErr("full_risk")}>
            {["Very Conservative","Conservative","Moderate","Aggressive","Very Aggressive"].map((l,i) => renderCb(`full-rp-${i}`,l))}
            {showErrors && discretionType==="full" && !isGroupValid("full_risk") && <div style={{color:"#ef4444",fontSize:"9px",margin:"2px 0 0 26px"}}>Please select at least one option</div>}
          </div>
          <InitialsStamp value={initials} />
        </>}
        </div>

        <div ref={limitedRef}>
        {discretionType !== "full" && <>
          <div style={h2}>SCHEDULE – LIMITED DISCRETION</div>
          <div style={warn}>This schedule delegates limited authority to MINT Platforms to effect transactions in your name. If you wish for transactions not to be limited or conditional in any way, refer to the full discretion schedule.</div>
          <div style={p}>I hereby restrict MINT Platforms' discretion. MINT Platforms' right to purchase and sell investments on my behalf may only be exercised by MINT Platforms:</div>
          <div style={grpErr("lim_exercise")}>
            {renderCb("lim-instruction","On my instruction and prior consent")}
            {renderCb("lim-advice","Upon me receiving advice in respect of such investments from MINT Platforms, and to which I have consented")}
            {renderCb("lim-advisor","On the instruction of my investment advisor [MINT Platforms (Pty) Ltd], who is a financial services provider licensed in terms of section 8 of the FAIS Act.")}
            {showErrors && discretionType==="limited" && !isGroupValid("lim_exercise") && <div style={{color:"#ef4444",fontSize:"9px",margin:"2px 0 0 26px"}}>All three options must be selected</div>}
          </div>
          <div style={{...p,marginTop:"15px"}}>I hereby authorise MINT Platforms to manage my portfolio in respect of:</div>
          <div style={grpErr("lim_jurisdiction")}>
            {[{id:"lim-local",label:"Local jurisdictions only"},{id:"lim-offshore",label:"Off-shore jurisdictions only"},{id:"lim-both",label:"Both local and off-shore jurisdictions"}].map(({id,label}) => renderCb(id,label))}
            {showErrors && discretionType==="limited" && !isGroupValid("lim_jurisdiction") && <div style={{color:"#ef4444",fontSize:"9px",margin:"2px 0 0 26px"}}>Please select at least one option</div>}
          </div>
          <div style={{...p,marginTop:"15px"}}>Unless instructed otherwise, all cash accruals received shall be:</div>
          <div style={grpErr("lim_cash")}>
            {[{id:"lim-reinvest",label:"Reinvested as and when they fall due"},{id:"lim-payout",label:"Paid out to the client into the indicated bank account"}].map(({id,label}) => renderCb(id,label))}
            {showErrors && discretionType==="limited" && !isGroupValid("lim_cash") && <div style={{color:"#ef4444",fontSize:"9px",margin:"2px 0 0 26px"}}>Please select at least one option</div>}
          </div>
          <div style={{...p,marginTop:"15px"}}>My investment objectives are specified as follows:</div>
          {[{label:"Long Term (5 years or longer)",key:"lim_long_term",pfx:"lim-lt"},{label:"Medium Term (2 to 5 years)",key:"lim_medium_term",pfx:"lim-mt"},{label:"Short Term (3 months to 2 years)",key:"lim_short_term",pfx:"lim-st"}].map(({label,key,pfx}) => (
            <div key={key}><div style={{fontWeight:"bold",marginTop:"10px",marginBottom:"4px"}}>{label}</div>
            <div style={grpErr(key)}>
              {["Capital Growth","Income Generation"].map((l,i) => renderCb(`${pfx}-${i}`,l))}
              {showErrors && discretionType==="limited" && !isGroupValid(key) && <div style={{color:"#ef4444",fontSize:"9px",margin:"2px 0 0 26px"}}>Please select at least one option</div>}
            </div></div>
          ))}
          <div style={{fontWeight:"bold",marginTop:"10px",marginBottom:"4px"}}>Risk Preference*</div>
          <div style={grpErr("lim_risk")}>
            {["Very Conservative","Conservative","Moderate","Aggressive","Very Aggressive"].map((l,i) => renderCb(`lim-rp-${i}`,l))}
            {showErrors && discretionType==="limited" && !isGroupValid("lim_risk") && <div style={{color:"#ef4444",fontSize:"9px",margin:"2px 0 0 26px"}}>Please select at least one option</div>}
          </div>
          <div style={{marginTop:"15px",fontSize:"10px"}}>* Risk preference may change over time and should be reviewed regularly.</div>
          <InitialsStamp value={initials} />
        </>}
        </div>

        <hr style={{margin:"30px 0",border:"none",borderTop:"2px solid #ccc"}} />
        <button type="button" onClick={() => setAddendumOpen(o => !o)} style={{...purpleLink, display:"inline-flex", alignItems:"center", gap:"6px", fontSize:"13px", textDecoration:"none"}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" style={{transition:"transform 0.3s ease", transform: addendumOpen ? "rotate(90deg)" : "rotate(0deg)"}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span style={{textDecoration:"underline"}}>{addendumOpen ? "Hide the Addendum to Mandate" : "Expand to see the Addendum to Mandate"}</span>
        </button>
        <div style={{ display:"grid", gridTemplateRows: addendumOpen ? "1fr" : "0fr", transition:"grid-template-rows 0.4s ease" }}>
          <div style={{overflow:"hidden"}}>
            <div style={{paddingTop:"16px"}}>
              <div style={h3}>ADDENDUM TO MANDATE</div>
              <div style={p}>Any amendment of any provision of this mandate shall be in writing and shall be by means of a supplementary or new record of advice between the Provider and the Client.</div>
              <div style={{...p,marginTop:"15px"}}>By signing this addendum, I hereby notify MINT Platforms of my change in investment objectives and risk profile.</div>
              <table style={{width:"100%",marginTop:"20px",borderCollapse:"collapse"}}>
                <tbody>
                  {[{header:"Long Term (5 years or longer)",items:["Capital Growth","Income Generation"]},{header:"Medium Term (2 to 5 years)",items:["Capital Growth","Income Generation"]},{header:"Short Term (3 months to 2 years)",items:["Capital Growth","Income Generation"]},{header:"Risk Preference",items:["Very Conservative","Conservative","Moderate","Aggressive","Very Aggressive"]}].map((sec,si) => (
                    <React.Fragment key={si}>
                      <tr style={{background:"#e0e0e0"}}><td colSpan="2" style={{padding:"5px",textAlign:"center",fontWeight:"bold",border:"1px solid #333"}}>{sec.header}</td></tr>
                      {sec.items.map((item,ii) => (
                        <tr key={ii}><td style={{border:"1px solid #333",padding:"5px"}}>{item}</td><td style={{border:"1px solid #333",padding:"5px",width:"30px",textAlign:"center"}}><input type="checkbox" checked={getAddendumChecked(si,ii)} readOnly style={{pointerEvents:"none"}} /></td></tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              <InitialsStamp value={initials} />
            </div>
          </div>
        </div>

        <hr style={{margin:"30px 0",border:"none",borderTop:"2px solid #ccc"}} />
        <button type="button" onClick={() => setAnnexureOpen(o => !o)} style={{...purpleLink, display:"inline-flex", alignItems:"center", gap:"6px", fontSize:"13px", textDecoration:"none"}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" style={{transition:"transform 0.3s ease", transform: annexureOpen ? "rotate(90deg)" : "rotate(0deg)"}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          <span style={{textDecoration:"underline"}}>{annexureOpen ? "Hide Annexure A (Bank account details)" : "Expand to see Annexure A (Bank account details)"}</span>
        </button>
        <div style={{ display:"grid", gridTemplateRows: annexureOpen ? "1fr" : "0fr", transition:"grid-template-rows 0.4s ease" }}>
          <div style={{overflow:"hidden"}}>
            <div style={{paddingTop:"16px"}}>
              <div style={h3}>Bank account details</div>
              <div style={p}>This account is the MINT Platforms Client Account. You are required to pay your funds into this account and MINT Platforms will execute transaction/s to invest these funds in Securities which will constitute your Portfolio in accordance with this Mandate.</div>
              <div style={{fontWeight:"bold",marginTop:"20px"}}>Local Bank Account</div>
              <table style={{...itbl,marginTop:"15px"}}>
                <tbody>
                  <tr><td style={itdB}>Name of account</td><td style={itd}>TBA</td></tr>
                  <tr><td style={itdB}>Bank</td><td style={itd}>TBA</td></tr>
                  <tr><td style={itdB}>Type of account</td><td style={itd}>Business Current Account</td></tr>
                  <tr><td style={itdB}>Account number</td><td style={itd}>000 000 000</td></tr>
                  <tr><td style={itdB}>Branch opened</td><td style={itd}>TBA</td></tr>
                  <tr><td style={itdB}>Branch code</td><td style={itd}>000000</td></tr>
                </tbody>
              </table>
              <InitialsStamp value={initials} />
            </div>
          </div>
        </div>
      </>)}
    </div>
  );

  // ── Shared accordion/circle styles ───────────────────────────────────────
  const accHdr = { width:"100%", display:"flex", alignItems:"center", gap:"12px", padding:"18px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" };
  const circle  = (done) => ({ width:"28px", height:"28px", borderRadius:"50%", background: done ? "#22c55e" : "hsl(270 30% 25%)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 });
  const tick    = <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="14" height="14"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>;
  const chevron = (open) => <svg viewBox="0 0 24 24" fill="none" stroke="hsl(270 20% 55%)" strokeWidth="2" width="18" height="18" style={{flexShrink:0,transition:"transform 0.4s ease",transform:open?"rotate(180deg)":"rotate(0deg)"}}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6"/></svg>;

  const purpleLink = { color:"hsl(270 60% 52%)", fontWeight:"600", textDecoration:"underline", background:"none", border:"none", padding:"0 1px", cursor:"pointer", fontSize:"inherit", display:"inline" };

  const nextBtn = (enabled, onClick) => (
    <button type="button" onClick={onClick} disabled={!enabled}
      style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"8px 16px", fontSize:"12px", fontWeight:"600", color:"white", background: enabled ? "hsl(270 55% 52%)" : "hsl(270 15% 82%)", border:"none", borderRadius:"9px", cursor: enabled ? "pointer" : "not-allowed", transition:"background 0.2s ease" }}>
      Next
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
    </button>
  );
  const backBtn = (onClick) => (
    <button type="button" onClick={onClick}
      style={{ display:"inline-flex", alignItems:"center", gap:"4px", background:"none", border:"none", color:"hsl(270 30% 55%)", fontSize:"11px", fontWeight:"600", cursor:"pointer", padding:"0" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Back
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>

      {/* ── Limited discretion severity popup (fixed, top of screen) ── */}
      {showLimitedPopup && discretionType === "limited" && (
        <div style={{ position:"fixed", top:"16px", left:"50%", transform:"translate(-50%,0)", zIndex:1200, width:"calc(100% - 32px)", maxWidth:"540px", background:"hsl(0 74% 48%)", color:"white", borderRadius:"12px", padding:"14px 16px", boxShadow:"0 12px 34px rgba(180,0,0,0.4)", display:"flex", alignItems:"flex-start", gap:"12px", animation:"mintDropIn 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" width="20" height="20" style={{flexShrink:0,marginTop:"1px"}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          <div style={{flex:1, fontSize:"13px", lineHeight:"1.5", fontWeight:"600"}}>
            Important: with limited discretion you will <u>not</u> be able to trade or interact with our strategies.
          </div>
          <button type="button" onClick={() => setShowLimitedPopup(false)} aria-label="Dismiss" style={{ background:"none", border:"none", color:"white", cursor:"pointer", fontSize:"20px", lineHeight:"1", padding:"0 2px", opacity:0.9 }}>×</button>
        </div>
      )}

      {/* ── Document viewer overlay ── */}
      {docViewer && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"white", zIndex:1000, overflowY:"auto", animation:"mintSlideUp 0.28s ease" }}>
          <div style={{ position:"sticky", top:0, background:"white", zIndex:10, borderBottom:"1px solid hsl(270 20% 90%)", padding:"12px 20px", display:"flex", alignItems:"center", gap:"12px", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
            <button type="button" onClick={() => setDocViewer(null)} style={{ display:"flex", alignItems:"center", gap:"6px", background:"hsl(270 30% 97%)", border:"1px solid hsl(270 20% 88%)", borderRadius:"8px", padding:"8px 14px", cursor:"pointer", color:"hsl(270 40% 35%)", fontWeight:"600", fontSize:"13px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back
            </button>
            <span style={{ fontSize:"14px", fontWeight:"600", color:"hsl(270 30% 25%)" }}>
              {docViewer === "mandate" ? "Discretionary FSP Mandate" : "Introduction & Terms"}
            </span>
          </div>
          <div style={{ maxWidth:"820px", margin:"0 auto" }}>
            {docViewer === "mandate" ? renderCoverPage() : renderMainSections()}
          </div>
        </div>
      )}

      {/* ── Intro description ── */}
      <div style={{ background:"hsl(270 30% 97%)", border:"1px solid hsl(270 20% 90%)", borderRadius:"16px", padding:"20px 24px", fontSize:"13px", lineHeight:"1.8", color:"hsl(270 15% 28%)" }}>
        <p style={{ margin:"0 0 10px 0" }}>
          This schedule delegates authority to <strong>MINT Platforms</strong> to effect transactions in your name without limitation.
          If you wish for transactions to be entered into on your behalf to be limited or conditional in any way, this form should not be used.
          Refer to the limited discretion schedule.
        </p>
        <p style={{ margin:0 }}>
          In signing you also agree to the{" "}
          <button type="button" onClick={() => setDocViewer("mandate")} style={purpleLink}>Discretionary FSP Mandate</button>
          {" "}and the{" "}
          <button type="button" onClick={() => setDocViewer("terms")} style={purpleLink}>Introduction &amp; Terms</button>
          {" "}documents.
        </p>
      </div>

      {/* ── Schedules & Annexures accordion ── */}
      <div ref={sec3HeaderRef} style={{ background:"white", borderRadius:"16px", border:"1px solid hsl(270 20% 90%)", boxShadow:"0 2px 12px rgba(100,60,140,0.06)", overflow:"hidden" }}>
        <button type="button" onClick={() => { manualOverrideRef.current = true; setSec3Open(o => !o); setShowErrors(true); setTimeout(() => { manualOverrideRef.current = false; }, 1200); }} style={accHdr}>
          <div style={circle(sec3Done)}>{sec3Done ? tick : <span style={{color:"white",fontSize:"12px",fontWeight:"600"}}>1</span>}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:"14px",fontWeight:"600",color:"hsl(270 30% 25%)"}}>Schedules &amp; Annexures</div>
            <div style={{fontSize:"12px",color:"hsl(270 15% 60%)"}}>Complete your investment preferences</div>
          </div>
          {chevron(sec3Open)}
        </button>
        <div style={{ display:"grid", gridTemplateRows: sec3Open ? "1fr" : "0fr", transition:"grid-template-rows 0.4s ease", borderTop: sec3Open ? "1px solid hsl(270 20% 92%)" : "none" }}>
          <div style={{overflow:"hidden"}}>{renderSchedules()}</div>
        </div>
      </div>

      {/* ── Sign-off (appears once a discretion type is chosen) — one step at a time ── */}
      {discretionType && (
        <div style={{ background:"white", borderRadius:"16px", border: signComplete ? "1px solid #86efac" : "1px solid hsl(270 20% 90%)", boxShadow:"0 2px 12px rgba(100,60,140,0.06)", padding:"18px 20px", transition:"border-color 0.3s ease", overflow:"hidden" }}>
          {/* header: title + progress dots */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
              <div style={{...circle(signComplete), width:"24px", height:"24px"}}>{signComplete ? tick : <span style={{color:"white",fontSize:"11px",fontWeight:"700"}}>{Math.max(1, signSeq.indexOf(signKey) + 1)}</span>}</div>
              <span style={{fontSize:"13px",fontWeight:"600",color:"hsl(270 30% 25%)"}}>Sign Off</span>
            </div>
            <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
              {signSeq.map((k, i) => {
                const active = k === signKey;
                const done = signComplete || i < signSeq.indexOf(signKey);
                return <span key={k} style={{ height:"6px", borderRadius:"3px", width: active ? "20px" : "6px", background: done ? "#22c55e" : active ? "hsl(270 60% 55%)" : "hsl(270 20% 88%)", transition:"all 0.3s ease" }} />;
              })}
            </div>
          </div>

          {/* swipe viewport — one field at a time */}
          <div style={{minHeight:"104px"}}>
            <div key={signKey} style={{ animation: `${signDirRef.current === "back" ? "mintSwipeL" : "mintSwipeR"} 0.35s cubic-bezier(0.22,1,0.36,1)` }}>

              {signKey === "initials" && (
                <div>
                  <div style={{fontSize:"12px",fontWeight:"600",color:"hsl(270 25% 35%)",marginBottom:"8px"}}>Enter your initials</div>
                  <input
                    type="text" value={initials} autoFocus
                    onChange={e => setInitials(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter" && initialsDone) goSign("fwd"); }}
                    maxLength={5} placeholder="MM"
                    style={{ width:"88px", padding:"9px 12px", fontSize:"16px", fontWeight:"700", letterSpacing:"5px", textTransform:"uppercase", textAlign:"center", border: showErrors && !initials.trim() ? "2px solid #ef4444" : "2px solid hsl(270 20% 82%)", borderRadius:"10px", outline:"none", background:"hsl(270 30% 98%)", color:"hsl(270 30% 20%)", transition:"border-color 0.2s ease" }}
                  />
                  <p style={{fontSize:"10.5px",color:"hsl(270 15% 60%)",margin:"8px 0 0"}}>These appear on every page of your mandate.</p>
                  <div style={{display:"flex",justifyContent:"flex-end",marginTop:"6px"}}>
                    {nextBtn(initialsDone, () => goSign("fwd"))}
                  </div>
                </div>
              )}

              {signKey === "idNumber" && (
                <div>
                  {backBtn(() => goSign("back"))}
                  <div style={{fontSize:"12px",fontWeight:"600",color:"hsl(270 25% 35%)",margin:"8px 0"}}>Enter your ID / passport number</div>
                  <input
                    type="text" value={idNumber} autoFocus
                    onChange={e => updateEditableField("idNumber", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && idFilled) goSign("fwd"); }}
                    placeholder="e.g. 9001015800087"
                    style={{ width:"100%", maxWidth:"280px", padding:"9px 12px", fontSize:"14px", fontWeight:"600", border:"2px solid hsl(270 20% 82%)", borderRadius:"10px", outline:"none", background:"hsl(270 30% 98%)", color:"hsl(270 30% 20%)", transition:"border-color 0.2s ease" }}
                  />
                  <p style={{fontSize:"10.5px",color:"hsl(270 15% 60%)",margin:"8px 0 0"}}>Required — this populates your mandate document.</p>
                  <div style={{display:"flex",justifyContent:"flex-end",marginTop:"6px"}}>
                    {nextBtn(idFilled, () => goSign("fwd"))}
                  </div>
                </div>
              )}

              {signKey === "postalCode" && (
                <div>
                  {backBtn(() => goSign("back"))}
                  <div style={{fontSize:"12px",fontWeight:"600",color:"hsl(270 25% 35%)",margin:"8px 0"}}>Enter your postal code</div>
                  <input
                    type="text" value={editableFields.postalCode || ""} autoFocus
                    onChange={e => updateEditableField("postalCode", e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => { if (e.key === "Enter" && postalFilled) goSign("fwd"); }}
                    maxLength={5} placeholder="0000"
                    style={{ width:"110px", padding:"9px 12px", fontSize:"15px", fontWeight:"600", letterSpacing:"2px", border:"2px solid hsl(270 20% 82%)", borderRadius:"10px", outline:"none", background:"hsl(270 30% 98%)", color:"hsl(270 30% 20%)", transition:"border-color 0.2s ease" }}
                  />
                  <p style={{fontSize:"10.5px",color:"hsl(270 15% 60%)",margin:"8px 0 0"}}>Required — this populates your mandate document.</p>
                  <div style={{display:"flex",justifyContent:"flex-end",marginTop:"6px"}}>
                    {nextBtn(postalFilled, () => goSign("fwd"))}
                  </div>
                </div>
              )}

              {signKey === "phone" && (() => {
                // Prefill from the number on record (profile / Experian) until the
                // user edits it. Confirming as-is keeps the saved bureau number.
                const edited = editableFields.phoneLocal !== undefined;
                const localDisplay = edited ? editableFields.phoneLocal : (ph.cell + ph.num);
                const ccDisplay = countryCode || ph.cc || "+27";
                const onRecord = !edited && (ph.cell + ph.num).length >= 7;
                return (
                  <div>
                    {backBtn(() => goSign("back"))}
                    <div style={{fontSize:"12px",fontWeight:"600",color:"hsl(270 25% 35%)",margin:"8px 0"}}>{onRecord ? "Is this the number you'd like to use?" : "Enter your contact number"}</div>
                    <div style={{display:"flex",gap:"8px",alignItems:"center",maxWidth:"320px"}}>
                      <select value={ccDisplay} onChange={e => updatePhone(e.target.value, localDisplay)}
                        style={{ padding:"9px 8px", fontSize:"13px", border:"2px solid hsl(270 20% 82%)", borderRadius:"10px", outline:"none", background:"hsl(270 30% 98%)", color:"hsl(270 30% 20%)", cursor:"pointer", width:"104px" }}>
                        {COUNTRY_CODES.map(({code,flag}) => <option key={code} value={code}>{flag} {code}</option>)}
                      </select>
                      <input
                        type="tel" value={localDisplay}
                        onChange={e => updatePhone(ccDisplay, e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && phoneFilled) goSign("fwd"); }}
                        placeholder="82 123 4567"
                        style={{ flex:1, padding:"9px 12px", fontSize:"14px", fontWeight:"600", border:"2px solid hsl(270 20% 82%)", borderRadius:"10px", outline:"none", background:"hsl(270 30% 98%)", color:"hsl(270 30% 20%)", transition:"border-color 0.2s ease" }}
                      />
                    </div>
                    <p style={{fontSize:"10.5px",color:"hsl(270 15% 60%)",margin:"8px 0 0"}}>{onRecord ? "This is the number we have on record. Keep it, or type a different one to use instead." : "We couldn't find a number on record — please add one."}</p>
                    <div style={{display:"flex",justifyContent:"flex-end",marginTop:"6px"}}>
                      {nextBtn(phoneFilled, () => goSign("fwd"))}
                    </div>
                  </div>
                );
              })()}

              {signKey === "agreement" && (
                <div>
                  {backBtn(() => goSign("back"))}
                  <div style={{fontSize:"12px",fontWeight:"600",color:"hsl(270 25% 35%)",margin:"8px 0"}}>Confirm your agreement</div>
                  <label style={{ display:"flex", alignItems:"flex-start", gap:"10px", cursor:"pointer", padding:"12px 14px", background: agreedRead ? "hsl(143 50% 97%)" : "hsl(270 30% 98%)", border: agreedRead ? "2px solid #86efac" : "2px solid hsl(270 20% 88%)", borderRadius:"12px", transition:"all 0.25s ease" }}>
                    <input type="checkbox" checked={agreedRead} onChange={e => setAgreedRead(e.target.checked)} style={{width:"17px",height:"17px",marginTop:"1px",cursor:"pointer",accentColor:"hsl(270 60% 50%)",flexShrink:0}} />
                    <span style={{fontSize:"11.5px",lineHeight:"1.6",color:"hsl(270 15% 28%)"}}>
                      I have read and agree to the <strong>MINT Platforms</strong> Discretionary FSP Mandate, the Introduction &amp; Terms, and all attached Schedules and Annexures. I confirm the information I have provided is true and accurate.
                    </span>
                  </label>
                  {signComplete && (
                    <div style={{display:"flex",alignItems:"center",gap:"6px",color:"#16a34a",fontSize:"11.5px",fontWeight:"600",marginTop:"10px"}}>
                      {tick} All set — you can continue below.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes mintSlideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes mintSwipeR{from{transform:translateX(22px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes mintSwipeL{from{transform:translateX(-22px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes mintDropIn{from{transform:translate(-50%,-24px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
      `}</style>
    </div>
  );
};

export default MandateViewer;
