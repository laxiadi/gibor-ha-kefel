const PHOTO_SIZE = 256;
const JPEG_QUALITY = 0.82;

type Source = HTMLVideoElement | HTMLImageElement;

function sourceSize(source: Source): { width: number; height: number } {
  return source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.naturalWidth, height: source.naturalHeight };
}

/** Centre-crops to a square and shrinks it, so the saved value stays small enough for localStorage. */
function toSquarePhoto(source: Source, mirror: boolean): string | null {
  const { width, height } = sourceSize(source);
  if (!width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  if (mirror) {
    context.translate(PHOTO_SIZE, 0);
    context.scale(-1, 1);
  }
  const side = Math.min(width, height);
  context.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function readFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode failed"));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Opens the selfie dialog and resolves with a base64 JPEG, or null if the user backs out.
 * The photo never leaves the device; the caller stores it in localStorage.
 */
export function openFaceCapture(): Promise<string | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "face-dialog";
    dialog.setAttribute("aria-labelledby", "face-title");
    dialog.innerHTML = `
      <h2 id="face-title">הפנים של הגיבור</h2>
      <p class="face-status" role="status">מפעילים את המצלמה…</p>
      <div class="face-stage">
        <video class="face-video" playsinline autoplay muted></video>
        <img class="face-shot" alt="תצוגה מקדימה של הפנים" hidden>
        <span class="face-frame" aria-hidden="true"></span>
      </div>
      <div class="face-actions">
        <button type="button" class="btn btn-primary" data-face="shoot">📸 צילום</button>
        <button type="button" class="btn btn-primary" data-face="save" hidden>✓ זה אני!</button>
        <button type="button" class="btn" data-face="retake" hidden>↻ שוב</button>
        <label class="btn face-pick">🖼️ מהגלריה<input type="file" accept="image/*" hidden></label>
        <button type="button" class="btn danger" data-face="cancel">ביטול</button>
      </div>`;
    document.body.appendChild(dialog);

    const video = dialog.querySelector<HTMLVideoElement>(".face-video")!;
    const shot = dialog.querySelector<HTMLImageElement>(".face-shot")!;
    const status = dialog.querySelector<HTMLElement>(".face-status")!;
    const fileInput = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
    const button = (name: string) => dialog.querySelector<HTMLElement>(`[data-face="${name}"]`)!;
    let stream: MediaStream | null = null;
    let pending: string | null = null;
    let settled = false;

    const finish = (value: string | null): void => {
      if (settled) return;
      settled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(value);
    };

    const showReview = (photo: string): void => {
      pending = photo;
      shot.src = photo;
      shot.hidden = false;
      video.hidden = true;
      button("shoot").hidden = true;
      button("save").hidden = false;
      button("retake").hidden = false;
      status.textContent = "אוהבים את התמונה? אפשר גם לצלם שוב.";
    };

    const showLive = (): void => {
      pending = null;
      shot.hidden = true;
      video.hidden = false;
      button("shoot").hidden = false;
      button("save").hidden = true;
      button("retake").hidden = true;
      status.textContent = "מסתכלים למצלמה ולוחצים על צילום.";
    };

    dialog.addEventListener("click", (event) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>("[data-face]")?.dataset.face;
      if (action === "cancel") finish(null);
      else if (action === "save" && pending) finish(pending);
      else if (action === "retake") showLive();
      else if (action === "shoot") {
        const photo = toSquarePhoto(video, true);
        if (photo) showReview(photo);
        else status.textContent = "הצילום לא הצליח — נסו שוב או בחרו תמונה מהגלריה.";
      }
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      readFile(file)
        .then((image) => {
          const photo = toSquarePhoto(image, false);
          if (photo) showReview(photo);
          else status.textContent = "לא הצלחנו לקרוא את התמונה.";
        })
        .catch(() => {
          status.textContent = "לא הצלחנו לקרוא את התמונה.";
        });
    });

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(null);
    });

    dialog.showModal();

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (settled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        showLive();
      } catch {
        button("shoot").hidden = true;
        status.textContent = "אין גישה למצלמה. אפשר לבחור תמונה מהגלריה.";
      }
    })();
  });
}
