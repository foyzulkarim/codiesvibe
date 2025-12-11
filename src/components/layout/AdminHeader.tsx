import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthButtons } from './AuthButtons';

interface AdminHeaderProps {
  backTo?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export function AdminHeader({
  backTo = '/',
  backLabel = 'Back',
  children
}: AdminHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <Link
        to={backTo}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {backLabel}
      </Link>
      <div className="flex items-center gap-4">
        {children}
        <AuthButtons variant="minimal" />
      </div>
    </div>
  );
}
