import { useState } from 'react';

export default function ImageWithFallback({ src, alt = '', className = '', style = {}, children = null }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    // Render a visually similar placeholder when image is missing or failed to load
    return (
      <div className={`flex items-center justify-center bg-cream-100 text-sm text-burgundy/50 ${className}`} style={style}>
        {children || 'No image available'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setErrored(true)}
    />
  );
}
