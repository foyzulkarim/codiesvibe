import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface LogoProps {
  linkTo?: string;
}

export function Logo({ linkTo = '/' }: LogoProps) {
  const content = (
    <div className="flex items-center space-x-2">
      <Sparkles className="h-8 w-8 text-primary" />
      <span className="text-2xl font-bold">CodiesVibe</span>
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
