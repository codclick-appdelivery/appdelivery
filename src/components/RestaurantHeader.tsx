
import React from "react";

const RestaurantHeader: React.FC = () => {
  return (
    <div className="relative">
      <div className="h-48 sm:h-64 w-full bg-gradient-to-r from-brand-700 to-brand overflow-hidden">
        <img
          src="/images/restaurant-banner.jpg"
          alt="Sabor Delivery Fácil"
          className="w-full h-full object-cover mix-blend-overlay opacity-50"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
      </div>
      <div className="container mx-auto px-4 relative -mt-16 sm:-mt-24 z-10 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md mr-0 sm:mr-6 mb-4 sm:mb-0">
              <img
                src="/images/logo_delivery_2.png"
                alt="Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.svg";
                }}
              />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">App Delivery</h1>
              <p className="text-gray-600 mt-1">Delivery Facil e Rápido</p>
              <p className="text-gray-600 mt-1"><b>Sua Plataforma de Delivery</b></p>
              <div className="flex items-center justify-center sm:justify-start mt-2">
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <span className="text-gray-600 ml-2">4.8 (120+)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantHeader;
