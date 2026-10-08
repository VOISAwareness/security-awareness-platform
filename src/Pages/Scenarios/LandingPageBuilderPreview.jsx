import React from "react";

const LandingPageBuilderPreview = ({
  content,
}) => {
  if (!content) return null;

  const previewDocument = `
    <html>
      <head>
        <style>
          ${content.css || ""}
        </style>
      </head>

      <body
        style="
          background:${content.pageBackground};
          margin:0;
          padding:20px;
        "
      >
        <div class="landing-page-document">
          ${content.html || ""}
        </div>
      </body>
    </html>
  `;

  return (
    <div
      className="
        w-full
        h-[200px]
        rounded-lg
        overflow-hidden
        border
        border-white/10
        bg-white
        p-2
      "
    >
        
        
      <iframe
        title="Landing Page Preview"
        srcDoc={previewDocument}
        className="
          w-full
          h-full
          border-0
        "
      />
    </div>
  );
};

export default LandingPageBuilderPreview;