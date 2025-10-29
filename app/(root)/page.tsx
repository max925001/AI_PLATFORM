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
    <>
      {/* Hero Section - Responsive: Full-width on mobile, side-by-side on larger screens */}
      <section className="card-cta flex flex-col lg:flex-row items-center justify-between gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-6 max-w-lg text-center lg:text-left">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-base sm:text-lg text-muted-foreground">Practice real interview questions & get instant feedback</p>
          <Button asChild className="btn-primary w-full sm:w-auto max-sm:w-full">
            <Link href="/interview">Start an Interview</Link>
          </Button>
        </div>
        <div className="relative w-full max-w-md lg:max-w-lg flex-shrink-0">
          <Image
            src="/robot.png"
            alt="robo-dude"
            width={400}
            height={400}
            className="max-sm:hidden w-full h-auto object-contain"
            priority // Load eagerly for hero
          />
        </div>
      </section>

      {/* Your Interviews Section - Responsive Grid */}
      <section className="flex flex-col gap-6 mt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Your Interviews</h2>
        <div className="interviews-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {hasPastInterviews ? (
            userInterviews
              ?.filter(interview => interview.id && interview.id.trim()) // FIXED: Skip invalid
              .map((interview) => (
                <InterviewCard
                  key={interview.id}
                  userId={user?.id}
                  interviewId={interview.id}
                  role={interview.role}
                  type={interview.type}
                  techstack={interview.techstack}
                  createdAt={interview.createdAt}
                />
              ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground text-lg py-8">You haven&apos;t taken any interviews yet</p>
          )}
        </div>
      </section>

      {/* Your Feedbacks Section - Responsive Grid, Card Format */}
      <section className="flex flex-col gap-6 mt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center">Your Feedbacks</h2>
        <div className="interviews-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {hasFeedbacks ? (
            userFeedbacksWithDetails?.map((item) => (
              <FeedbackCard
                key={item.id}
                interviewId={item.id}
                role={item.role}
                type={item.type}
                techstack={item.techstack}
                createdAt={item.createdAt}
                feedback={item.feedback}
              />
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground text-lg py-8">No feedback available yet. Complete an interview to get AI insights!</p>
          )}
        </div>
      </section>

      {/* NEW: Footer */}
      <Footer />
    </>
  );
}

export default Home;