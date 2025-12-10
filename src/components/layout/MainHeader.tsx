import { Github } from 'lucide-react';
import { Logo } from './Logo';
import { AuthButtons } from './AuthButtons';

export function MainHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/foyzulkarim/codiesvibe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              title="View on GitHub - This project is open source"
            >
              <Github className="h-6 w-6" />
            </a>
            <AuthButtons variant="full" />
          </div>
        </div>
      </div>
    </header>
  );
}
