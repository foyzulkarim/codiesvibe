import { AdminHeader } from './AdminHeader';
import { MainHeader } from './MainHeader';

interface LayoutProps {
  children: React.ReactNode;
  /**
   * Header type to render:
   * - 'main': Full header with logo, GitHub link, and full auth controls
   * - 'admin': Simplified header with back link and logout
   * - 'none': No header
   */
  header?: 'main' | 'admin' | 'none';
  /**
   * For admin header: where the back link navigates to
   */
  adminBackTo?: string;
  /**
   * For admin header: label for the back link
   */
  adminBackLabel?: string;
  /**
   * For admin header: additional content to render (e.g., user role badge)
   */
  adminHeaderChildren?: React.ReactNode;
}

export function Layout({
  children,
  header = 'main',
  adminBackTo,
  adminBackLabel,
  adminHeaderChildren,
}: LayoutProps) {
  if (header === 'main') {
    return (
      <div className="min-h-screen bg-background">
        <MainHeader />
        {children}
      </div>
    );
  }

  if (header === 'admin') {
    return (
      <div className="container mx-auto py-8">
        <AdminHeader backTo={adminBackTo} backLabel={adminBackLabel}>
          {adminHeaderChildren}
        </AdminHeader>
        {children}
      </div>
    );
  }

  // header === 'none'
  return <>{children}</>;
}
