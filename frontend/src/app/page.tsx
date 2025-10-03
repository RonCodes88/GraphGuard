import Earth from "@/components/Earth";
import NetworkViewTest from "@/components/NetworkViewTest";
import MonitoringPanel from "@/components/MonitoringPanel";

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-black relative">
      {/* Main visualization area */}
      <Earth />
      {/* Uncomment the line below to test the network view directly */}
      {/* <NetworkViewTest /> */}
      
      {/* Monitoring panel overlay on the right */}
      <MonitoringPanel />
    </main>
  );
}
