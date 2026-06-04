const PDF_URL_REVOKE_DELAY_MS = 60_000;

function isIosLikeWebView() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isiPhoneOrPad = /iPad|iPhone|iPod/.test(ua);
  const iPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isiPhoneOrPad || iPadDesktopMode;
}

export function downloadPdfBuffer(pdfBuffer, filename) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (isIosLikeWebView()) return false;

  try {
    const blob = pdfBuffer instanceof Blob
      ? pdfBuffer
      : new Blob([pdfBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, PDF_URL_REVOKE_DELAY_MS);

    return true;
  } catch (error) {
    console.warn("[pdfDownload] Download handoff failed:", error?.message || error);
    return false;
  }
}
