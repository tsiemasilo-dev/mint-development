// Generates "MINT - APP STORE.pdf" — a detailed, plain-English App Store readiness & launch guide.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";

// ---------- Mint theme ----------
const NAVY = [15, 10, 30];        // #0f0a1e
const NAVY2 = [26, 18, 48];       // panel navy
const VIOLET = [124, 58, 237];    // #7c3aed
const VIOLET2 = [168, 85, 247];   // #a855f7
const WHITE = [255, 255, 255];
const INK = [30, 27, 45];         // body text
const GRAY = [110, 110, 125];
const LIGHT = [245, 243, 250];
const GREEN = [22, 163, 74];
const RED = [220, 38, 38];
const AMBER = [217, 119, 6];

const doc = new jsPDF({ unit: "pt", format: "a4" });
const PW = doc.internal.pageSize.getWidth();   // ~595
const PH = doc.internal.pageSize.getHeight();  // ~842
const MX = 48;                                  // margin x
const CW = PW - MX * 2;                          // content width
let y = 0;
let pageNo = 0;

const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2]);

function footer() {
  if (pageNo === 0) return;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(GRAY);
  doc.text("MINT Investment Platform", MX, PH - 24);
  doc.text("App Store Readiness & Launch Guide", PW / 2, PH - 24, { align: "center" });
  doc.text(`Page ${pageNo}`, PW - MX, PH - 24, { align: "right" });
  setDraw([225, 222, 235]);
  doc.setLineWidth(0.5);
  doc.line(MX, PH - 34, PW - MX, PH - 34);
}

function newPage() {
  footer();
  doc.addPage();
  pageNo += 1;
  y = 56;
}

function ensure(space) {
  if (y + space > PH - 56) newPage();
}

// Small Mint logo mark (two stacked chevrons) + wordmark
function drawLogo(x, cy, scale = 1, light = true) {
  const col = light ? WHITE : VIOLET;
  setFill(col);
  const s = 10 * scale;
  // chevron 1
  doc.triangle(x, cy, x + s, cy - s * 0.6, x + s, cy + s * 0.2, "F");
  doc.triangle(x + s, cy - s * 0.6, x + s * 2, cy, x + s, cy + s * 0.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20 * scale);
  setText(col);
  doc.text("MINT", x + s * 2 + 8 * scale, cy + 6 * scale);
}

// ---------- Cover ----------
function cover() {
  pageNo = 1;
  setFill(NAVY);
  doc.rect(0, 0, PW, PH, "F");
  // gradient-ish accent bands
  setFill(VIOLET);
  doc.rect(0, 250, PW, 4, "F");
  setFill(VIOLET2);
  doc.rect(0, 258, PW * 0.45, 2, "F");

  drawLogo(MX, 90, 1.2, true);

  doc.setFont("helvetica", "bold");
  setText(WHITE);
  doc.setFontSize(40);
  doc.text("APP STORE", MX, 200);
  doc.setFontSize(40);
  setText(VIOLET2);
  doc.text("Readiness & Launch Guide", MX, 245);

  doc.setFont("helvetica", "normal");
  setText([200, 196, 215]);
  doc.setFontSize(13);
  const intro =
    "A complete, plain-English walkthrough of everything Mint needs to turn this web app " +
    "into a real iPhone app and get it approved on the Apple App Store. Written so anyone " +
    "can follow it - what we have, what we are missing, and the exact steps to launch.";
  doc.text(doc.splitTextToSize(intro, CW * 0.92), MX, 300);

  // info panel
  setFill(NAVY2);
  doc.roundedRect(MX, 470, CW, 150, 10, 10, "F");
  setText([180, 176, 200]);
  doc.setFontSize(10);
  const rows = [
    ["Document", "Mint - App Store Readiness & Launch Guide"],
    ["App name", "Mint  (Bundle ID: com.algohive.mint.app)"],
    ["App version", "1.0.0"],
    ["Platform", "iOS (Apple App Store) - built with Capacitor"],
    ["Prepared", "June 2026"],
    ["Audience", "Mint team - non-technical friendly"],
  ];
  let ry = 498;
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    setText(VIOLET2);
    doc.text(k, MX + 20, ry);
    doc.setFont("helvetica", "normal");
    setText([220, 217, 232]);
    doc.text(v, MX + 150, ry);
    ry += 21;
  });

  doc.setFont("helvetica", "normal");
  setText([120, 116, 140]);
  doc.setFontSize(9);
  doc.text("Confidential - internal planning document", MX, PH - 40);
}

// ---------- Building blocks ----------
function sectionHeader(num, title) {
  ensure(70);
  setFill(NAVY);
  doc.roundedRect(MX, y, CW, 40, 6, 6, "F");
  setFill(VIOLET);
  doc.roundedRect(MX, y, 6, 40, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setText(WHITE);
  doc.text(`${num}.  ${title}`, MX + 20, y + 26);
  y += 56;
}

function subHeader(title) {
  ensure(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setText(VIOLET);
  doc.text(title, MX, y + 6);
  y += 22;
}

function para(text, opts = {}) {
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(opts.size || 10.5);
  setText(opts.color || INK);
  const lines = doc.splitTextToSize(text, CW);
  lines.forEach((ln) => {
    ensure(16);
    doc.text(ln, MX, y);
    y += 15;
  });
  y += 5;
}

function bullet(text, opts = {}) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const lines = doc.splitTextToSize(text, CW - 22);
  lines.forEach((ln, i) => {
    ensure(15);
    if (i === 0) {
      setFill(opts.dot || VIOLET);
      doc.circle(MX + 4, y - 3.5, 2.2, "F");
    }
    setText(opts.color || INK);
    doc.text(ln, MX + 16, y);
    y += 14.5;
  });
  y += 2;
}

// status item with colored badge: status = 'have' | 'missing' | 'partial'
function statusItem(status, label, detail) {
  const map = {
    have: { c: GREEN, t: "HAVE" },
    missing: { c: RED, t: "MISSING" },
    partial: { c: AMBER, t: "PARTIAL" },
  };
  const m = map[status];
  ensure(34);
  // badge
  setFill(m.c);
  doc.roundedRect(MX, y - 9, 58, 15, 7, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(WHITE);
  doc.text(m.t, MX + 29, y + 1, { align: "center" });
  // label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setText(INK);
  doc.text(label, MX + 70, y + 1);
  y += 16;
  // detail
  if (detail) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.8);
    setText(GRAY);
    const lines = doc.splitTextToSize(detail, CW - 70);
    lines.forEach((ln) => {
      ensure(14);
      doc.text(ln, MX + 70, y);
      y += 13;
    });
  }
  y += 8;
}

function calloutBox(title, text, color) {
  const lines = doc.splitTextToSize(text, CW - 32);
  const h = 30 + lines.length * 14;
  ensure(h + 8);
  setFill(LIGHT);
  doc.roundedRect(MX, y, CW, h, 8, 8, "F");
  setFill(color);
  doc.roundedRect(MX, y, 5, h, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setText(color);
  doc.text(title, MX + 16, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(INK);
  let ty = y + 36;
  lines.forEach((ln) => {
    doc.text(ln, MX + 16, ty);
    ty += 14;
  });
  y += h + 14;
}

function stepRow(n, title, text) {
  ensure(46);
  setFill(VIOLET);
  doc.circle(MX + 12, y + 4, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(WHITE);
  doc.text(String(n), MX + 12, y + 8, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(INK);
  doc.text(title, MX + 34, y + 2);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText([70, 67, 85]);
  const lines = doc.splitTextToSize(text, CW - 34);
  lines.forEach((ln) => {
    ensure(14);
    doc.text(ln, MX + 34, y);
    y += 14;
  });
  y += 10;
}

function table(head, body, widths) {
  ensure(60);
  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    margin: { left: MX, right: MX },
    styles: { font: "helvetica", fontSize: 9.2, cellPadding: 6, textColor: INK, lineColor: [225, 222, 235], lineWidth: 0.5 },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 9.5 },
    alternateRowStyles: { fillColor: [248, 246, 252] },
    columnStyles: widths || {},
    didDrawPage: () => {},
  });
  y = doc.lastAutoTable.finalY + 16;
}

// =====================================================================
// BUILD
// =====================================================================
cover();
newPage();

// ---- Table of contents ----
sectionHeader("", "What's inside this guide");
y -= 14;
const toc = [
  "1.  The big picture - what we're doing in one minute",
  "2.  Plain-English dictionary (no jargon left behind)",
  "3.  What we ALREADY have",
  "4.  What we're MISSING (the rejection blockers)",
  "5.  Detailed breakdown - every requirement explained",
  "6.  Accounts, tools & money you need first",
  "7.  How a mobile app is built from this web app",
  "8.  Step-by-step: building the iPhone app",
  "9.  Step-by-step: submitting to the App Store",
  "10. The App Store listing checklist",
  "11. Money & finance app rules (important for Mint)",
  "12. Full readiness checklist (one-page summary)",
  "13. Recommended order of work",
];
toc.forEach((t) => bullet(t));

// ---- 1 big picture ----
newPage();
sectionHeader(1, "The big picture - what we're doing");
para(
  "Right now, Mint is a website (a web app). It runs in a browser. The goal is to wrap that same " +
  "web app inside a real iPhone app and publish it on the Apple App Store so people can download " +
  "it like any other app."
);
para(
  "The good news: we are NOT starting from scratch. Mint already uses a tool called Capacitor, which " +
  "takes our existing website and puts it inside a native iPhone (and Android) shell. So most of the " +
  "heavy lifting is done. What's left is fixing a handful of things Apple insists on, deploying our " +
  "backend to a permanent home, and going through Apple's submission process."
);
calloutBox(
  "In one sentence",
  "We take the Mint web app, package it as an iPhone app with Capacitor, fix 4 things Apple will " +
  "otherwise reject us for, then submit it through Apple's review - which usually takes 1 to 3 days.",
  VIOLET
);
subHeader("How an app gets onto the App Store (the journey)");
para(
  "1) Build the app on a Mac  ->  2) Sign it with Apple certificates  ->  3) Upload it to Apple  ->  " +
  "4) Fill in the store listing (screenshots, description, privacy)  ->  5) Apple reviews it  ->  " +
  "6) It goes live. This guide walks through every one of these steps."
);

// ---- 2 dictionary ----
newPage();
sectionHeader(2, "Plain-English dictionary");
para("Whenever a word in this guide sounds technical, look it up here first.");
table(
  ["Term", "What it actually means"],
  [
    ["Web app", "Our current Mint - a website that runs in a browser."],
    ["Native app", "A real app installed on the phone, downloaded from the App Store."],
    ["Capacitor", "The tool that wraps our website into a native iPhone/Android app. Already set up in Mint."],
    ["Xcode", "Apple's free program (Mac only) used to build and upload iPhone apps."],
    ["Mac", "An Apple computer. Required - you cannot build an iPhone app on Windows or Linux."],
    ["Apple Developer Program", "The paid Apple membership ($99/year) that lets you publish apps."],
    ["App Store Connect", "Apple's website where you manage your app listing, screenshots and submit for review."],
    ["Bundle ID", "Your app's unique name in Apple's system. Mint's is com.algohive.mint.app."],
    ["Certificate / Provisioning", "Digital ID cards from Apple that prove the app is really from you."],
    ["Info.plist", "A settings file inside the iPhone app. It holds permission messages and config."],
    ["Permission string", "The sentence shown when the app asks to use the camera, Face ID, etc."],
    ["Backend", "The server side of Mint - the part that talks to the database and other services."],
    ["HTTPS", "A secure (encrypted) web address starting with https://. Apple requires it."],
    ["KYC", "'Know Your Customer' - the identity check users do during onboarding (Sumsub)."],
    ["TestFlight", "Apple's tool for sending the app to testers before it goes public."],
  ],
  { 0: { cellWidth: 130, fontStyle: "bold" } }
);

// ---- 3 what we have ----
newPage();
sectionHeader(3, "What we ALREADY have");
para("Good foundations are in place. Here is what's confirmed working in the project today:");
statusItem("have", "Capacitor is installed and set up", "The core tool plus the iOS and Android projects already exist in the codebase (ios/ and android/ folders).");
statusItem("have", "iPhone project structure", "ios/App contains the Xcode project, app delegate, launch screen and asset folders - ready to open on a Mac.");
statusItem("have", "Face ID permission message", "Info.plist already has NSFaceIDUsageDescription: 'Enable biometrics to securely sign in to Mint.'");
statusItem("have", "Native biometrics & haptics", "Plugins installed: @capgo/capacitor-native-biometric (Face ID / fingerprint) and @capacitor/haptics (vibration feedback).");
statusItem("have", "App icon (1024x1024)", "A high-resolution app icon is present in the iOS asset catalog.");
statusItem("have", "Splash / launch screens", "Light and dark launch images exist for all required sizes.");
statusItem("have", "App identity set", "App name 'Mint' and Bundle ID 'com.algohive.mint.app' are configured.");
statusItem("have", "Compliant payment model", "Mint moves real money (investments, deposits, credit). These are EXEMPT from Apple's In-App Purchase fees - no IAP needed.");
statusItem("have", "Email/password + OTP login", "Because there is no Google/Facebook login, Apple does NOT force us to add 'Sign in with Apple'.");

// ---- 4 missing ----
newPage();
sectionHeader(4, "What we're MISSING - the rejection blockers");
para(
  "These are the items Apple will reject the app for if they are not fixed. There are four. " +
  "Each one on its own is enough to get a rejection, so all four must be done before submitting."
);
statusItem("missing", "1) The app loads a temporary dev website", "capacitor.config.json points to a temporary Replit dev link with 'cleartext' (insecure) turned on. The app must instead run its own built-in code and talk to a permanent, secure HTTPS backend. A thin app that just opens a remote website can also be rejected for 'not enough functionality'.");
statusItem("missing", "2) No 'Delete Account' feature", "Apple REQUIRES any app with sign-up to let users delete their account from inside the app. Mint currently has no delete-account flow anywhere. This is an automatic rejection.");
statusItem("missing", "3) Camera & microphone permission messages", "KYC (Sumsub) and bank linking (TruID) use the camera and microphone to scan IDs and faces. Info.plist is missing NSCameraUsageDescription and NSMicrophoneUsageDescription. Without them the app CRASHES when KYC opens - guaranteed rejection.");
statusItem("missing", "4) Privacy Policy & Terms not wired up", "The in-app Legal page shows 'Privacy Policy / Terms / Cookie' buttons, but they have no action and no content behind them. Apple needs a working, publicly reachable Privacy Policy - both as a web link and inside the app.");
calloutBox(
  "Bottom line",
  "Fix these four, deploy the backend to a permanent HTTPS address, and the app is technically ready " +
  "to submit. Everything else is Apple paperwork and the store listing.",
  RED
);

// ---- 5 detailed breakdown ----
newPage();
sectionHeader(5, "Detailed breakdown - every requirement explained");

subHeader("5.1  Fix the app configuration (capacitor.config.json)");
para(
  "Today the app is told to load a temporary web address. For a real release we change it so the app " +
  "carries its own built code (the 'dist' folder) and only calls our backend for data. We also remove " +
  "the 'cleartext' setting, because Apple requires secure HTTPS connections only."
);
bullet("Remove the temporary 'server.url' that points to the Replit dev link.");
bullet("Remove 'cleartext: true' (insecure traffic is not allowed by Apple).");
bullet("Make sure the app's data calls go to a permanent production domain over HTTPS.");

subHeader("5.2  Add the missing permission messages");
para(
  "iPhones make apps explain WHY they need the camera, microphone, etc. These are short sentences shown " +
  "in a popup. We already have the Face ID one; we need to add two more:"
);
table(
  ["Permission", "Why Mint needs it", "Status"],
  [
    ["NSFaceIDUsageDescription", "Biometric login (Face ID)", "Already added"],
    ["NSCameraUsageDescription", "Scan ID documents & face during KYC (Sumsub) and bank linking", "Must add"],
    ["NSMicrophoneUsageDescription", "Liveness/voice check during KYC verification", "Must add"],
  ],
  { 0: { cellWidth: 165, fontStyle: "bold" }, 2: { cellWidth: 80 } }
);

subHeader("5.3  Build the 'Delete Account' feature");
para(
  "Users must be able to permanently delete their account from inside the app, without emailing support. " +
  "A typical flow: Settings -> Delete Account -> confirm (and re-enter password) -> the account and its " +
  "personal data are removed or scheduled for removal. Note: because Mint is a regulated financial app, " +
  "some records may need to be kept for legal reasons - the app should explain this clearly to the user."
);
calloutBox(
  "Heads up - this touches the backend",
  "Deleting an account safely needs server-side work (removing the user from authentication and the " +
  "database). This is in the protected server area, so it needs your explicit go-ahead before we build it.",
  AMBER
);

subHeader("5.4  Wire up Privacy Policy, Terms & Cookies");
para(
  "The Legal page buttons need to actually open real, readable documents - and the Privacy Policy must " +
  "also live at a public web link (Apple asks for that link when we submit). We can either show the text " +
  "inside the app or open a hosted web page."
);

subHeader("5.5  Small but important polish");
bullet("App icon must have NO transparency and NO rounded corners (Apple adds the rounding). Ours is a solid 1024x1024, which is correct - just confirm no transparency.");
bullet("Add 'ITSAppUsesNonExemptEncryption = false' to Info.plist so we are not asked export-compliance questions on every upload (we only use standard HTTPS).");
bullet("Confirm the app only supports portrait orientation (already set) and looks correct on modern iPhone screens with notches.");

// ---- 6 accounts & tools ----
newPage();
sectionHeader(6, "Accounts, tools & money you need first");
para("Before any submission, these need to be in place. None of this is code - it's setup and paperwork.");
table(
  ["What", "Why", "Cost / Notes"],
  [
    ["Apple Developer Program", "Required to publish any app on the App Store.", "$99 / year"],
    ["Organization (not personal) account", "Mint is a financial company; finance apps should be published by the company. Apple is strict here.", "Needs a D-U-N-S number (free, ~1-2 weeks to get)"],
    ["A Mac computer", "iPhone apps can ONLY be built and uploaded from a Mac (with Xcode).", "Mac mini, MacBook, or a cloud Mac service"],
    ["Xcode", "Apple's free build tool. Lives on the Mac.", "Free from the Mac App Store"],
    ["Certificates & profiles", "Digital IDs that prove the app is from Mint.", "Created free inside Xcode / Apple Developer"],
    ["A permanent backend host", "So the app has a stable, secure place to get its data.", "A production deployment over HTTPS"],
    ["Public Privacy Policy URL", "Apple requires a reachable privacy policy link.", "A simple hosted web page"],
  ],
  { 0: { cellWidth: 150, fontStyle: "bold" } }
);
calloutBox(
  "Why an Organization account matters for Mint",
  "Apple Guideline 3.2.1 says banking and financial-services apps should be submitted by the licensed " +
  "financial institution. Using a personal account for a money app risks rejection. Get the D-U-N-S " +
  "number early - it can take a couple of weeks.",
  VIOLET
);

// ---- 7 how it's built ----
newPage();
sectionHeader(7, "How a mobile app is built from this web app");
para(
  "Here is the simple mental model. Capacitor takes the finished Mint website and places it inside a " +
  "native iPhone container. The container is a real app; inside it, our familiar Mint screens run. " +
  "Native features (Face ID, camera, haptics) are reached through Capacitor 'plugins' we already have."
);
table(
  ["Layer", "What it is", "In Mint today"],
  [
    ["Web app (UI)", "All the Mint screens - React code", "Done - this is the existing app"],
    ["Build output ('dist')", "The packaged website Capacitor ships", "Created by 'npm run build'"],
    ["Capacitor shell", "The native iPhone wrapper", "Installed (ios/ folder exists)"],
    ["Native plugins", "Bridges to Face ID, camera, haptics", "Biometric + haptics installed"],
    ["Backend", "Server + database (Supabase, APIs)", "Exists - needs permanent hosting"],
  ],
  { 0: { cellWidth: 120, fontStyle: "bold" } }
);

// ---- 8 build steps ----
newPage();
sectionHeader(8, "Step-by-step: building the iPhone app");
para("This is what happens on the Mac, in order. (We handle the code fixes first; these are the build steps.)");
stepRow(1, "Apply the code fixes", "Complete the four blockers from Section 4 and the polish in Section 5 inside the project.");
stepRow(2, "Build the web app", "Run the build so the latest Mint is packaged into the 'dist' folder.");
stepRow(3, "Copy it into the iPhone app", "Capacitor syncs the built web app into the iOS project (the 'sync' step).");
stepRow(4, "Open the project in Xcode", "On the Mac, open the iOS workspace. This is where signing and uploading happen.");
stepRow(5, "Sign the app", "Sign in with the Apple Developer account and let Xcode create the certificates and profile.");
stepRow(6, "Set version & build number", "Confirm the version (e.g. 1.0.0) and a build number (e.g. 1). Each upload needs a new build number.");
stepRow(7, "Run it on a real iPhone", "Test the whole flow on a physical device: sign up, KYC (camera!), Face ID, investing, delete account.");
stepRow(8, "Archive and upload", "Create an 'Archive' in Xcode and upload it to App Store Connect.");

// ---- 9 submit steps ----
newPage();
sectionHeader(9, "Step-by-step: submitting to the App Store");
stepRow(1, "Create the app in App Store Connect", "Register the app using the Bundle ID com.algohive.mint.app and the name 'Mint'.");
stepRow(2, "Test via TestFlight (recommended)", "Send the uploaded build to internal testers first to catch issues before the public sees it.");
stepRow(3, "Fill in the App Privacy details", "Honestly declare what data Mint collects: identity (KYC), financial info, contact details, usage data.");
stepRow(4, "Add the store listing", "App description, keywords, category (Finance), support URL, marketing URL, and the Privacy Policy link.");
stepRow(5, "Upload screenshots", "Provide screenshots for the required iPhone sizes (Apple lists the exact sizes).");
stepRow(6, "Provide a reviewer demo account", "Apple reviewers must log in and get PAST onboarding/KYC. Give them a working test login and any bypass needed, in the review notes.");
stepRow(7, "Answer export compliance", "Confirm we only use standard encryption (HTTPS). The Info.plist flag from 5.5 makes this automatic.");
stepRow(8, "Submit for review", "Send it to Apple. Review typically takes 1-3 days. They may approve, or reply with items to fix.");
stepRow(9, "Release", "Once approved, release immediately or on a chosen date. Mint is now on the App Store.");
calloutBox(
  "The #1 reason finance apps get rejected",
  "Reviewers can't get past the KYC wall to see the app. Always give a ready-to-use demo account and " +
  "clear login steps in the 'App Review notes'. Without it, expect a rejection.",
  RED
);

// ---- 10 listing checklist ----
newPage();
sectionHeader(10, "The App Store listing checklist");
para("Gather these assets before you start the listing so submission is smooth:");
bullet("App name: Mint (and a subtitle, up to 30 characters).");
bullet("App description: what Mint does, key features, who it's for.");
bullet("Keywords: e.g. invest, savings, JSE, portfolio, family, South Africa.");
bullet("Category: Finance (primary).");
bullet("Screenshots: for the iPhone sizes Apple requires (use real Mint screens).");
bullet("App icon: 1024x1024, no transparency, no rounded corners (we have this).");
bullet("Privacy Policy URL: a public, working link.");
bullet("Support URL and contact email.");
bullet("App Privacy 'nutrition label': data types collected and how they're used.");
bullet("Age rating questionnaire (finance apps are usually 17+ depending on answers).");
bullet("Demo/reviewer account details in the review notes.");

// ---- 11 finance rules ----
newPage();
sectionHeader(11, "Money & finance app rules (important for Mint)");
subHeader("In-App Purchase - good news");
para(
  "Apple's 30% In-App Purchase fee applies to DIGITAL goods (game coins, premium content). It does NOT " +
  "apply to real-world money and financial services. Mint's investments, deposits and credit are real " +
  "financial services, so we can use our own payment flows (e.g. bank/Paystack) without Apple's IAP. " +
  "Just be careful never to sell digital-only content through an outside payment method."
);
subHeader("Sign in with Apple - not required");
para(
  "Apple only forces 'Sign in with Apple' when an app offers other social logins (Google, Facebook). " +
  "Mint uses email/password and OTP only, so we are exempt. If we ever add social login later, we would " +
  "then also need to add Sign in with Apple."
);
subHeader("Regulation & trust");
para(
  "Finance apps get extra scrutiny. Be ready to show Mint is operated by a legitimate, authorised " +
  "financial entity. Publish from the company (Organization) account, keep the Privacy Policy accurate " +
  "about KYC and financial data, and make sure terms reflect the real services."
);
subHeader("Data privacy");
para(
  "Mint handles very sensitive data: ID numbers, dates of birth, addresses, bank links and uploaded " +
  "documents. The App Privacy section must declare all of this. Being inaccurate here is a common cause " +
  "of rejection and of trouble later."
);

// ---- 12 full checklist ----
newPage();
sectionHeader(12, "Full readiness checklist (one-page summary)");
table(
  ["#", "Item", "Status", "Type"],
  [
    ["1", "Capacitor + iOS/Android projects exist", "HAVE", "Setup"],
    ["2", "App icon 1024 + splash screens", "HAVE", "Assets"],
    ["3", "Face ID permission message", "HAVE", "Config"],
    ["4", "Biometrics + haptics plugins", "HAVE", "Native"],
    ["5", "Compliant payments (no IAP needed)", "HAVE", "Policy"],
    ["6", "Email/OTP login (no Sign in with Apple needed)", "HAVE", "Policy"],
    ["7", "Remove dev URL + cleartext from config", "MISSING", "Blocker"],
    ["8", "Delete Account feature (in-app)", "MISSING", "Blocker"],
    ["9", "Camera + microphone permission messages", "MISSING", "Blocker"],
    ["10", "Privacy Policy & Terms wired up + public link", "MISSING", "Blocker"],
    ["11", "Backend deployed to permanent HTTPS host", "MISSING", "Infra"],
    ["12", "Encryption-exempt flag in Info.plist", "MISSING", "Polish"],
    ["13", "Apple Developer (Organization) account", "MISSING", "Account"],
    ["14", "Mac + Xcode to build", "MISSING", "Tooling"],
    ["15", "Screenshots + store listing text", "MISSING", "Listing"],
    ["16", "App Privacy 'nutrition label' filled in", "MISSING", "Listing"],
    ["17", "Reviewer demo account + notes", "MISSING", "Listing"],
  ],
  { 0: { cellWidth: 26 }, 2: { cellWidth: 70 }, 3: { cellWidth: 70 } }
);

// ---- 13 recommended order ----
newPage();
sectionHeader(13, "Recommended order of work");
para("If we tackle it in this order, nothing blocks anything else:");
stepRow(1, "Code fixes (in this project)", "Camera/mic permissions, Privacy Policy/Terms content, Capacitor config cleanup, encryption flag. (Delete Account needs your go-ahead as it touches the backend.)");
stepRow(2, "Deploy the backend", "Get the server + APIs onto a permanent, secure HTTPS production address.");
stepRow(3, "Start Apple paperwork in parallel", "Apply for the Organization Apple Developer account and the D-U-N-S number now - it takes the longest.");
stepRow(4, "Build & test on a Mac", "Build the iPhone app, run it on a real device, and check every flow (especially KYC camera and Delete Account).");
stepRow(5, "TestFlight", "Send to internal testers, fix anything that comes up.");
stepRow(6, "Submit & launch", "Complete the listing, add the reviewer account, submit, and release once approved.");

calloutBox(
  "What we can start right now",
  "The code-side blockers (camera/mic permissions, privacy policy, config cleanup, encryption flag) can " +
  "be done immediately inside this project. The Delete Account feature needs your OK because it touches " +
  "the protected backend. Everything else is Apple account setup and the store listing.",
  GREEN
);

// finalize
footer();
fs.writeFileSync("MINT - APP STORE.pdf", Buffer.from(doc.output("arraybuffer")));
console.log("PDF written: MINT - APP STORE.pdf");
