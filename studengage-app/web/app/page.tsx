import { loadHomeData } from "@/components/home/data";
import { DemoEntry } from "@/components/home/DemoEntry";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Impact } from "@/components/home/Impact";
import { Problem } from "@/components/home/Problem";
import { SiteFooter, SiteHeader } from "@/components/home/SiteChrome";
import { Trust } from "@/components/home/Trust";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { ready, impact, preview } = loadHomeData();

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          <Hero ready={ready} preview={preview} />
          <Problem />
          <HowItWorks />
        </div>
        <Impact impact={impact} />
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          <Trust />
          <DemoEntry ready={ready} error={error} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
