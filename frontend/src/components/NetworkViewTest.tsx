"use client";

import { useState } from "react";
import EnhancedNetworkView from "./EnhancedNetworkView";

export default function NetworkViewTest() {
  const [showTest, setShowTest] = useState(false);

  if (!showTest) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <button
          onClick={() => setShowTest(true)}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
        >
          Test Enhanced Network View
        </button>
      </div>
    );
  }

  return (
    <EnhancedNetworkView
      country="Test Country"
      onBack={() => setShowTest(false)}
    />
  );
}
