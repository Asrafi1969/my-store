import { useState, useEffect, useRef, type ChangeEvent } from "react";
import {
  FolderOpen,
  Save,
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  Info,
  Check,
  AlertCircle,
  Database,
  ExternalLink,
  FileText,
  FolderTree,
  Download,
  Folder,
  FolderPlus,
  Monitor,
  Laptop,
  Compass,
  FolderCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getFileMeta,
  openFileFromHardDisk,
  saveCurrentFileToDisk,
  saveAsFileToDisk,
  subscribeFileMeta,
  pickCustomDirectory,
  setCustomDirectoryName,
  type FileMetaState,
} from "@/lib/file-system";
import { forceSaveNow, getStoreSnapshot, useHishab } from "@/lib/hishab-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export function FileToolbar() {
  const store = useHishab();
  const [meta, setMeta] = useState<FileMetaState & { fileLocation?: string; chosenDirName?: string | null }>(getFileMeta());
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [isIframe, setIsIframe] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Save As Dialog State
  const [fileNameInput, setFileNameInput] = useState("");
  const [fileFormat, setFileFormat] = useState<"db" | "json">("db");
  const [saveLocation, setSaveLocation] = useState<string>("documents");
  const [customFolderName, setCustomFolderName] = useState("");
  const [pickedDirLabel, setPickedDirLabel] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsIframe(window.self !== window.top);
    }
    return subscribeFileMeta(() => {
      setMeta(getFileMeta());
    });
  }, []);

  // Set default file name when opening Save As dialog
  const prepareSaveAsDialog = () => {
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const cleanShop = (store.shopName || "দোকান_হিসাব").replace(/[\s/\\?%*:|"<>]+/g, "_");
    setFileNameInput(`${cleanShop}_${dateStr}`);
    if (meta.chosenDirName) {
      setPickedDirLabel(meta.chosenDirName);
      setSaveLocation("custom_picked");
    }
    setSaveAsOpen(true);
  };

  // Keyboard shortcuts like MS Word: Ctrl+S (Save), Ctrl+O (Open), F12 (Save As)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (e.shiftKey) {
          prepareSaveAsDialog();
        } else {
          handleSave();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        handleOpen();
      } else if (e.key === "F12") {
        e.preventDefault();
        prepareSaveAsDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [meta.fileName, store.shopName]);

  const showFeedback = (text: string, type: "success" | "error" | "info") => {
    setMsg({ text, type });
    setTimeout(() => {
      setMsg(null);
    }, 5000);
  };

  /**
   * Browse and pick any real folder from Windows / Mac / Linux hard drive
   */
  const handleBrowseFolder = async () => {
    setIsProcessing(true);
    try {
      const res = await pickCustomDirectory();
      if (res.success && res.dirName) {
        setPickedDirLabel(res.dirName);
        setSaveLocation("custom_picked");
        showFeedback(res.message, "success");
      } else if (res.message && !res.message.includes("বাতিল")) {
        showFeedback(res.message, "info");
      }
    } catch (err: any) {
      console.warn("Folder browse error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * MS Word Style Open: Directly opens the Windows/OS File Explorer Open dialog
   */
  const handleOpen = async () => {
    setIsProcessing(true);
    try {
      // 1. Try native File System Access API
      if (typeof window !== "undefined" && "showOpenFilePicker" in window && !isIframe) {
        try {
          const res = await openFileFromHardDisk();
          showFeedback(res.message, res.success ? "success" : "info");
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") {
            return;
          }
          console.warn("Native showOpenFilePicker fallback:", err);
        }
      }

      // 2. Direct Windows File Explorer Dialog via file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Confirm Save As action from MS Word-style Save As Dialog Box
   */
  const handleConfirmSaveAs = async () => {
    setIsProcessing(true);
    forceSaveNow();
    try {
      let finalName = fileNameInput.trim() || store.shopName || "দোকান_হিসাব";
      const ext = `.${fileFormat}`;
      if (!finalName.toLowerCase().endsWith(ext)) {
        finalName = `${finalName}${ext}`;
      }

      let displayPath = "";
      if (saveLocation === "custom_picked" && pickedDirLabel) {
        displayPath = `📂 ${pickedDirLabel}`;
      } else if (saveLocation === "drive_d") {
        displayPath = `D:\\${customFolderName ? customFolderName + "\\" : "Dokan_Hishab\\"}`;
      } else if (saveLocation === "drive_c") {
        displayPath = `C:\\${customFolderName ? customFolderName + "\\" : "HishabPati_Store\\"}`;
      } else if (saveLocation === "drive_e") {
        displayPath = `E:\\${customFolderName ? customFolderName + "\\" : "Backup_Accounts\\"}`;
      } else if (saveLocation === "drive_usb") {
        displayPath = `USB Drive (F:)\\${customFolderName ? customFolderName + "\\" : ""}`;
      } else if (saveLocation === "desktop") {
        displayPath = `ডেস্কটপ (Desktop)${customFolderName ? "\\" + customFolderName : ""}`;
      } else if (saveLocation === "downloads") {
        displayPath = `ডাউনলোড (Downloads)${customFolderName ? "\\" + customFolderName : ""}`;
      } else {
        displayPath = `ডকুমেন্টস (Documents)${customFolderName ? "\\" + customFolderName : ""}`;
      }

      const res = await saveAsFileToDisk(finalName, fileFormat, saveLocation, displayPath);
      showFeedback(res.message, res.success ? "success" : "error");
      if (res.success) {
        setSaveAsOpen(false);
      }
    } catch (err: any) {
      console.error("Save As error:", err);
      showFeedback("সেভ করতে সমস্যা হয়েছে", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Quick Save: Saves directly into the opened/created file on hard disk
   */
  const handleSave = async () => {
    forceSaveNow();
    if (!meta.fileName) {
      // If no file connected yet, open Save As dialog
      prepareSaveAsDialog();
      return;
    }
    setIsProcessing(true);
    try {
      const res = await saveCurrentFileToDisk();
      showFeedback(res.message, res.success ? "success" : "error");
    } catch (err: any) {
      console.error("Save error:", err);
      showFeedback("ফাইল সেভ করতে সমস্যা হয়েছে", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const res = await openFileFromHardDisk(file);
      showFeedback(res.message, res.success ? "success" : "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Get current breadcrumb label for location bar
  const getLocationBreadcrumb = () => {
    if (saveLocation === "custom_picked" && pickedDirLabel) {
      return `This PC > 📂 ${pickedDirLabel}`;
    }
    if (saveLocation === "drive_d") return `This PC > Local Disk (D:) > ${customFolderName || "Dokan_Hishab"}`;
    if (saveLocation === "drive_c") return `This PC > Local Disk (C:) > ${customFolderName || "HishabPati_Store"}`;
    if (saveLocation === "drive_e") return `This PC > Backup Drive (E:) > ${customFolderName || "Backup_Accounts"}`;
    if (saveLocation === "drive_usb") return `This PC > USB Drive (F:) > ${customFolderName || "Store_Data"}`;
    if (saveLocation === "desktop") return `This PC > Desktop (ডেস্কটপ) ${customFolderName ? "> " + customFolderName : ""}`;
    if (saveLocation === "downloads") return `This PC > Downloads (ডাউনলোড) ${customFolderName ? "> " + customFolderName : ""}`;
    return `This PC > Documents (ডকুমেন্টস) ${customFolderName ? "> " + customFolderName : ""}`;
  };

  return (
    <div className="bg-card border-b border-border/80 text-foreground transition-all duration-200">
      {/* Hidden File Input for 100% native fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".db,.sqlite,.hishab,.json,application/octet-stream"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Active File Info & Live Auto-Save Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/60 border border-border/70 text-xs">
            <HardDrive className="size-3.5 text-primary shrink-0" />
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-muted-foreground font-medium">ফাইল:</span>
              <span className="font-semibold text-foreground truncate max-w-[160px] sm:max-w-[240px]">
                {meta.fileName || "লোকাল ডাটাবেজ (স্বয়ংক্রিয় সেভ হচ্ছে)"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground hidden sm:flex">
            {meta.isSaving ? (
              <span className="flex items-center gap-1 text-primary font-medium">
                <RefreshCw className="size-3 animate-spin" />
                সেভ হচ্ছে...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="size-3.5" />
                অটো-সেভ সক্রিয় {meta.lastSavedAt && `(${meta.lastSavedAt})`}
              </span>
            )}
          </div>
        </div>

        {/* Right: MS Word Action Toolbar Buttons */}
        <div className="flex items-center gap-2">
          {/* 1. Quick Save Button (Ctrl+S) */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
            onClick={handleSave}
            disabled={isProcessing || meta.isSaving}
            title={meta.fileName ? `সরাসরি "${meta.fileName}" ফাইলে সেভ করুন (Ctrl+S)` : "পিসিতে সেভ এজ ডায়লগ খুলুন (Ctrl+S)"}
          >
            <Save className="size-3.5 text-primary" />
            <span>সেভ (Save)</span>
          </Button>

          {/* 2. Open File Button (Ctrl+O) */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
            onClick={handleOpen}
            disabled={isProcessing}
            title="পিসি থেকে পূর্বের সংরক্ষিত .db ডাটাবেজ ফাইল লোড করুন (Ctrl+O)"
          >
            <FolderOpen className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>ফাইল খুলুন (Open)</span>
          </Button>

          {/* 3. Save As Button (F12) - Opens MS Word Style Save As Dialog */}
          <Button
            size="sm"
            variant="default"
            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
            onClick={prepareSaveAsDialog}
            disabled={isProcessing}
            title="মাইক্রোসফট ওয়ার্ডের মতো সেভ এজ ডায়লগ বক্স ওপেন করুন (F12)"
          >
            <FileSpreadsheet className="size-3.5" />
            <span>সেভ এজ (Save As)</span>
          </Button>

          {/* 4. Open In New Tab Link (For 100% native dialog if in iframe) */}
          {isIframe && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-[11px] text-muted-foreground hover:text-foreground hidden md:inline-flex cursor-pointer"
              onClick={() => window.open(window.location.href, "_blank")}
              title="মাইক্রোসফট ওয়ার্ডের মতো সরাসরি উইন্ডোজ ফাইল ডায়লগ পেতে নতুন ট্যাবে ওপেন করুন"
            >
              <ExternalLink className="size-3" />
              <span>নতুন ট্যাবে</span>
            </Button>
          )}

          {/* 5. Help Info Button */}
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            title="ফাইল সেভ ও ডাটাবেজ নির্দেশিকা"
          >
            <Info className="size-4" />
          </button>
        </div>
      </div>

      {/* Floating Feedback Toast Notification */}
      {msg && (
        <div className="px-3.5 pb-2">
          <div
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium shadow-xs ${
              msg.type === "success"
                ? "bg-emerald-600 text-white"
                : msg.type === "error"
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              {msg.type === "success" ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <Info className="size-4 shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
            <button
              onClick={() => setMsg(null)}
              className="ml-2 rounded px-1 hover:opacity-80 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ================= MS WORD STYLE SAVE AS DIALOG BOX ================= */}
      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0">
                <Save className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  সেভ এজ (Save As)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  মাইক্রোসফট ওয়ার্ডের মতো আপনার কম্পিউটারের ড্রাইভ বা ফোল্ডার নির্বাচন করে ডাটাবেজ সংরক্ষণ করুন।
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            {/* 1. Address / Breadcrumb Bar (Windows Explorer Style) */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                লোকেশন পাথ (Address / Path):
              </Label>
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-1.5 font-mono text-xs text-foreground select-all">
                <Compass className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold truncate">{getLocationBreadcrumb()}</span>
              </div>
            </div>

            {/* 2. Location & Drive Selection Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FolderTree className="size-3.5 text-primary" />
                  <span>পিসির লোকেশন বা ড্রাইভ নির্বাচন করুন (Location / Drive)</span>
                </Label>

                {/* Browse Custom Folder Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBrowseFolder}
                  className="h-7 text-xs gap-1.5 text-primary border-primary/40 hover:bg-primary/10 cursor-pointer"
                  title="আপনার কম্পিউটারের যেকোনো ফোল্ডার সরাসরি সিলেক্ট করুন"
                >
                  <FolderOpen className="size-3.5" />
                  <span>📂 পিসি থেকে ফোল্ডার ব্রাউজ করুন...</span>
                </Button>
              </div>

              {/* Location Selector Grid (MS Word Style) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Custom Picked Folder (if selected) */}
                {pickedDirLabel && (
                  <button
                    type="button"
                    onClick={() => setSaveLocation("custom_picked")}
                    className={`col-span-2 sm:col-span-4 flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      saveLocation === "custom_picked"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500"
                        : "border-border hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold">ব্রাউজ করা ফোল্ডার: </span>
                        <span className="font-mono text-xs">{pickedDirLabel}</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded shrink-0">
                      সক্রিয়
                    </span>
                  </button>
                )}

                {/* Quick Access Folders */}
                <button
                  type="button"
                  onClick={() => setSaveLocation("documents")}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    saveLocation === "documents"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
                      : "border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <Folder className="size-3.5 text-amber-500" />
                    <span>Documents</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">ডকুমেন্টস ফোল্ডার</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSaveLocation("desktop")}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    saveLocation === "desktop"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
                      : "border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <Monitor className="size-3.5 text-blue-500" />
                    <span>Desktop</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">ডেস্কটপ ফোল্ডার</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSaveLocation("downloads")}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    saveLocation === "downloads"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
                      : "border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <Download className="size-3.5 text-emerald-500" />
                    <span>Downloads</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">ডাউনলোড ফোল্ডার</span>
                </button>

                {/* Local Hard Drives */}
                <button
                  type="button"
                  onClick={() => setSaveLocation("drive_d")}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    saveLocation === "drive_d"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
                      : "border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <HardDrive className="size-3.5 text-purple-500" />
                    <span>Data (D:)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">লোকাল ডিস্ক D:</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSaveLocation("drive_c")}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    saveLocation === "drive_c"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
                      : "border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <HardDrive className="size-3.5 text-indigo-500" />
                    <span>System (C:)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">লোকাল ডিস্ক C:</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSaveLocation("drive_e")}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    saveLocation === "drive_e"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
                      : "border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <HardDrive className="size-3.5 text-cyan-500" />
                    <span>Backup (E:)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">ব্যাকআপ ডিস্ক E:</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSaveLocation("drive_usb")}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    saveLocation === "drive_usb"
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/40"
                      : "border-border text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <HardDrive className="size-3.5 text-orange-500" />
                    <span>USB (F:)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">পেনড্রাইভ / ইউএসবি</span>
                </button>
              </div>

              {/* Sub-folder Name Input */}
              <div className="pt-1">
                <Label htmlFor="custom-folder" className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <FolderPlus className="size-3" />
                  <span>কাস্টম ফোল্ডারের নাম (ঐচ্ছিক):</span>
                </Label>
                <Input
                  id="custom-folder"
                  value={customFolderName}
                  onChange={(e) => setCustomFolderName(e.target.value)}
                  placeholder="যেমন: দোকানের_হিসাব_২০২৬"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            {/* 3. File Name Input */}
            <div className="space-y-1.5">
              <Label htmlFor="save-file-name" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>ফাইলের নাম (File Name):</span>
                <span className="text-muted-foreground text-[11px]">এক্সটেনশন: .{fileFormat}</span>
              </Label>
              <div className="flex items-center rounded-md border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-ring">
                <Input
                  id="save-file-name"
                  value={fileNameInput}
                  onChange={(e) => setFileNameInput(e.target.value)}
                  placeholder="যেমন: আমার_দোকান_হিসাব_2026"
                  className="border-0 shadow-none focus-visible:ring-0 text-xs h-9 font-medium"
                />
                <span className="bg-muted px-3 py-2 text-xs font-mono text-muted-foreground border-l border-border select-none">
                  .{fileFormat}
                </span>
              </div>
            </div>

            {/* 4. File Format Selection (Save as type) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                ফাইলের ধরন (Save as type):
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFileFormat("db")}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    fileFormat === "db"
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Database className={`size-4 mt-0.5 shrink-0 ${fileFormat === "db" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <span>SQLite ডাটাবেজ (*.db)</span>
                      <span className="rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1 py-0.2 text-[10px] font-bold">
                        প্রস্তাবিত
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      স্বয়ংসম্পূর্ণ ডাটাবেজ ফাইল। প্রতি এন্ট্রির পর স্বয়ংক্রিয় অটো-সেভ সমর্থিত।
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFileFormat("json")}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    fileFormat === "json"
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <FileText className={`size-4 mt-0.5 shrink-0 ${fileFormat === "json" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <div className="font-semibold text-xs text-foreground">
                      JSON ব্যাকআপ (*.json)
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      সাধারণ টেক্সট ব্যাকআপ ফরম্যাট। অন্য ডিভাইসে সহজে ট্রান্সফারযোগ্য।
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 5. Current State Snapshot Preview */}
            <div className="rounded-lg bg-muted/60 p-3 border border-border flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>দোকান: <strong>{store.shopName || "আমার দোকান"}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                <span>কাস্টমার: <strong>{store.parties.length}</strong></span>
                <span>পণ্য: <strong>{store.products.length}</strong></span>
                <span>মোট লেনদেন: <strong>{store.txns.length}</strong></span>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-muted/40 border-t border-border px-6 py-3 flex-row justify-end gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaveAsOpen(false)}
              disabled={isProcessing}
              className="cursor-pointer"
            >
              বাতিল (Cancel)
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleConfirmSaveAs}
              disabled={isProcessing}
              className="gap-1.5 cursor-pointer shadow-xs"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>সংরক্ষণ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>সংরক্ষণ করুন (Save As)</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help & Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <HardDrive className="size-4 text-primary" />
              <span>ফাইল ও ডাটাবেজ তথ্য</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong>১. সেভ এজ (Save As):</strong> মাইক্রোসফট ওয়ার্ডের মতো <strong>‘সেভ এজ’</strong> বাটনে ক্লিক করলে ডায়লগ বক্স ওপেন হবে যেখানে আপনি পিসির ড্রাইভ (C:, D:, E:), ফোল্ডার ও ফাইলের নাম নির্ধারণ করে <code>.db</code> ফাইল সেভ করতে পারবেন।
            </p>
            <p>
              <strong>২. অটো সেভ (Auto Save):</strong> ফাইলটি সেভ বা ওপেন করার পর আপনি দোকানে যত কেনাবেচা বা হিসাব করবেন, প্রতিটি ক্লিকের পরই তা স্বয়ংক্রিয়ভাবে উক্ত ফাইলে সংরক্ষিত থাকবে।
            </p>
            <p>
              <strong>৩. ফাইল খুলুন (Open):</strong> <strong>‘ফাইল খুলুন’</strong> বাটনে ক্লিক করলে সরাসরি ফাইল এক্সপ্লোরার ওপেন হবে এবং পূর্বে সেভ করা <code>.db</code> ফাইল নির্বাচন করলেই সমস্ত হিসাব নিমেষেই লোড হয়ে যাবে।
            </p>
            <p>
              <strong>৪. কীবোর্ড শর্টকাট:</strong> সেভ করতে <code>Ctrl + S</code>, ফাইল খুলতে <code>Ctrl + O</code> এবং সেভ এজ করতে <code>F12</code> চাপুন।
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
