"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

import { getTechLogos } from "@/lib/utils"; // Assuming this exists for tech icons

// FIXED: Define covers array (adjust paths based on your /public/covers folder)
const COVERS = [
  "/covers/facebook.png",
  "/covers/yahoo.png",
  "/covers/hostinger.png",
  // Add more from your repo's /public/covers (e.g., tech-themed images)
  "/covers/airbnb.png",
  "/covers/netflix.png",
  "/covers/uber.png",
];

interface FeedbackCardProps {
  interviewId: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt: string;
  feedback: {
    totalScore: number;
    finalAssessment: string;
    categoryScores: Array<{ name: string; score: number; comment: string }>;
    strengths: string[];
    areasForImprovement: string[];
  };
}

const FeedbackCard = ({
  interviewId,
  role,
  type,
  techstack,
  createdAt,
  feedback,
}: FeedbackCardProps) => {
  // FIXED: Deterministic cover based on interviewId hash (prevents hydration mismatch)
  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };
  const coverIndex = hashCode(interviewId) % COVERS.length;
  const coverImage = COVERS[coverIndex]; // Same on server/client

  const formattedDate = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <Link href={`/interview/${interviewId}/feedback`} className="card-interview group relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl transition-all hover:shadow-2xl hover:-translate-y-2">
      {/* Cover Image */}
      <div className="relative h-48 w-full">
        <Image
          src={coverImage}
          alt={`${role} interview`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw" // Responsive sizes
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white">{role}</h3>
          <p className="text-sm text-white/80">{type} Interview</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Score Badge */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1">
            <span className="text-sm text-muted-foreground">Score</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{feedback.totalScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 p-2">
            <span className="text-primary font-semibold">{Math.round(feedback.totalScore / 10)}/10</span>
          </div>
        </div>

        {/* Quick Summary */}
        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{feedback.finalAssessment}</p>

        {/* Tech Stack Icons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {techstack.slice(0, 3).map((tech) => (
            <Image
              key={tech}
              src={getTechLogos(tech)} // Assuming this returns a valid URL
              alt={tech}
              width={24}
              height={24}
              className="h-6 w-6 rounded"
            />
          ))}
          {techstack.length > 3 && (
            <span className="text-xs text-muted-foreground">+{techstack.length - 3} more</span>
          )}
        </div>

        {/* Date and CTA */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          <span className="text-xs font-medium text-primary group-hover:underline">View Details →</span>
        </div>
      </div>
    </Link>
  );
};

export default FeedbackCard;