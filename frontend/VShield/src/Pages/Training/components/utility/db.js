import { api } from "@/services/api";
import { deleteTraining, loadTraining, saveTraining } from "@/services/trainingCatalog";

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

// Paths, quizzes, videos and certificates live in the backend (DynamoDB, with
// uploaded videos and certificate images in S3): these keep the names the
// Training screen calls, and go through the shared catalogue
// (services/trainingCatalog.js). Only packages kept in this browser before
// they moved to S3 are still read from IndexedDB, below.
export const savePath = (path) => saveTraining("paths", path);
export const getPaths = async () => (await loadTraining()).paths;
export const deletePath = (id) => deleteTraining("paths", id);

export const saveQuiz = (quiz) => saveTraining("quizzes", quiz);
export const getQuizzes = async () => (await loadTraining()).quizzes;
export const deleteQuiz = (id) => deleteTraining("quizzes", id);

export const saveVideo = (video) => saveTraining("videos", video);
export const getVideos = async () => (await loadTraining()).videos;
export const deleteVideo = (id) => deleteTraining("videos", id);

export const saveCertificateItem = (cert) => saveTraining("certificates", cert);
export const getCertificateItems = async () => (await loadTraining()).certificates;
export const deleteCertificateItem = (id) => deleteTraining("certificates", id);

/** Upload a video or certificate image to S3; the key goes on its row. */
export const uploadTrainingMedia = (file) => api.training.uploadMedia(file);

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
