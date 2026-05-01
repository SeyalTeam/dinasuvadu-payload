"use client";

import React, { useState, useEffect } from "react";
import { Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudLightning, CloudSnow, Wind } from "lucide-react";

const weatherMap: Record<number, { text: string; icon: any }> = {
  0: { text: "தெள்ளத்தெளிவான வானம்", icon: Sun },
  1: { text: "முக்கியமாக தெளிவானது", icon: Sun },
  2: { text: "பகுதி மேகமூட்டம்", icon: CloudSun },
  3: { text: "மேகமூட்டம்", icon: Cloud },
  45: { text: "மூடுபனி", icon: CloudFog },
  48: { text: "மூடுபனி", icon: CloudFog },
  51: { text: "லேசான தூறல்", icon: CloudDrizzle },
  53: { text: "மிதமான தூறல்", icon: CloudDrizzle },
  55: { text: "பலத்த தூறல்", icon: CloudDrizzle },
  61: { text: "லேசான மழை", icon: CloudRain },
  63: { text: "மிதமான மழை", icon: CloudRain },
  65: { text: "பலத்த மழை", icon: CloudRain },
  71: { text: "லேசான பனிப்பொழிவு", icon: CloudSnow },
  73: { text: "மிதமான பனிப்பொழிவு", icon: CloudSnow },
  75: { text: "பலத்த பனிப்பொழிவு", icon: CloudSnow },
  80: { text: "பெருமழை", icon: CloudRain },
  81: { text: "பெருமழை", icon: CloudRain },
  82: { text: "பெருமழை", icon: CloudRain },
  95: { text: "இடியுடன் கூடிய மழை", icon: CloudLightning },
};

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<{
    city: string;
    temp: number;
    code: number;
    loading: boolean;
    error: boolean;
  }>({
    city: "சென்னை",
    temp: 32,
    code: 0,
    loading: true,
    error: false,
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // 1. Get location via IP (HTTPS friendly)
        const ipRes = await fetch("https://ipapi.co/json/");
        const ipData = await ipRes.json();
        
        const city = ipData.city || "சென்னை";
        const lat = ipData.latitude || 13.0827;
        const lon = ipData.longitude || 80.2707;

        // 2. Get weather via Open-Meteo
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
        );
        const weatherData = await weatherRes.json();

        setWeather({
          city: city === "Chennai" ? "சென்னை" : city,
          temp: Math.round(weatherData.current.temperature_2m),
          code: weatherData.current.weather_code,
          loading: false,
          error: false,
        });
      } catch (err) {
        console.error("Weather fetch error:", err);
        setWeather((prev) => ({ ...prev, loading: false, error: true }));
      }
    };

    fetchWeather();
  }, []);

  const { text, icon: WeatherIcon } = weatherMap[weather.code] || weatherMap[0];

  return (
    <div className="bg-white dark:bg-[#111] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">வானிலை</p>
          <p className={`text-xl font-extrabold text-gray-900 dark:text-white ${weather.loading ? "animate-pulse opacity-50" : ""}`}>
            {weather.city}
          </p>
        </div>
        <div className={`w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center ${weather.loading ? "animate-spin opacity-50" : ""}`}>
          <WeatherIcon size={24} className="text-blue-500" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-4xl font-black text-gray-900 dark:text-white ${weather.loading ? "animate-pulse" : ""}`}>
          {weather.temp}°
        </span>
        <span className={`text-sm font-bold pb-1 text-gray-500 ${weather.loading ? "animate-pulse" : ""}`}>
          {weather.loading ? "ஏற்றப்படுகிறது..." : text}
        </span>
      </div>
    </div>
  );
};
