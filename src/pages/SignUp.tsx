import { SignUp as ClerkSignUp } from '@clerk/clerk-react';

export default function SignUp() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create an Account
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Get started with CodiesVibe
          </p>
        </div>
        <ClerkSignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          redirectUrl="/"
        />
      </div>
    </div>
  );
}
