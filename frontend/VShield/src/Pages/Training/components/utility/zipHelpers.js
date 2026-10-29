const loadJSZip = () => {
  return new Promise((resolve, reject) => {
    if (window.JSZip) {
      resolve(window.JSZip);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.onload = () => {
      if (window.JSZip) resolve(window.JSZip);
      else reject(new Error("JSZip loaded but not available on window."));
    };
    script.onerror = () => reject(new Error("Failed to load JSZip script from CDN."));
    document.head.appendChild(script);
  });
};

const getMimeType = (filename) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "html":
    case "htm":
      return "text/html";
    case "css":
      return "text/css";
    case "js":
      return "application/javascript";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "json":
      return "application/json";
    case "woff":
      return "font/woff";
    case "woff2":
      return "font/woff2";
    case "ttf":
      return "font/ttf";
    default:
      return "application/octet-stream";
  }
};

export const extractZipHtml = async (fileOrBlob) => {
  let blob;

  if (typeof fileOrBlob === "string") {
    const response = await fetch(fileOrBlob);
    if (!response.ok) {
      throw new Error(`Failed to fetch local zip: ${response.statusText}`);
    }
    blob = await response.blob();
  } else {
    blob = fileOrBlob;
  }

  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(blob);

  const blobUrlMap = {};
  const fileKeys = Object.keys(zip.files).filter((key) => !zip.files[key].dir);

  for (const fileKey of fileKeys) {
    const file = zip.files[fileKey];
    const mimeType = getMimeType(fileKey);
    const fileBlob = await file.async("blob");
    const mimeBlob = new Blob([fileBlob], { type: mimeType });
    const objectUrl = URL.createObjectURL(mimeBlob);
    blobUrlMap[fileKey] = objectUrl;
  }

  let htmlFileKey = Object.keys(zip.files).find((key) => key.endsWith("index_local.html"));
  if (!htmlFileKey) {
    htmlFileKey = Object.keys(zip.files).find((key) => key.endsWith("index.html"));
  }
  if (!htmlFileKey) {
    htmlFileKey = Object.keys(zip.files).find((key) => key.endsWith(".html"));
  }

  if (!htmlFileKey) {
    throw new Error("No HTML entry point found inside the ZIP archive.");
  }

  let htmlContent = await zip.files[htmlFileKey].async("string");

  const sortedPaths = Object.keys(blobUrlMap).sort((a, b) => b.length - a.length);
  for (const relativePath of sortedPaths) {
    const blobUrl = blobUrlMap[relativePath];
    const escapedPath = relativePath.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(?:\\.\\/)?${escapedPath}`, "g");
    htmlContent = htmlContent.replace(regex, blobUrl);
  }

  const finalHtmlBlob = new Blob([htmlContent], { type: "text/html" });
  return URL.createObjectURL(finalHtmlBlob);
};
