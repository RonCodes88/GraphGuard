import Earth from "@/components/Earth";
import NetworkViewTest from "@/components/NetworkViewTest";

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-black">
      <Earth />
      {/* Uncomment the line below to test the network view directly */}
      {/* <NetworkViewTest /> */}
    </main>
  );
}
