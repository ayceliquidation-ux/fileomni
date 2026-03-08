"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft, Ruler, Scale, Thermometer, FlaskConical } from "lucide-react";

type Category = "Length" | "Weight" | "Temperature" | "Volume";

interface Unit {
  id: string;
  name: string;
  symbol: string;
  ratioToBase: number; // For everything except temperature
}

const CATEGORIES: Record<Category, { icon: React.ReactNode; units: Unit[] }> = {
  Length: {
    icon: <Ruler className="w-5 h-5" />,
    units: [
      { id: "m", name: "Meter", symbol: "m", ratioToBase: 1 },
      { id: "km", name: "Kilometer", symbol: "km", ratioToBase: 1000 },
      { id: "cm", name: "Centimeter", symbol: "cm", ratioToBase: 0.01 },
      { id: "mm", name: "Millimeter", symbol: "mm", ratioToBase: 0.001 },
      { id: "mi", name: "Mile", symbol: "mi", ratioToBase: 1609.344 },
      { id: "yd", name: "Yard", symbol: "yd", ratioToBase: 0.9144 },
      { id: "ft", name: "Foot", symbol: "ft", ratioToBase: 0.3048 },
      { id: "in", name: "Inch", symbol: "in", ratioToBase: 0.0254 },
    ]
  },
  Weight: {
    icon: <Scale className="w-5 h-5" />,
    units: [
      { id: "g", name: "Gram", symbol: "g", ratioToBase: 1 },
      { id: "kg", name: "Kilogram", symbol: "kg", ratioToBase: 1000 },
      { id: "mg", name: "Milligram", symbol: "mg", ratioToBase: 0.001 },
      { id: "t", name: "Metric Ton", symbol: "t", ratioToBase: 1000000 },
      { id: "lb", name: "Pound", symbol: "lb", ratioToBase: 453.59237 },
      { id: "oz", name: "Ounce", symbol: "oz", ratioToBase: 28.349523125 },
    ]
  },
  Volume: {
    icon: <FlaskConical className="w-5 h-5" />,
    units: [
      { id: "l", name: "Liter", symbol: "L", ratioToBase: 1 },
      { id: "ml", name: "Milliliter", symbol: "mL", ratioToBase: 0.001 },
      { id: "m3", name: "Cubic Meter", symbol: "m³", ratioToBase: 1000 },
      { id: "gal", name: "US Gallon", symbol: "gal", ratioToBase: 3.785411784 },
      { id: "qt", name: "US Quart", symbol: "qt", ratioToBase: 0.946352946 },
      { id: "pt", name: "US Pint", symbol: "pt", ratioToBase: 0.473176473 },
      { id: "cup", name: "US Cup", symbol: "cup", ratioToBase: 0.236588236 },
      { id: "floz", name: "US Fluid Ounce", symbol: "fl oz", ratioToBase: 0.0295735295625 },
    ]
  },
  Temperature: {
    icon: <Thermometer className="w-5 h-5" />,
    units: [
      { id: "c", name: "Celsius", symbol: "°C", ratioToBase: 1 },
      { id: "f", name: "Fahrenheit", symbol: "°F", ratioToBase: 1 },
      { id: "k", name: "Kelvin", symbol: "K", ratioToBase: 1 },
    ]
  }
};

const convertTemperature = (value: number, fromId: string, toId: string): number => {
  if (fromId === toId) return value;
  
  // Convert everything to Celsius first
  let celsius = value;
  if (fromId === "f") celsius = (value - 32) * 5/9;
  else if (fromId === "k") celsius = value - 273.15;
  
  // Convert Celsius to target
  if (toId === "f") return (celsius * 9/5) + 32;
  if (toId === "k") return celsius + 273.15;
  return celsius;
};

export default function UnitHub() {
  const [category, setCategory] = useState<Category>("Length");
  const [fromUnit, setFromUnit] = useState<string>(CATEGORIES.Length.units[0].id);
  const [toUnit, setToUnit] = useState<string>(CATEGORIES.Length.units[1].id);
  const [inputValue, setInputValue] = useState<string>("1");
  const [result, setResult] = useState<number>(0);

  // Re-initialize units when category changes
  useEffect(() => {
    const units = CATEGORIES[category].units;
    setFromUnit(units[0].id);
    setToUnit(units[1].id);
  }, [category]);

  // Calculate result whenever inputs change
  useEffect(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) {
      setResult(0);
      return;
    }

    if (category === "Temperature") {
      setResult(convertTemperature(val, fromUnit, toUnit));
      return;
    }

    // Standard ratio-based conversion
    const units = CATEGORIES[category].units;
    const fromDef = units.find(u => u.id === fromUnit);
    const toDef = units.find(u => u.id === toUnit);

    if (fromDef && toDef) {
       // Convert from unit to base, then base to target unit
       const baseConverted = val * fromDef.ratioToBase;
       const finalConverted = baseConverted / toDef.ratioToBase;
       setResult(finalConverted);
    }
  }, [inputValue, fromUnit, toUnit, category]);

  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const getUnitSymbol = (unitId: string, currentCategory: Category) => {
    return CATEGORIES[currentCategory].units.find(u => u.id === unitId)?.symbol || "";
  };
  
  const getUnitName = (unitId: string, currentCategory: Category) => {
    return CATEGORIES[currentCategory].units.find(u => u.id === unitId)?.name || "";
  };

  const formatResult = (num: number) => {
    if (num === 0) return "0";
    // Avoid scientific notation for reasonably small/large numbers if possible, 
    // but limit decimal places to avoid floating point artifacts.
    return parseFloat(num.toFixed(4)).toString();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold">Unit Converter Hub</h2>
        <p className="text-gray-400">Instantly convert measurements, weights, and temperatures locally</p>
      </div>

      {/* Category selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
        {(Object.keys(CATEGORIES) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              category === cat 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-[#121214] text-gray-400 hover:bg-white/5 border border-white/5'
            }`}
          >
            {CATEGORIES[cat].icon}
            {cat}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-8 bg-[#121214] border border-white/5 rounded-3xl shadow-xl space-y-6">
        
        {/* Converter Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
          
          {/* FROM Section */}
          <div className="w-full space-y-2">
            <label className="text-sm text-gray-400 font-medium pl-1">From</label>
            <div className="flex flex-row w-full bg-[#0A0A0B] border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
              <input 
                type="number" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0"
                className="flex-1 w-full min-w-0 bg-transparent px-4 py-4 outline-none text-xl font-medium text-ellipsis [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <div className="border-l border-white/10 flex items-center bg-[#18181A] shrink-0">
                <select 
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="bg-transparent pl-4 pr-8 py-4 outline-none appearance-none cursor-pointer font-medium text-blue-400 shrink-0"
                >
                  {CATEGORIES[category].units.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#121214] text-white">
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="pt-6 flex justify-center">
            <button 
              onClick={handleSwap}
              className="p-3 md:p-4 bg-blue-500/10 text-blue-400 rounded-full hover:bg-blue-500/20 active:scale-95 transition-all border border-blue-500/20"
              title="Swap Units"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>
          </div>

          {/* TO Section */}
          <div className="w-full space-y-2">
            <label className="text-sm text-gray-400 font-medium pl-1">To</label>
             <div className="flex flex-row w-full bg-[#0A0A0B] border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
               <input 
                 type="text"
                 readOnly
                 value={formatResult(result)}
                 className="flex-1 w-full min-w-0 bg-transparent px-4 py-4 outline-none text-xl font-medium text-white text-ellipsis opacity-80"
               />
               <div className="border-l border-white/10 flex items-center bg-[#18181A] shrink-0">
                <select 
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="bg-transparent pl-4 pr-8 py-4 outline-none appearance-none cursor-pointer font-medium text-emerald-400 shrink-0"
                >
                  {CATEGORIES[category].units.map(u => (
                    <option key={u.id} value={u.id} className="bg-[#121214] text-white">
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Clear Results Display */}
        <div className="pt-6 border-t border-white/5 flex flex-col items-center justify-center text-center">
             <div className="text-3xl md:text-4xl font-light text-white tracking-tight break-all">
                <span className="font-semibold text-blue-400">{inputValue || "0"}</span> {getUnitSymbol(fromUnit, category)}
                <span className="mx-3 text-gray-500 text-2xl">=</span>
                <span className="font-semibold text-emerald-400">{formatResult(result)}</span> {getUnitSymbol(toUnit, category)}
             </div>
             <p className="mt-2 text-sm text-gray-400">
               {getUnitName(fromUnit, category)} to {getUnitName(toUnit, category)}
             </p>
        </div>
        
      </div>
    </div>
  );
}
