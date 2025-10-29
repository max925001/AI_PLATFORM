import Link from "next/link";
import Image from "next/image";
import { Twitter, Linkedin, Github } from "lucide-react"; // Assuming Lucide icons; install if needed: npm i lucide-react

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Logo/Brand */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <Image
                src="/robot.png" // Reuse hero icon for brand
                alt="AI Interview Platform"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-lg font-semibold">AI Interview Platform</span>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-left max-w-md">
              Empowering your career with AI-driven mock interviews and personalized feedback.
            </p>
          </div>

          {/* Navigation Links - Responsive: Stack on mobile, row on desktop */}
          <nav className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 text-sm">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <Link href="/about" className="hover:text-primary transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </nav>

          {/* Social Icons - Centered on mobile, right-aligned on desktop */}
          <div className="flex items-center gap-4">
            <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            <Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            <Link href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>

        {/* Copyright - Full-width bottom line */}
        <div className="border-t border-border mt-8 pt-6 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AI Interview Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;