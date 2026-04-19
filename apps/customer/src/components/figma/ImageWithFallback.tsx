"use client";

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

export function ImageWithFallback({ fallbackClassName, src, alt, style, className, ...rest }: ImageWithFallbackProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  if (!src || status === 'error') {
    return (
      <div
        className={`flex items-center justify-center bg-stone-100 dark:bg-stone-900 ${className ?? ''} ${fallbackClassName ?? ''}`}
        style={style}
      >
        <ImageOff className="w-8 h-8 text-stone-300 dark:text-stone-700" />
      </div>
    );
  }

  return (
    <>
      {status === 'loading' && (
        <div
          className={`animate-pulse bg-stone-200 dark:bg-stone-800 ${className ?? ''}`}
          style={style}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className ?? ''} ${status === 'loading' ? 'invisible absolute' : ''}`}
        style={style}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        {...rest}
      />
    </>
  );
}
