import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import FeedbackCard from "@/components/FeedbackCard"; // NEW: Import FeedbackCard (create if not exists)

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
  getFeedbacksByUserId, // NEW
  getInterviewById, // NEW
} from "@/lib/actions/general.action";

async function Home() {
  const user = await getCurrentUser();

  const [userInterviews, allInterview] = await Promise.all([
    getInterviewsByUserId(user?.id!),
    getLatestInterviews({ userId: user?.id! }),
  ]);

  // NEW: Fetch feedbacks by userId and enrich with interview details
  const feedbacks = await getFeedbacksByUserId({ userId: user?.id! });
  const userFeedbacksWithDetails = feedbacks
    ? await Promise.all(
        feedbacks.map(async (fb) => {
          const interview = await getInterviewById(fb.interviewId);
          if (interview && interview.status === 'completed') {
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
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Start an Interview</Link>
          </Button>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Interviews</h2>

        <div className="interviews-section">
          {hasPastInterviews ? (
            userInterviews?.map((interview) => (
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
            <p>You haven&apos;t taken any interviews yet</p>
          )}
        </div>
      </section>

      {/* NEW: Your Feedbacks Section */}
      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Feedbacks</h2>

        <div className="interviews-section">
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
            <p>No feedback available yet. Complete an interview to get AI insights!</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Take Interviews</h2>

        <div className="interviews-section">
          {hasUpcomingInterviews ? (
            allInterview?.map((interview) => (
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
            <p>There are no interviews available</p>
          )}
        </div>
      </section>
    </>
  );
}

export default Home;