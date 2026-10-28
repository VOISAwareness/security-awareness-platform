import { useRef, useState, useEffect } from "react";

export const CertificateThumbnail = ({
  certificate,
  userName = "Abhay H S",
  trainingPathName = "Anti-Phishing & Social Engineering Remediation",
  completionDate = "18-Sep-2026",
}) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth || containerRef.current.offsetWidth;
        if (width > 0) {
          // The template standard width is 800px.
          // scale 800px to fit the client container width.
          const calculatedScale = width / 800;
          setScale(calculatedScale);
        }
      }
    };

    updateScale();
    const observer = new ResizeObserver(() => {
      // Wrap in requestAnimationFrame to avoid "ResizeObserver loop limit exceeded" warning
      window.requestAnimationFrame(updateScale);
    });
    observer.observe(containerRef.current);
    
    // Fallback timer if initial render has 0 width
    const timer = setTimeout(updateScale, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const rawHtml = certificate["Certificate(html)"] || "";
  const renderedHtml = rawHtml
    .replace(/{{userName}}/g, userName)
    .replace(/{{trainingPathName}}/g, trainingPathName)
    .replace(/{{completionDate}}/g, completionDate)
    .replace(/{{certificateId}}/g, certificate.TrainingCertificateID);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center pointer-events-none select-none"
    >
      <div
        style={{
          width: "800px",
          height: "500px",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        <iframe
          title={`Thumbnail-${certificate.TrainingCertificateID}`}
          srcDoc={renderedHtml}
          className="w-full h-full border-none pointer-events-none"
          sandbox="allow-same-origin"
          scrolling="no"
        />
      </div>
    </div>
  );
};
