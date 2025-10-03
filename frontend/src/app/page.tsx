"use client";

import { useState } from "react";
import Earth from "@/components/Earth";
import NetworkViewTest from "@/components/NetworkViewTest";
import MonitoringPanel from "@/components/MonitoringPanel";


export default function Home() {
  const [isCountryViewActive, setIsCountryViewActive] = useState(false);


  return (
    <main className="w-full h-screen overflow-hidden bg-black relative">
      {/* Main visualization area */}
      <Earth 
        onCountryViewChange={setIsCountryViewActive}
      />
      {/* Uncomment the line below to test the network view directly */}
      {/* <NetworkViewTest /> */}
      
      {/* Monitoring panel overlay on the right - hidden during country view */}
      {!isCountryViewActive && <MonitoringPanel />}
      
    </main>
  );
}
