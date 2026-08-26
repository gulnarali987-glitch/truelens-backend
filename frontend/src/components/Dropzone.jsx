import React, { useCallback, useRef, useState } from "react";
import { Upload, ImageIcon, X } from "lucide-react";

export default function Dropzone({ onFile, testid = "dropzone", accept = "image/*", label = "Drop image, tap to upload" }) {
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const handle = useCallback((file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onFile(file);
  }, [onFile]);

  const clear = () => { setPreview(null); onFile(null); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <div
      className={`dashed-drop rounded-3xl p-8 md:p-12 text-center cursor-pointer ${drag ? "drag" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
      onClick={() => inputRef.current?.click()}
      data-testid={testid}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
        data-testid={`${testid}-input`}
      />
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="preview" className="max-h-64 rounded-2xl mx-auto" />
          <button
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="absolute -top-2 -right-2 bg-[#1B2340] text-white rounded-full h-8 w-8 flex items-center justify-center"
            data-testid={`${testid}-clear`}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-[#1B2340]/5 flex items-center justify-center">
            <Upload size={22} className="text-[#1B2340]" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">{label}</div>
            <div className="text-sm opacity-60 mt-1">PNG, JPG, WEBP — up to ~10 MB</div>
          </div>
        </div>
      )}
    </div>
  );
}
