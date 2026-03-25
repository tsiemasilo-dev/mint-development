import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import Skeleton from "./Skeleton";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function PdfSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-3">
      {[1, 2, 3].map((page) => (
        <div key={page} className="flex flex-col gap-2 p-4 mb-1 rounded-md bg-slate-50">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-[95%]" />
          <Skeleton className="h-2.5 w-[88%]" />
          <Skeleton className="h-2.5 w-[92%]" />
          <Skeleton className="h-2.5 w-3/4 mb-2" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-[97%]" />
          <Skeleton className="h-2.5 w-[83%] mb-2" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-[90%]" />
          <Skeleton className="h-2.5 w-[70%]" />
        </div>
      ))}
    </div>
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
