'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface CarouselProps {
  images: string[];
  interval?: number;
}

export default function ImageCarousel({
  images,
  interval = 5000,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval]);

  if (images.length === 0) {
    return (
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-teal-100 via-cyan-50 to-sky-100" />
        <div className="relative overflow-hidden rounded-3xl bg-white h-[500px] flex items-center justify-center shadow-xl shadow-teal-900/10">
          <p className="text-slate-500">No images to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-teal-100 via-cyan-50 to-sky-100" />
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-teal-900/10">
        {/* Image Container */}
        <div className="relative h-[500px] w-full bg-white">
          {/* Subtle Side Fade Overlay */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl bg-gradient-to-r from-black/5 via-transparent to-black/5" style={{ zIndex: 10 }} />
          {images.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={image}
                alt={`Carousel image ${index + 1}`}
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 42vw"
                priority={index === 0}
              />
            </div>
          ))}
        </div>

        {/* Indicators */}
        <div className="flex justify-center gap-2 bg-white px-4 py-3">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-6 bg-teal-700'
                  : 'w-2 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
