"use client";

import { useRef, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  label: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  className?: string;
}

export function SignaturePad({ label, value, onChange, className }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleEnd = useCallback(() => {
    if (sigRef.current) {
      const dataUrl = sigRef.current.toDataURL("image/png");
      onChange(dataUrl);
    }
  }, [onChange]);

  const handleClear = useCallback(() => {
    sigRef.current?.clear();
    onChange(undefined);
  }, [onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-7 px-2 text-xs text-muted-foreground gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
      <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-white dark:bg-background">
        <SignatureCanvas
          ref={sigRef}
          penColor="#071A3A"
          canvasProps={{
            width: 400,
            height: 120,
            className: "signature-canvas w-full",
            style: { width: "100%", height: "120px" },
          }}
          onEnd={handleEnd}
        />
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground">Sign here</p>
          </div>
        )}
      </div>
      {value && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full" />
          Signature captured
        </p>
      )}
    </div>
  );
}
