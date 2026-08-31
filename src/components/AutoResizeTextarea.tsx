import * as React from "react";
import { useEffect, useRef, useImperativeHandle, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
  maxHeight?: number;
}

export const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      minHeight = 84,
      maxHeight = 600,
      rows = 3,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(forwardedRef, () => textareaRef.current!);

    const adjustHeight = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      // Reset height to compute natural scrollHeight without shrinking issues
      el.style.height = "auto";
      const scrollHeight = el.scrollHeight;
      const targetHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      el.style.height = `${targetHeight}px`;
      if (scrollHeight > maxHeight) {
        el.style.overflowY = "auto";
      } else {
        el.style.overflowY = "hidden";
      }
    }, [minHeight, maxHeight]);

    useEffect(() => {
      adjustHeight();
    }, [value, defaultValue, adjustHeight]);

    useEffect(() => {
      const handleResize = () => adjustHeight();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return (
      <textarea
        ref={textareaRef}
        value={value}
        defaultValue={defaultValue}
        rows={rows}
        onChange={(e) => {
          adjustHeight();
          onChange?.(e);
        }}
        style={{
          minHeight: `${minHeight}px`,
          ...style,
        }}
        className={cn(
          "field w-full px-4 py-3.5 text-[14px] leading-relaxed rounded-xl transition-[border-color,box-shadow]",
          className,
        )}
        {...props}
      />
    );
  },
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";
