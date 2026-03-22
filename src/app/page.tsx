import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
const WhyUs = dynamic(() => import("@/components/WhyUs"));
const Coverage = dynamic(() => import("@/components/Coverage"));
const OnboardingForm = dynamic(() => import("@/components/OnboardingForm"));

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WhyUs />
        <Coverage />
        <OnboardingForm />
      </main>
      <Footer />
    </>
  );
}
