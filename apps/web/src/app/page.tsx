import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { DemoReel } from "@/components/landing/DemoReel";
import { Capabilities } from "@/components/landing/Capabilities";
import { Workflows } from "@/components/landing/Workflows";
import { Walkthrough } from "@/components/landing/Walkthrough";
import { Compare } from "@/components/landing/Compare";
import { Platforms } from "@/components/landing/Platforms";
import { Faq, FinalCta, Footer, Principles } from "@/components/landing/Closing";

export default function Home() {
  return (
    <main className="flex-1">
      <Nav />
      <Hero />
      <DemoReel />
      <Capabilities />
      <Workflows />
      <Walkthrough />
      <Compare />
      <Platforms />
      <Principles />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
