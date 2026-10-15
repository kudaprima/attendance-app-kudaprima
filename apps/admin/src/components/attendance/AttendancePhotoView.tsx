import { useEffect, useState } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { Archive, Camera, Maximize2, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { storage } from "@/lib/firebase";

export interface AttendancePhotoViewProps {
  readonly photoStoragePath?: string | null;
  readonly photoUrl?: string | null;
  readonly capturedAt: string;
  readonly employeeName: string;
  readonly className?: string;
}

const RETENTION_DAYS = 90;

function isPhotoArchived(capturedAtIso: string): boolean {
  try {
    const capturedDate = new Date(capturedAtIso);
    if (Number.isNaN(capturedDate.getTime())) return false;
    const diffMs = Date.now() - capturedDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > RETENTION_DAYS;
  } catch {
    return false;
  }
}

export function AttendancePhotoView({
  photoStoragePath,
  photoUrl: initialPhotoUrl,
  capturedAt,
  employeeName,
  className = "",
}: Readonly<AttendancePhotoViewProps>) {
  const directPathUrl =
    photoStoragePath &&
    (photoStoragePath.startsWith("data:image/") ||
      photoStoragePath.startsWith("http://") ||
      photoStoragePath.startsWith("https://"))
      ? photoStoragePath
      : null;
  const effectiveInitialUrl = initialPhotoUrl ?? directPathUrl;

  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(
    Boolean(!effectiveInitialUrl && photoStoragePath),
  );
  const [loadError, setLoadError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const archived = isPhotoArchived(capturedAt);
  const resolvedUrl = effectiveInitialUrl ?? storageUrl;
  const loading = !effectiveInitialUrl && loadingStorage;

  useEffect(() => {
    if (effectiveInitialUrl || !photoStoragePath || archived) {
      return;
    }

    let isMounted = true;
    Promise.resolve()
      .then(async () => {
        const storageRef = ref(storage, photoStoragePath);
        try {
          return await getDownloadURL(storageRef);
        } catch (initialErr) {
          const currentBucket = storage.app.options.storageBucket;
          const alternateBucket = currentBucket?.includes("firebasestorage.app")
            ? currentBucket.replace(".firebasestorage.app", ".appspot.com")
            : currentBucket?.replace(".appspot.com", ".firebasestorage.app");
          if (alternateBucket) {
            const fallbackRef = ref(
              storage,
              `gs://${alternateBucket}/${photoStoragePath}`,
            );
            return await getDownloadURL(fallbackRef);
          }
          throw initialErr;
        }
      })
      .then((url) => {
        if (isMounted) {
          setStorageUrl(url);
          setLoadingStorage(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(true);
          setLoadingStorage(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [effectiveInitialUrl, photoStoragePath, archived]);

  // Handle ESC key for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen]);

  if (archived) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-center text-muted-foreground ${className}`}
      >
        <Archive className="size-8 stroke-1 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-medium">Foto Diarsipkan</p>
        <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">
          Foto telah diarsipkan sesuai kebijakan retensi data (3 bulan).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/30 p-8 text-center text-muted-foreground animate-pulse ${className}`}
      >
        <Camera className="size-8 stroke-1 text-muted-foreground/40 mb-2 animate-bounce" />
        <p className="text-xs font-medium text-muted-foreground">
          Memuat foto presensi...
        </p>
      </div>
    );
  }

  if (loadError || !resolvedUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-center text-muted-foreground ${className}`}
      >
        <Camera className="size-8 stroke-1 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium">Foto Tidak Tersedia</p>
        <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">
          Foto selfie tidak ditemukan atau gagal dimuat dari penyimpanan cloud.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative block w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 transition-all hover:border-border"
          aria-label={`Perbesar foto presensi ${employeeName}`}
        >
          <div className="relative aspect-4/3 w-full overflow-hidden bg-black/5">
            <img
              src={resolvedUrl}
              alt={`Foto presensi selfie ${employeeName}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setLoadError(true)}
            />
            {/* Minimalist hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100">
              <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-md">
                <ZoomIn className="size-3.5 text-secondary" />
                Perbesar Foto
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Camera className="size-3 text-muted-foreground/70" />
            Foto Terverifikasi
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setLightboxOpen(true)}
          >
            <Maximize2 className="size-3 mr-1" />
            Lihat Penuh
          </Button>
        </div>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          aria-label={`Tampilan foto penuh ${employeeName}`}
          className="max-w-2xl border border-white/10 bg-black/90 p-4 text-white backdrop-blur-md shadow-2xl sm:rounded-2xl"
          showCloseButton={false}
        >
          <DialogHeader className="flex flex-row items-center justify-between pb-2 text-left space-y-0">
            <div>
              <DialogTitle className="text-sm font-semibold text-white">
                Tampilan foto penuh {employeeName}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/70">
                Foto Presensi Terverifikasi
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-white/80 hover:bg-white/20 hover:text-white"
              onClick={() => setLightboxOpen(false)}
              aria-label="Tutup foto penuh"
            >
              <X className="size-5" />
            </Button>
          </DialogHeader>

          <div className="relative flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <img
              src={resolvedUrl}
              alt={`Tampilan penuh foto selfie ${employeeName}`}
              className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
