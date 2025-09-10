// components/OptimizedImage.js - Performance optimized image component
import { useState } from 'react'

const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className = '',
  fallback = '/images/placeholder.png' 
}) => {
  const [imgSrc, setImgSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setImgSrc(fallback)
    setIsLoading(false)
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

export default OptimizedImage
