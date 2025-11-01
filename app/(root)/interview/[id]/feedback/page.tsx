'use client'; // Keep client for hooks and interactivity

import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";

// Type for feedback data
interface Feedback {
  id: string;
  totalScore: number;
  createdAt: string;
  role: string;
  categoryScores: Array<{ name: string; score: number; comment: string }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
}

interface Interview {
  id: string;
  role: string;
}

// Inline SVG Components (from Heroicons, outline style)
const FeedbackIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertTriangleIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-2.948-1.5-3.816 0L2.697 16.126z" />
  </svg>
);

const ArrowLeftIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

const PlayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);

const FeedbackPage = () => {
  const params = useParams();
  const id = params?.id as string;
  const [user, setUser] = useState<any>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (!currentUser?.id) {
          window.location.href = "/"; // Client-side redirect
          return;
        }

        const interviewData = await getInterviewById(id);
        if (!interviewData) {
          window.location.href = "/";
          return;
        }
        setInterview(interviewData);

        const feedbackData = await getFeedbackByInterviewId({
          interviewId: id,
          userId: currentUser.id,
        });
        setFeedback(feedbackData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-4xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </section>
    );
  }

  if (!interview || !feedback) {
    return null; // Or error state
  }

  return (
    <>
    <section className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-4xl font-bold text-center text-gray-900 dark:text-white flex items-center justify-center gap-3">
              <FeedbackIcon className="w-10 h-10 drop-shadow-lg" />
              Feedback Report
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300 text-lg">
              Detailed analysis for your <span className="font-bold capitalize text-primary-600 dark:text-primary-400">{interview.role}</span> Mock Interview
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Overall Impression & Date */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm group cursor-pointer">
            <CardContent className="pt-8 pb-8 flex items-center gap-5 group-hover:scale-105 transition-transform duration-300">
              <div className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full shadow-lg group-hover:rotate-12 transition-transform duration-500">
                <Image src="/star.svg" width={28} height={28} alt="Star" className="filter brightness-0 invert drop-shadow-sm" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Overall Impression</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {feedback.totalScore}
                  <span className="text-xl font-normal text-gray-500"> /100</span>
                </p>
                <Badge variant="secondary" className="mt-2 hover:bg-secondary/80 transition-colors duration-200">
                  {Math.round((feedback.totalScore / 100) * 100)}% Achievement
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm group cursor-pointer">
            <CardContent className="pt-8 pb-8 flex items-center gap-5 group-hover:scale-105 transition-transform duration-300">
              <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full shadow-lg group-hover:rotate-6 transition-transform duration-500">
                <Image src="/calendar.svg" width={28} height={28} alt="Calendar" className="filter brightness-0 invert drop-shadow-sm" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Completed On</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Final Assessment */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              Final Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-lg hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200">
              {feedback.finalAssessment || "No detailed assessment available."}
            </p>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Interview Breakdown</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">Category-wise performance scores and insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {feedback.categoryScores?.map((category, index) => (
              <div key={index} className="group border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-300 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
                    {index + 1}. {category.name}
                  </h3>
                  <Badge 
                    variant={category.score >= 70 ? "default" : "secondary"} 
                    className="text-sm hover:scale-105 transition-transform duration-200"
                  >
                    {category.score}/100
                  </Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">
                  {category.comment}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-700 ease-out group-hover:from-primary-600 group-hover:to-primary-700`}
                    style={{ width: `${(category.score / 100) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Strengths */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircleIcon className="w-6 h-6 hover:rotate-12 transition-transform duration-300" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
            {feedback.strengths?.length ? (
              feedback.strengths.map((strength, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs justify-start hover:bg-green-50 dark:hover:bg-green-950/50 hover:scale-105 transition-all duration-200 border-green-200 dark:border-green-800"
                >
                  ✓ {strength}
                </Badge>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic col-span-full text-center py-4">No strengths highlighted yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangleIcon className="w-6 h-6 hover:rotate-12 transition-transform duration-300" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {feedback.areasForImprovement?.length ? (
              <ul className="space-y-2">
                {feedback.areasForImprovement.map((area, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 p-2 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950/50">
                    <span className="text-orange-500 mt-1 flex-shrink-0">•</span>
                    {area}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic text-center py-4">Keep up the great work! No areas noted.</p>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6">
          <Button 
            asChild 
            className="h-14 bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
          >
            <Link href="/" className="w-full flex items-center justify-center gap-2">
              <ArrowLeftIcon className="group-hover:translate-x-1 transition-transform duration-300" />
              Back to Home
            </Link>
          </Button>

          <Button 
            asChild 
            className="h-14 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
          >
            <Link href={`/interview/${id}`} className="w-full flex items-center justify-center gap-2">
              <PlayIcon className="group-hover:scale-110 transition-transform duration-300" />
              Retake Interview
            </Link>
          </Button>
        </div>
      </div>
    </section>
    <Footer />
    </>
  );
};

export default FeedbackPage;