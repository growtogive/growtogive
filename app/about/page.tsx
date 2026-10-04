import Link from 'next/link';
import { Users, ShieldCheck, Sparkles, MapPin, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'About Us | GrowToGive (GTG)',
  description: 'Learn about GrowToGive, established in 2012, and how our community marketplace and directory empower individuals while giving back.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <main className="flex-grow">
        {/* Navigation Bar / Back Button */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <span className="text-xs text-slate-400 font-medium">GrowToGive (GTG)</span>
          </div>
        </div>

        {/* Header Hero Section */}
        <div className="relative bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 text-center overflow-hidden shadow-md">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1920&q=80"
              alt="Diverse community of church people gathering together"
              className="w-full h-full object-cover object-center opacity-30 transform scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-emerald-950/60 to-slate-900/90" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <span className="inline-block bg-emerald-600/95 backdrop-blur-sm text-emerald-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 border border-emerald-500/30">
              Established 2012
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
              ABOUT US
            </h1>
            <p className="text-sm sm:text-base font-bold tracking-wider text-emerald-300 uppercase drop-shadow">
              GROWING OURSELVES, GIVING TO OTHERS
            </p>
          </div>
        </div>

        {/* Story & Mission Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">
                Our Story & Purpose
              </h2>
              <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                Established in 2012, <strong className="text-emerald-700 font-semibold">GrowToGive (GTG)</strong> was founded on a simple yet profound belief: personal growth and community uplifting go hand in hand. 
              </p>
              <p className="text-lg text-slate-600 mb-4 leading-relaxed">
                Over the years, GTG has evolved into a vibrant digital ecosystem connecting neighbors, creators, and community organizations. Whether you are looking for local business services, sharing resources, or offering marketplace support, GTG bridges the gap between personal empowerment and collective generosity.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-emerald-600" />
                What Makes GTG Unique?
              </h3>
              <ul className="space-y-4 text-slate-600">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                  <span><strong>Proximity & Distance Filtering:</strong> Easily find offers, requests, and directory listings right in your neighborhood.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                  <span><strong>Trusted Community Directory:</strong> Verified listings spanning business, services, ministry, and local trades.</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                  <span><strong>Secure Reviews & Roles:</strong> Role-based permissions and robust review systems ensure safe, dependable interactions.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How GTG Helps the Community */}
        <section className="bg-white py-16 border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              How GTG Helps the Community
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
              We empower communities by fostering local trade, mutual aid, and transparent collaboration.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Marketplace Sharing</h3>
                <p className="text-slate-600">
                  Post and discover marketplace offers and requests, making it easy to share surplus goods or find what you need locally.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Directory & Discovery</h3>
                <p className="text-slate-600">
                  Browse categorized local businesses, churches, and services with integrated distance search to support local providers.
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Trust & Accountability</h3>
                <p className="text-slate-600">
                  Build confidence across the community with validated review systems, user roles, and transparent member feedback.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}