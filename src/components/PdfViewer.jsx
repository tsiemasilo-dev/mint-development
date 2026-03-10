import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function PdfSkeleton({ width }) {
  const blockStyle = {
    background: "linear-gradient(90deg, #ede9f7 25%, #d8d0f0 50%, #ede9f7 75%)",
    backgroundSize: "200% 100%",
    animation: "pdf-shimmer 1.4s ease-in-out infinite",
    borderRadius: 4,
  };

  return (
    <>
      <style>{`
        @keyframes pdf-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{ padding: "12px 0" }}>
        {[1, 2, 3].map((page) => (
          <div
            key={page}
            style={{
              width: width || "100%",
              marginBottom: 4,
              padding: 16,
              background: "#f5f3fb",
              borderRadius: 4,
            }}
          >
            <div style={{ ...blockStyle, height: 12, width: "60%", marginBottom: 10 }} />
            <div style={{ ...blockStyle, height: 10, width: "100%", marginBottom: 6 }} />
            <div style={{ ...blockStyle, height: 10, width: "95%", marginBottom: 6 }} />
            <div style={{ ...blockStyle, height: 10, width: "88%", marginBottom: 6 }} />
            <div style={{ ...blockStyle, height: 10, width: "92%", marginBottom: 6 }} />
            <div style={{ ...blockStyle, height: 10, width: "75%", marginBottom: 16 }} />
            <div style={{ ...blockStyle, height: 10, width: "100%", marginBottom: 6 }} />
            <div style={{ ...blockStyle, height: 10, width: "97%", marginBottom: 6 }} />
            <div style={{ ...blockStyle, height: 10, width: "83%", marginBottom: 16 }} />
            <div style={{ ...blockStyle, height: 10, width: "100%", marginBottom: 6 }} />
            <div style={{ ...blockStyle, height: 10, width: "90%", marginBottom: 6 }} />
            <div style={{ ...blockStyle, height: 10, width: "70%", marginBottom: 6 }} />
          </div>
        ))}
      </div>
    </>
  );
}

export default function PdfViewer({ file, style = {}, onLoadComplete }) {
  const [numPages, setNumPages] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [containerWidth, setContainerWidth] = useState(null);
  const containerRef = useRef(null);

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateWidth]);

  const handleLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoaded(true);
    if (onLoadComplete) onLoadComplete();
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        ...style,
      }}
    >
      {!loaded && <PdfSkeleton width={containerWidth} />}
      <Document
        file={file}
        onLoadSuccess={handleLoadSuccess}
        loading={null}
        error={
          <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
            Unable to load document.
          </div>
        }
      >
        {numPages &&
          Array.from({ length: numPages }, (_, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <Page
                pageNumber={i + 1}
                width={containerWidth || undefined}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
      </Document>
    </div>
  );
}
