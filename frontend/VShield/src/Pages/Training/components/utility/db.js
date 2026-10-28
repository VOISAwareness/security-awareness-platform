const DB_NAME = "VoisShieldTrainingDB";
const DB_VERSION = 3; // Incremented version to support paths, quizzes, full videos, certificates, and packages stores
const VIDEOS_STORE = "uploaded_videos";
const CERTS_STORE = "uploaded_certificates";

//  JSON replication & user  stores
const PATHS_STORE = "paths";
const QUIZZES_STORE = "quizzes";
const ALL_VIDEOS_STORE = "videos";
const ALL_CERTS_STORE = "certificates";
const PACKAGES_STORE = "standalone_packages";

export function initDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported on this platform."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VIDEOS_STORE)) {
        db.createObjectStore(VIDEOS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CERTS_STORE)) {
        db.createObjectStore(CERTS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PATHS_STORE)) {
        db.createObjectStore(PATHS_STORE, { keyPath: "TrainingPathID" });
      }
      if (!db.objectStoreNames.contains(QUIZZES_STORE)) {
        db.createObjectStore(QUIZZES_STORE, { keyPath: "TrainingQuizID" });
      }
      if (!db.objectStoreNames.contains(ALL_VIDEOS_STORE)) {
        db.createObjectStore(ALL_VIDEOS_STORE, { keyPath: "TrainingVideoID" });
      }
      if (!db.objectStoreNames.contains(ALL_CERTS_STORE)) {
        db.createObjectStore(ALL_CERTS_STORE, { keyPath: "TrainingCertificateID" });
      }
      if (!db.objectStoreNames.contains(PACKAGES_STORE)) {
        db.createObjectStore(PACKAGES_STORE, { keyPath: "PackageID" });
      }
    };
  });
}


















// Pathways / Courses DB Methods
export async function savePath(path) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PATHS_STORE, "readwrite");
    const store = transaction.objectStore(PATHS_STORE);
    const request = store.put(path);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPaths() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PATHS_STORE, "readonly");
      const store = transaction.objectStore(PATHS_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to fetch paths from DB", e);
    return [];
  }
}

export async function deletePath(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PATHS_STORE, "readwrite");
    const store = transaction.objectStore(PATHS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Quizzes DB Methods
export async function saveQuiz(quiz) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUIZZES_STORE, "readwrite");
    const store = transaction.objectStore(QUIZZES_STORE);
    const request = store.put(quiz);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getQuizzes() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(QUIZZES_STORE, "readonly");
      const store = transaction.objectStore(QUIZZES_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to fetch quizzes from DB", e);
    return [];
  }
}

export async function deleteQuiz(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUIZZES_STORE, "readwrite");
    const store = transaction.objectStore(QUIZZES_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Videos DB Methods 
export async function saveVideo(video) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ALL_VIDEOS_STORE, "readwrite");
    const store = transaction.objectStore(ALL_VIDEOS_STORE);
    const request = store.put(video);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getVideos() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ALL_VIDEOS_STORE, "readonly");
      const store = transaction.objectStore(ALL_VIDEOS_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to fetch videos from DB", e);
    return [];
  }
}

export async function deleteVideo(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ALL_VIDEOS_STORE, "readwrite");
    const store = transaction.objectStore(ALL_VIDEOS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Certificates DB Methods
export async function saveCertificateItem(cert) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ALL_CERTS_STORE, "readwrite");
    const store = transaction.objectStore(ALL_CERTS_STORE);
    const request = store.put(cert);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCertificateItems() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ALL_CERTS_STORE, "readonly");
      const store = transaction.objectStore(ALL_CERTS_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to fetch certificates from DB", e);
    return [];
  }
}

export async function deleteCertificateItem(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ALL_CERTS_STORE, "readwrite");
    const store = transaction.objectStore(ALL_CERTS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Legacy File-Based Uploads Methods
export async function saveUploadedVideo(id, name, description, file) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VIDEOS_STORE, "readwrite");
    const store = transaction.objectStore(VIDEOS_STORE);
    const data = {
      id,
      name,
      description,
      file,
      createdOn: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).replace(/ /g, "-")
    };
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getUploadedVideos() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(VIDEOS_STORE, "readonly");
      const store = transaction.objectStore(VIDEOS_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to fetch videos from DB", e);
    return [];
  }
}

export async function saveUploadedCertificate(
  id,
  name,
  description,
  htmlContent,
  imageFile
) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CERTS_STORE, "readwrite");
    const store = transaction.objectStore(CERTS_STORE);
    const data = {
      id,
      name,
      description,
      htmlContent,
      imageFile,
      createdOn: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).replace(/ /g, "-")
    };
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getUploadedCertificates() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CERTS_STORE, "readonly");
      const store = transaction.objectStore(CERTS_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to fetch certificates from DB", e);
    return [];
  }
}

// Packages DB Methods
export async function savePackage(pkg) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PACKAGES_STORE, "readwrite");
    const store = transaction.objectStore(PACKAGES_STORE);
    const request = store.put(pkg);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPackages() {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PACKAGES_STORE, "readonly");
      const store = transaction.objectStore(PACKAGES_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to fetch packages from DB", e);
    return [];
  }
}

export async function deletePackage(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PACKAGES_STORE, "readwrite");
    const store = transaction.objectStore(PACKAGES_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
