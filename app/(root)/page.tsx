import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import FeedbackCard from "@/components/FeedbackCard";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
  getFeedbacksByUserId,
  getInterviewById,
} from "@/lib/actions/general.action";
import Footer from "@/components/Footer";

async function Home() {
  const user = await getCurrentUser();

  const [userInterviews, allInterview] = await Promise.all([
    getInterviewsByUserId(user?.id!),
    getLatestInterviews({ userId: user?.id! }),
  ]);

  // FIXED: Fetch feedbacks by userId and enrich with interview details (with validation)
  const feedbacks = await getFeedbacksByUserId({ userId: user?.id! });
  const userFeedbacksWithDetails = feedbacks
    ? await Promise.all(
        feedbacks
          .filter(fb => fb.interviewId && fb.interviewId.trim()) // FIXED: Skip invalid IDs
          .map(async (fb) => {
            const interview = await getInterviewById(fb.interviewId!);
            if (interview && interview.status === 'completed' && interview.id) {
              return { ...interview, feedback: fb };
            }
            return null;
          })
      ).then((res) => res.filter(Boolean))
    : [];

  const hasPastInterviews = userInterviews?.length! > 0;
  const hasUpcomingInterviews = allInterview?.length! > 0;
  const hasFeedbacks = userFeedbacksWithDetails.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 overflow-hidden relative">
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-gray-800/20 pointer-events-none"></div>

      {/* Hero Section - Responsive: Full-width on mobile, side-by-side on larger screens */}
      <section className="relative z-10 card-cta flex flex-col lg:flex-row items-center justify-between gap-8 p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
        <div className="flex flex-col gap-6 max-w-lg text-center lg:text-left animate-slide-up">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            Get Interview-Ready with AI-Powered Practice & Feedback
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Practice real interview questions & get instant feedback
          </p>
          <Button 
            asChild 
            className="btn-primary w-full sm:w-auto max-sm:w-full group hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Link href="/interview" className="flex items-center justify-center gap-2">
              Start an Interview
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            </Link>
          </Button>
        </div>
        <div className="relative w-full max-w-md lg:max-w-lg flex-shrink-0 group">
          <div className="relative bg-gradient-to-br from-white/80 to-transparent dark:from-gray-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
            <Image
              src="/robot.png"
              alt="robo-dude"
              width={400}
              height={400}
              className="max-sm:hidden w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500 group-hover:rotate-3"
              priority // Load eagerly for hero
            />
          </div>
        </div>
      </section>

      {/* Your Interviews Section - Responsive Grid */}
      <section className="relative z-10 flex flex-col gap-8 mt-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Your Interviews
          </h2>
        </div>
        <div className="interviews-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hasPastInterviews ? (
            userInterviews
              ?.filter(interview => interview.id && interview.id.trim()) // FIXED: Skip invalid
              .map((interview, index) => (
                <div 
                  key={interview.id} 
                  className={`group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 border border-indigo-100 dark:border-gray-700 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 animate-slide-up ${index % 2 === 0 ? 'animate-delay-200' : 'animate-delay-400'}`}
                >
                  <InterviewCard
                    userId={user?.id}
                    interviewId={interview.id}
                    role={interview.role}
                    type={interview.type}
                    techstack={interview.techstack}
                    createdAt={interview.createdAt}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </div>
              ))
          ) : (
            <div className="col-span-full text-center py-12 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-indigo-900 rounded-2xl p-8 shadow-lg border border-indigo-200/50 dark:border-gray-600/50 animate-slide-up">
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium mb-4">You haven&apos;t taken any interviews yet</p>
              <Button 
                asChild 
                variant="outline" 
                className="border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all duration-200"
              >
                <Link href="/interview/new">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Your Feedbacks Section - Responsive Grid, Card Format */}
      <section className="relative z-10 flex flex-col gap-8 mt-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Your Feedbacks
          </h2>
        </div>
        <div className="interviews-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hasFeedbacks ? (
            userFeedbacksWithDetails?.map((item, index) => (
              <div 
                key={item.id} 
                className={`group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl hover:shadow-purple-500/20 border border-purple-100 dark:border-gray-700 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 animate-slide-up ${index % 2 === 0 ? 'animate-delay-200' : 'animate-delay-400'}`}
              >
                <FeedbackCard
                  interviewId={item.id}
                  role={item.role}
                  type={item.type}
                  techstack={item.techstack}
                  createdAt={item.createdAt}
                  feedback={item.feedback}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-purple-900 rounded-2xl p-8 shadow-lg border border-purple-200/50 dark:border-gray-600/50 animate-slide-up">
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium mb-4">No feedback available yet. Complete an interview to get AI insights!</p>
              <Button 
                asChild 
                variant="outline" 
                className="border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-all duration-200"
              >
                <Link href="/interview">Practice Now</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* NEW: Footer */}
      <Footer />
    </main>
  );
}

export default Home;