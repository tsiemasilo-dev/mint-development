import React, { useState, useEffect } from "react";

const QuickActionsCarousel = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const carouselItems = items || [
    { id: 1, label: "Item 1", description: "Quick action item", image: "/carousel/item-1.jpg", onClick: null },
    { id: 2, label: "Item 2", description: "Quick action item", image: "/carousel/item-2.jpg", onClick: null },
    { id: 3, label: "Item 3", description: "Quick action item", image: "/carousel/item-3.jpg", onClick: null },
    { id: 4, label: "Item 4", description: "Quick action item", image: "/carousel/item-4.jpg", onClick: null },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [carouselItems.length]);

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="w-full relative">
      {/* Carousel Container */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="flex gap-4">
          {carouselItems.map((item, index) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full flex-shrink-0 transform transition-opacity duration-500 ease-in-out ${
                index === currentIndex ? "opacity-100" : "opacity-0 hidden"
              }`}
              type="button"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.label}
                  className="h-48 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="h-48 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 flex flex-col items-center justify-center gap-3 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
                    <span className="text-xs font-bold text-slate-600">
                      {item.id}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-600">{item.description}</p>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Dot Indicators - Overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center gap-2 z-10">
          {carouselItems.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-6 bg-slate-500"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Go to item ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsCarousel;
