import { getStoreSnapshot, setStoreState, subscribeStore, getLastSavedTime, type HishabState } from "@/lib/hishab-store";
import { stateToSqliteDbBuffer, sqliteDbBufferToState } from "@/lib/sqlite-service";

export type FileMetaState = {
  fileName: string | null;
  lastSavedAt: string | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
};

let activeFileHandle: FileSystemFileHandle | null = null;
let activeDirectoryHandle: any = null;
let chosenDirectoryName: string | null = null;
let currentFileName: string | null = null;
let currentFileLocation: string = "ডকুমেন্টস (Documents)";
let lastSavedAtStr: string | null = null;

const metaListeners = new Set<() => void>();

function emitMeta() {
  metaListeners.forEach((fn) => fn());
}

export function subscribeFileMeta(fn: () => void) {
  metaListeners.add(fn);
  return () => metaListeners.delete(fn);
}

export function getFileMeta(): FileMetaState & { fileLocation?: string; chosenDirName?: string | null } {
  return {
    fileName: currentFileName,
    fileLocation: currentFileLocation,
    chosenDirName: chosenDirectoryName,
    lastSavedAt: lastSavedAtStr || getLastSavedTime(),
    isSaving: isAutoSaving,
    hasUnsavedChanges: false,
  };
}

/**
 * Lets the user pick ANY custom folder or drive on their computer hard disk
 */
export async function pickCustomDirectory(): Promise<{ success: boolean; dirName?: string; message: string }> {
  if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        id: "hishab_store_folder_picker",
        mode: "readwrite",
      });
      activeDirectoryHandle = dirHandle;
      chosenDirectoryName = dirHandle.name;
      currentFileLocation = `📂 ${dirHandle.name}`;
      emitMeta();
      return {
        success: true,
        dirName: dirHandle.name,
        message: `"${dirHandle.name}" ফোল্ডারটি সফলভাবে নির্বাচন করা হয়েছে!`,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { success: false, message: "ফোল্ডার নির্বাচন বাতিল করা হয়েছে।" };
      }
      return { success: false, message: "ফোল্ডার অ্যাক্সেস করা সম্ভব হয়নি: " + (err.message || "") };
    }
  }
  return {
    success: false,
    message: "আপনার ব্রাউজারে ডিরেক্টরি পিকিং সুবিধাপ্রাপ্ত নয়।",
  };
}

export function setCustomDirectoryName(name: string) {
  chosenDirectoryName = name;
  currentFileLocation = name;
  emitMeta();
}

let isAutoSaving = false;
let autoSaveTimeout: any = null;

/**
 * Triggers auto-save to the active SQLite .db file handle on disk whenever state updates
 */
export function triggerAutoSaveToDisk() {
  if (!activeFileHandle) {
    lastSavedAtStr = getLastSavedTime();
    emitMeta();
    return;
  }

  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

  autoSaveTimeout = setTimeout(async () => {
    if (!activeFileHandle) return;
    try {
      isAutoSaving = true;
      emitMeta();

      const state = getStoreSnapshot();
      const sqliteBuffer = await stateToSqliteDbBuffer(state);

      const writable = await activeFileHandle.createWritable();
      await writable.write(sqliteBuffer);
      await writable.close();

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      const secs = String(now.getSeconds()).padStart(2, "0");

      lastSavedAtStr = `${hours}:${mins}:${secs}`;
      isAutoSaving = false;
      emitMeta();
    } catch (err) {
      console.error("Auto save to SQLite file failed:", err);
      isAutoSaving = false;
      emitMeta();
    }
  }, 400);
}

// Auto-trigger when hishab-store updates
if (typeof window !== "undefined") {
  subscribeStore(() => {
    triggerAutoSaveToDisk();
  });
}

/**
 * Open SQLite database file (*.db) from hard disk using File System Access API or file dialog
 */
export async function openFileFromHardDisk(
  fileFromInput?: File
): Promise<{ success: boolean; message: string }> {
  try {
    let arrayBuffer: ArrayBuffer;
    let name = "";
    let handle: FileSystemFileHandle | null = null;

    if (fileFromInput) {
      arrayBuffer = await fileFromInput.arrayBuffer();
      name = fileFromInput.name;
    } else if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
      try {
        const [h] = await (window as any).showOpenFilePicker({
          id: "hishab_store_db_location", // Remembers last used folder location like MS Word
          startIn: "documents",
          types: [
            {
              description: "SQLite Database File (*.db, *.sqlite)",
              accept: {
                "application/x-sqlite3": [".db", ".sqlite"],
                "application/vnd.sqlite3": [".db", ".sqlite"],
                "application/octet-stream": [".db", ".sqlite", ".hishab"],
              },
            },
            {
              description: "JSON Database File (*.json)",
              accept: {
                "application/json": [".json"],
              },
            },
          ],
          multiple: false,
        });
        handle = h;
        const file = await handle!.getFile();
        arrayBuffer = await file.arrayBuffer();
        name = file.name;
      } catch (e: any) {
        if (e.name === "AbortError") {
          return { success: false, message: "ফাইল খোলার প্রক্রিয়া বাতিল করা হয়েছে।" };
        }
        throw e;
      }
    } else {
      return { success: false, message: "ফাইল খোলার সুবিধা প্রস্তুত নয়।" };
    }

    const validState = await sqliteDbBufferToState(arrayBuffer);

    if (!validState) {
      return { success: false, message: "অকার্যকর ফাইল ফরম্যাট। সঠিক SQLite .db ডাটা ফাইল নির্বাচন করুন।" };
    }

    setStoreState(validState);
    activeFileHandle = handle;
    currentFileName = name;

    const now = new Date();
    lastSavedAtStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    emitMeta();
    return {
      success: true,
      message: `"${name}" ডাটাবেজ ফাইলটি সফলভাবে খোলা হয়েছে এবং অটো-সেভ সক্রিয় রয়েছে!`,
    };
  } catch (err: any) {
    console.error("Open SQLite file error:", err);
    return {
      success: false,
      message: "ফাইল পড়তে সমস্যা হয়েছে। ফাইলটি সঠিক .db বা .sqlite ডাটাবেজ ফরম্যাটের কিনা নিশ্চিত করুন।",
    };
  }
}

/**
 * Save current state directly to active SQLite file handle or trigger Save As
 */
export async function saveCurrentFileToDisk(): Promise<{ success: boolean; message: string }> {
  if (activeFileHandle) {
    try {
      isAutoSaving = true;
      emitMeta();

      const state = getStoreSnapshot();
      const sqliteBuffer = await stateToSqliteDbBuffer(state);

      const writable = await activeFileHandle.createWritable();
      await writable.write(sqliteBuffer);
      await writable.close();

      const now = new Date();
      lastSavedAtStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      isAutoSaving = false;
      emitMeta();

      return { success: true, message: `"${currentFileName}" ডাটবেজ ফাইলে সফলভাবে তথ্য সেভ করা হয়েছে!` };
    } catch (err) {
      console.error("Manual save failed:", err);
      isAutoSaving = false;
      emitMeta();
      // Fallback to Save As
      return saveAsFileToDisk();
    }
  } else {
    return saveAsFileToDisk();
  }
}

/**
 * Save As: prompt user to choose location and file name on PC hard drive for SQLite database or JSON
 * Like Microsoft Word, opens native file explorer to pick exact folder and name
 */
export async function saveAsFileToDisk(
  customName?: string,
  format: "db" | "json" = "db",
  locationFolder: string = "documents",
  customDisplayPath?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const state = getStoreSnapshot();
    let baseName = (customName?.trim() || state.shopName || "দোকান_হিসাব").replace(/[\s/\\?%*:|"<>]+/g, "_");
    if (!baseName.toLowerCase().endsWith(".db") && !baseName.toLowerCase().endsWith(".json")) {
      baseName = `${baseName}.${format}`;
    }
    const defaultName = baseName;

    let bufferOrText: Uint8Array | string;
    let mimeType: string;

    if (format === "json" || defaultName.endsWith(".json")) {
      bufferOrText = JSON.stringify(state, null, 2);
      mimeType = "application/json";
    } else {
      try {
        bufferOrText = await stateToSqliteDbBuffer(state);
        mimeType = "application/vnd.sqlite3";
      } catch (sqlErr) {
        console.warn("SQLite buffer serialization error, falling back to json-compatible bytes:", sqlErr);
        bufferOrText = JSON.stringify(state, null, 2);
        mimeType = "application/json";
      }
    }

    // 1. If user previously chose a specific directory via Directory Picker, write directly there
    if (activeDirectoryHandle) {
      try {
        const fileHandle = await activeDirectoryHandle.getFileHandle(defaultName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(bufferOrText);
        await writable.close();

        activeFileHandle = fileHandle;
        currentFileName = fileHandle.name;
        currentFileLocation = `📂 ${chosenDirectoryName || activeDirectoryHandle.name}`;

        const now = new Date();
        lastSavedAtStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        emitMeta();

        return {
          success: true,
          message: `"${fileHandle.name}" ফাইলটি "${chosenDirectoryName || activeDirectoryHandle.name}" ফোল্ডারে সফলভাবে সেভ হয়েছে এবং নিয়মিত অটো-সেভ সক্রিয় রয়েছে!`,
        };
      } catch (dirErr) {
        console.warn("Direct save to directory handle failed, trying showSaveFilePicker:", dirErr);
      }
    }

    const validStartIn = ["documents", "desktop", "downloads", "music", "pictures", "videos"].includes(locationFolder)
      ? locationFolder
      : "documents";

    // 2. Try native File System Access API (Native Windows/Mac Save As File Explorer Dialog)
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          id: "hishab_store_db_location",
          startIn: validStartIn,
          suggestedName: defaultName,
          types: [
            {
              description: "SQLite Database File (*.db)",
              accept: {
                "application/vnd.sqlite3": [".db"],
                "application/x-sqlite3": [".db"],
                "application/octet-stream": [".db"],
              },
            },
            {
              description: "JSON Database Backup (*.json)",
              accept: { "application/json": [".json"] },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(bufferOrText);
        await writable.close();

        activeFileHandle = handle;
        currentFileName = handle.name;
        currentFileLocation = customDisplayPath || (locationFolder === "desktop" ? "ডেস্কটপ (Desktop)" : locationFolder === "downloads" ? "ডাউনলোড (Downloads)" : "ডকুমেন্টস (Documents)");

        const now = new Date();
        lastSavedAtStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        emitMeta();

        return {
          success: true,
          message: `"${handle.name}" ফাইলটি নির্ধারিত লোকেশনে সফলভাবে সেভ হয়েছে! এখন থেকে এটিতে নিয়মিত অটো-সেভ হবে।`,
        };
      } catch (e: any) {
        if (e.name === "AbortError") {
          return { success: false, message: "সেভ এজ বাতিল করা হয়েছে।" };
        }
        console.warn("Native showSaveFilePicker not permitted or failed, falling back to download:", e);
      }
    }

    // Universal Fallback: Standard Browser Save / Download Dialog
    const blob =
      typeof bufferOrText === "string"
        ? new Blob([bufferOrText], { type: mimeType })
        : new Blob([bufferOrText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    currentFileName = defaultName;
    currentFileLocation = customDisplayPath || (locationFolder === "desktop" ? "ডেস্কটপ (Desktop)" : locationFolder === "downloads" ? "ডাউনলোড (Downloads)" : "ডকুমেন্টস (Documents)");
    const now = new Date();
    lastSavedAtStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    emitMeta();

    return {
      success: true,
      message: `"${defaultName}" ফাইলটি সফলভাবে আপনার কম্পিউটারে সেভ হয়েছে!`,
    };
  } catch (err: any) {
    console.error("Save error:", err);
    return { success: false, message: "ফাইল সেভ করতে সমস্যা হয়েছে: " + (err?.message || "") };
  }
}
