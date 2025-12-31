
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  writeBatch
} from "firebase/firestore";
import { ProjectExample, EstimationHistory } from "../types";

// NOTE: Replace these placeholders with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMnTFkvg6Hh8tI8Ec345fnMdRydTxdhBs",
  authDomain: "projectrequirements-b9582.firebaseapp.com",
  projectId: "projectrequirements-b9582",
  storageBucket: "projectrequirements-b9582.firebasestorage.app",
  messagingSenderId: "674100183042",
  appId: "1:674100183042:web:fcd09329db589242ea271b",
  measurementId: "G-ZLS7T6M7ZH"
};

// Initialize Firebase using modular pattern
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use initializeFirestore with settings for better compatibility in preview environments
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // This helps avoid issues with WebSockets in some previews
});

const STORE_EXAMPLES = "knowledge_base";
const STORE_HISTORY = "estimation_history";

class FirebaseService {
  /**
   * Retrieves all examples from Firestore collection.
   */
  async getAllExamples(): Promise<ProjectExample[]> {
    try {
      const colRef = collection(db, STORE_EXAMPLES);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectExample));
    } catch (error) {
      console.error("Firebase Error: Failed to fetch examples", error);
      return [];
    }
  }

  /**
   * Saves or updates an example in Firestore.
   */
  async saveExample(example: ProjectExample): Promise<void> {
    try {
      const docRef = doc(db, STORE_EXAMPLES, example.id);
      const safeExample = JSON.parse(JSON.stringify(example));
      await setDoc(docRef, safeExample);
    } catch (error) {
      console.error("Firebase Error: Failed to save example", error);
      throw error;
    }
  }

  /**
   * Deletes an example from Firestore by ID.
   */
  async deleteExample(id: string): Promise<void> {
    try {
      const docRef = doc(db, STORE_EXAMPLES, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Firebase Error: Failed to delete example", error);
      throw error;
    }
  }

  /**
   * Retrieves estimation history ordered by timestamp descending.
   */
  async getAllHistory(): Promise<EstimationHistory[]> {
    try {
      const colRef = collection(db, STORE_HISTORY);
      const q = query(colRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EstimationHistory));
    } catch (error) {
      console.error("Firebase Error: Failed to fetch history", error);
      return [];
    }
  }

  /**
   * Saves estimation history record to Firestore.
   */
  async saveHistory(history: EstimationHistory): Promise<void> {
    try {
      const docRef = doc(db, STORE_HISTORY, history.id);
      // Firestore does not accept undefined values. Wesanitize it.
      const safeHistory = JSON.parse(JSON.stringify(history));
      await setDoc(docRef, safeHistory);
    } catch (error) {
      console.error("Firebase Error: Failed to save history", error);
      throw error;
    }
  }

  /**
   * Wipes all documents from examples and history collections using a batch write.
   */
  async clearAll(): Promise<void> {
    try {
      const batch = writeBatch(db);

      const examplesSnap = await getDocs(collection(db, STORE_EXAMPLES));
      examplesSnap.forEach(d => batch.delete(d.ref));

      const historySnap = await getDocs(collection(db, STORE_HISTORY));
      historySnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
    } catch (error) {
      console.error("Firebase Error: Failed to clear database", error);
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();
