/**
 * Demo component showing how to use the network traffic stream
 * This component demonstrates real-time network visualization with streaming data
 */

'use client';

import { useNetworkStream } from '@/hooks/useNetworkStream';
import { useState } from 'react';

export default function NetworkStreamDemo() {
  const [duration, setDuration] = useState(60); // 1 minute default for demo
  const [interval, setInterval] = useState(2); // 2 seconds between batches

  const {
    isConnected,
    isStreaming,
    currentData,
    allData,
    batchNumber,
    elapsedTime,
    remainingTime,
    connect,
    disconnect,
    clearHistory,
    error
  } = useNetworkStream({
    interval,
    duration,
    autoConnect: false,
    onTraffic: (data) => {
      console.log('New traffic batch received:', data);
      // Here you would update your 3D visualization
    },
    onComplete: () => {
      console.log('Streaming completed!');
    },
    onError: (err) => {
      console.error('Stream error:', err);
    }
  });

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Network Traffic Stream Demo</h1>
        
        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Stream Controls</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-2">Duration (seconds)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                disabled={isStreaming}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 disabled:opacity-50"
                min="10"
                max="600"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Interval (seconds)</label>
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                disabled={isStreaming}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 disabled:opacity-50"
                min="0.5"
                max="10"
                step="0.5"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={connect}
              disabled={isStreaming}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition"
            >
              {isStreaming ? 'Streaming...' : 'Start Stream'}
            </button>
            
            <button
              onClick={disconnect}
              disabled={!isStreaming}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition"
            >
              Stop Stream
            </button>
            
            <button
              onClick={clearHistory}
              disabled={isStreaming}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition"
            >
              Clear History
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-400">Connection</div>
              <div className={`font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? '● Connected' : '○ Disconnected'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Batches</div>
              <div className="font-semibold">{batchNumber}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Elapsed</div>
              <div className="font-semibold">{elapsedTime}s</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Remaining</div>
              <div className="font-semibold">{remainingTime}s</div>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200">
              <strong>Error:</strong> {error.message}
            </div>
          )}
        </div>

        {/* Current Data */}
        {currentData && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Traffic - {currentData.country}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded p-3">
                <div className="text-sm text-gray-400">Nodes</div>
                <div className="text-2xl font-bold">{currentData.nodes.length}</div>
              </div>
              <div className="bg-gray-700 rounded p-3">
                <div className="text-sm text-gray-400">Connections</div>
                <div className="text-2xl font-bold">{currentData.edges.length}</div>
              </div>
              <div className="bg-red-900/30 border border-red-600 rounded p-3">
                <div className="text-sm text-red-400">Attacks</div>
                <div className="text-2xl font-bold text-red-400">{currentData.attack_count}</div>
              </div>
              <div className="bg-yellow-900/30 border border-yellow-600 rounded p-3">
                <div className="text-sm text-yellow-400">Suspicious</div>
                <div className="text-2xl font-bold text-yellow-400">{currentData.suspicious_count}</div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-700 rounded">
              <div className="text-sm text-gray-400 mb-1">Traffic Volume</div>
              <div className="text-lg font-semibold">{currentData.total_traffic.toLocaleString()} bytes</div>
            </div>
          </div>
        )}

        {/* History Summary */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Session History</h2>
          <div className="text-gray-300">
            <p>Total batches received: <strong>{allData.length}</strong></p>
            <p className="mt-2">
              Countries seen: <strong>
                {[...new Set(allData.map(d => d.country))].join(', ') || 'None'}
              </strong>
            </p>
            {allData.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-gray-400">Total Statistics</div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-xs text-gray-400">Total Attacks</div>
                    <div className="font-bold text-red-400">
                      {allData.reduce((sum, d) => sum + d.attack_count, 0)}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-xs text-gray-400">Total Suspicious</div>
                    <div className="font-bold text-yellow-400">
                      {allData.reduce((sum, d) => sum + d.suspicious_count, 0)}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-xs text-gray-400">Total Normal</div>
                    <div className="font-bold text-green-400">
                      {allData.reduce((sum, d) => sum + d.normal_count, 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 p-4 bg-purple-900/20 border border-purple-600 rounded">
          <h3 className="font-semibold mb-2">💡 Integration Tip</h3>
          <p className="text-sm text-gray-300">
            To integrate with your 3D Earth visualization, use the <code className="bg-gray-700 px-2 py-1 rounded">onTraffic</code> callback 
            to receive real-time network data and update your Three.js scene with new nodes and edges.
          </p>
        </div>
      </div>
    </div>
  );
}

